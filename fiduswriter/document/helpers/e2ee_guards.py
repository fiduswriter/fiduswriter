"""Central server-side E2EE invariants.

E2EE_MODE == "required" must make legacy (non-E2EE) documents
read-only for all mutation paths, not just for document creation.

PBKDF2 parameters supplied by clients are validated server-side
against floors (iterations, salt length) instead of being trusted.

Encrypted diffs of E2EE documents must carry an envelope
(a string ``ep`` field) and the current salt.
"""

import base64

from django.conf import settings

# Server-side floors for client-supplied E2EE parameters.
E2EE_MIN_ITERATIONS = 100_000
E2EE_MIN_SALT_BYTES = 16


def e2ee_write_guard(document, mode=None):
    """Return False when *document* must not be mutated.

    In "required" mode, documents that are not E2EE are read-only
    (mirrored to the documented behaviour matrix in docs/e2ee.md).
    """
    if mode is None:
        mode = getattr(settings, "E2EE_MODE", "disabled")
    if mode == "required" and not document.e2ee:
        return False
    return True


async def ae2ee_write_guard(document, mode=None):
    """Async wrapper for use in websocket consumers."""
    return e2ee_write_guard(document, mode)


def e2ee_mode_all_new_documents(e2ee, mode=None):
    """Return True when a *new* document with the given e2ee flag may be
    created under the current mode."""
    if mode is None:
        mode = getattr(settings, "E2EE_MODE", "disabled")
    if e2ee and mode == "disabled":
        return False
    if not e2ee and mode == "required":
        return False
    return True


def validate_e2ee_params(salt_b64, iterations):
    """Validate client supplied salt/iterations.

    Returns (salt_bytes, iterations). Raises ValueError on invalid,
    missing or below-floor values.
    """
    try:
        iterations = int(iterations)
    except (TypeError, ValueError):
        raise ValueError("Invalid e2ee_iterations")
    if iterations < E2EE_MIN_ITERATIONS:
        raise ValueError(f"e2ee_iterations must be >= {E2EE_MIN_ITERATIONS}")
    if salt_b64 is None:
        raise ValueError("e2ee_salt is required")
    if isinstance(salt_b64, str):
        try:
            salt = base64.b64decode(salt_b64, validate=True)
        except Exception:
            raise ValueError("Invalid e2ee_salt")
    else:
        salt = bytes(salt_b64)
    if len(salt) < E2EE_MIN_SALT_BYTES:
        raise ValueError(
            f"e2ee_salt must decode to at least {E2EE_MIN_SALT_BYTES} bytes"
        )
    return salt, iterations
