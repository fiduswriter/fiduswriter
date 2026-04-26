# End-to-End Encryption (E2EE) in Fidus Writer

This document explains the E2EE implementation for future developers and administrators. It covers the architecture, key files, data flows, and how to work with the system.

## Overview

Fidus Writer supports optional end-to-end encryption for documents. When enabled, document content (text, comments, bibliography, images) is encrypted with AES-GCM-256 before leaving the client. The server stores and relays opaque encrypted blobs but cannot read them.

E2EE is controlled by the `E2EE_MODE` setting:

| Mode | New unencrypted docs | New E2EE docs | Existing docs |
|------|---------------------|---------------|---------------|
| `disabled` | ✅ Allowed | ❌ Not allowed | ✅ Accessible |
| `enabled` | ✅ Allowed | ✅ Allowed | ✅ Accessible |
| `required` | ❌ Not allowed | ✅ Allowed | ✅ Read-only |

## Two Encryption Systems

### 1. Per-Document Password (Classic E2EE)

The user chooses a password for each document. The password is never sent to the server.

- **Key derivation**: PBKDF2-SHA256, 600,000 iterations, random 16-byte salt
- **Encryption**: AES-GCM-256
- **Sharing**: The owner shares the password out-of-band (verbally, messaging, etc.)
- **Share links**: The password can be embedded in the URL fragment (`#?password=...`) — never sent to the server

### 2. Personal Passphrase (Mode A Hybrid)

An optional personal passphrase unlocks all encrypted documents with a single entry. Uses a master key + ECDH P-256 key pair.

- **Setup**: User creates a passphrase → client generates master key (MK) + key pair → encrypts MK/SK with passphrase-derived key (KWK) → stores on server
- **Document creation**: Auto-generates a 44-char base64 document password (which IS the raw AES-256 DEK)
- **Unlocking**: Enter passphrase → derive KWK → decrypt MK/SK → store in sessionStorage
- **Sharing with passphrase users**: Encrypts the document password with recipient's public key via ECDH
- **Sharing with non-passphrase users**: Shows the auto-generated password to the owner in a dialog

### Unified Password Resolution

The two systems are unified by `E2EEKeyManager.resolvePasswordToKey()`:

- If the password is 43/44 chars of base64/base64url that decodes to exactly 32 bytes → imports directly as AES-256 key (no PBKDF2)
- Otherwise → derives key via PBKDF2-SHA256 with the document's salt

Recipients never know whether the password is a raw DEK or a human password.

## Key Files

### Server-Side (Python)

| File | Role |
|------|------|
| `document/models.py` | `Document.e2ee`, `e2ee_salt`, `e2ee_iterations` fields; `DocumentEncryptionKey` model |
| `user/models.py` | `UserEncryptionKey` model (public/private keys, master key, recovery backup) |
| `document/views.py` | `create_doc` (accepts E2EE params), `save_access_rights` (filters rights for E2EE), `get_doc_data` (returns salt/iterations), encryption key endpoints |
| `document/consumers.py` | `handle_diff` (relays encrypted diffs), `handle_e2ee_snapshot` (stores encrypted snapshots), `request_snapshot` |
| `configuration-default.py` | `E2EE_MODE` setting |

### Client-Side (JavaScript)

| File | Role |
|------|------|
| `document/static/js/modules/editor/e2ee/key-manager.js` | `E2EEKeyManager.deriveKey()`, `resolvePasswordToKey()`, session storage for per-doc keys |
| `document/static/js/modules/editor/e2ee/encryptor.js` | `E2EEEncryptor.encrypt()` / `decrypt()` — AES-GCM for strings, objects, buffers, images |
| `document/static/js/modules/editor/e2ee/snapshot-manager.js` | `E2EESnapshotManager.handleRequestSnapshot()` — encrypts full doc state and sends `e2ee_snapshot` |
| `document/static/js/modules/editor/e2ee/password-dialog.js` | Password entry, creation, change dialogs for per-document passwords |
| `document/static/js/modules/editor/e2ee/passphrase-crypto.js` | Web Crypto primitives: ECDH P-256 key generation, KWK derivation, string encryption with public key |
| `document/static/js/modules/editor/e2ee/passphrase-manager.js` | High-level API: `setupEncryption()`, `unlockWithPassphrase()`, `changePassphrase()`, `recoverWithRecoveryKey()`, `getDocumentPassword()`, `saveDocumentPassword()` |
| `document/static/js/modules/editor/e2ee/passphrase-dialog.js` | Passphrase unlock, setup, recovery key display, recovery, and change dialogs |
| `document/static/js/modules/editor/collab/doc.js` | `_loadE2EEDocument()` — tries passphrase → sessionStorage → URL fragment → prompt; `_sendE2EEDiff()` / `_receiveE2EEDiff()` |
| `document/static/js/modules/editor/menus/headerbar/model.js` | `onShareSuccess` callback — encrypts document password with recipient's public key for passphrase users |
| `document/static/js/modules/documents/access_rights/index.js` | Access rights dialog with E2EE filtering and share link creation |
| `user/static/js/modules/profile/index.js` | Profile page E2EE section: setup, change passphrase, recover |

## Data Flows

### Creating an E2EE Document (with Passphrase)

```
User clicks "New encrypted document"
  → Editor._createE2EEDocument()
    → Checks if user has passphrase keys
    → If yes + unlocked: generates 44-char base64 document password (raw DEK)
    → resolvePasswordToKey(password, salt) → AES-256 key (direct import)
    → POST /api/document/create_doc/ (with e2ee=true, salt, iterations)
    → PassphraseManager.saveDocumentPassword() → encrypts password with MK
    → Stores key in editor.e2ee.key and sessionStorage
    → Sends e2ee_snapshot via WebSocket
```

### Opening an E2EE Document (Passphrase User)

```
User opens document
  → _loadE2EEDocument()
    → Try passphrase path:
      → PassphraseManager.getDocumentPassword(docId)
        → Fetches DocumentEncryptionKey from server
        → If encrypted_with_master_key: decrypts with MK
        → If encrypted_with_public_key: decrypts with SK, then upgrades to MK encryption
      → resolvePasswordToKey(password, salt) → key
      → _decryptAndLoadDoc() → decrypts content/comments/bibliography
    → If no passphrase key: tries sessionStorage → URL fragment → prompts for password
    → After successful decryption: if passphrase keys in session and no DocumentEncryptionKey exists,
      saves password encrypted with MK (migration from per-document password)
```

### Real-Time Collaboration

```
Client A types
  → _sendE2EEDiff() → encrypts diff payload with document key → sends {type:"diff", ep:"..."}
  → Server handle_diff() → stores opaque diff, relays to other clients
  → Client B _receiveE2EEDiff() → decrypts ep with document key → applies steps

Every N diffs:
  → Server request_snapshot() → asks a write-capable client
  → Client E2EESnapshotManager.handleRequestSnapshot() → encrypts full state → sends e2ee_snapshot
  → Server stores encrypted snapshot, clears diffs
```

### Sharing a Document

```
Owner opens share dialog → adds recipients → submits
  → onShareSuccess(newAccessRights)
    → For each recipient with passphrase keys:
      → Fetches recipient's public key
      → PassphraseManager.encryptStringWithPublicKey(documentPassword, recipientPublicKey)
      → PassphraseManager.saveDocumentPassword(docId, password, recipientId, "user", false)
    → For each recipient without passphrase keys:
      → Adds to noPassphraseUsers list
    → If noPassphraseUsers.length > 0:
      → Shows "Share Document Password" dialog with auto-generated password
```

## Session Storage

Keys are stored in `sessionStorage` (cleared on browser close):

- `e2ee_key_${docId}` — per-document AES key (for non-passphrase docs)
- `e2ee_password_${docId}` — per-document password string
- `e2ee_master_key` — master key (for passphrase users)
- `e2ee_private_key` — private key JWK (for passphrase users)

## API Endpoints

### User Encryption Keys

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/user/encryption_key/save/` | Create/update user's encryption keys |
| `GET` | `/api/user/encryption_key/` | Get current user's encrypted keys |
| `GET` | `/api/user/encryption_public_key/{user_id}/` | Get another user's public key |

### Document Encryption Keys

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/document/encryption_key/save/` | Create/update DocumentEncryptionKey |
| `POST` | `/api/document/encryption_key/get/` | Get DocumentEncryptionKey for current user + document |
| `POST` | `/api/document/encryption_key/update/` | Update existing key (key upgrade) |
| `GET` | `/api/document/encryption_key/get_all/` | Bulk fetch all user's document encryption keys |

### Preferences

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET/POST` | `/api/user/preferences/` | Get/update user preferences (e.g., `has_dismissed_passphrase_offer`) |

## Working with E2EE Code

### Adding a New Feature That Touches Encrypted Content

1. **Check if the feature needs server-side content processing**. If yes, it cannot work with E2EE documents unless the processing is moved client-side.
2. **For client-side features**: Encrypt data before sending via WebSocket. Use `E2EEEncryptor.encryptObject()` for JSON data.
3. **For diffs**: Add your data to the encrypted payload (`ep` field) in `_sendE2EEDiff()`, not as plaintext fields.

### Testing E2EE Changes

```bash
# Run all E2EE tests
python fiduswriter/manage.py test document.tests.test_e2ee --noinput

# Run a specific test class
python fiduswriter/manage.py test document.tests.test_e2ee.E2EEPersonalPassphraseTest --noinput

# Force transpile before testing
python fiduswriter/manage.py transpile --force
```

Always use `--noinput` to skip the test database confirmation prompt.

### Common Issues

**Browser loads old JS bundle**: Run `python fiduswriter/manage.py transpile --force`

**"Incorrect passphrase" when it should be correct**: Check that the salt bytes are correctly Base64-decoded. The server stores raw bytes; the client receives Base64 and must decode to `Uint8Array`.

**Decryption fails after password change**: Old diffs in `doc.diffs` are encrypted with the old key. The server should clear diffs when receiving an `e2ee_snapshot` with a new salt.

## Security Notes

- The server never sees passwords, keys, or plaintext content.
- Salt and iteration count are stored on the server but are not secrets — they prevent rainbow table attacks, not add secrecy.
- URL fragments (`#?password=...`) are never sent to the server.
- `sessionStorage` is scoped to the origin and tab. Keys survive page reloads but are cleared when the browser closes.
- The recovery key is the only way to recover access if the passphrase is forgotten. It is shown once during setup and should be stored securely.
- Changing the passphrase does not change the master key or key pair — only the KWK (key-wrapping key) is updated. All existing DocumentEncryptionKeys remain valid.
