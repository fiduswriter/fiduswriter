"""
Rust-backed ProseMirror implementation using the prosemirror-rs package (≥ 0.3).

Exposes the same high-level API as prosemirror.py so that consumers.py and
document_store.py can switch backends via the PROSEMIRROR_BACKEND setting
without structural changes.

Key differences from the Python backend
----------------------------------------
* Steps are serialised to JSON once and processed entirely in Rust.
* The document lives in Rust memory; Python never builds a full object tree.
* ``to_content`` returns a *str* (compact JSON) instead of a dict, so the
  string can be written directly to the database without a json.loads round-trip.

Changes in prosemirror-rs 0.3
------------------------------
* ``apply_steps_json`` / ``apply_steps`` are now **fully atomic in Rust**:
  if any step fails the document and version counter are rolled back entirely
  inside Rust — no Python-side snapshot is needed.
* Both methods return a plain ``bool`` instead of a list of per-step bools.
* The parsed schema is **cached inside Rust**, keyed by the schema JSON string.
  All ``Editor`` objects that share the same schema pay the parse cost once.
* ``reset(doc_json)`` restores the document to a new state while reusing the
  already-cached schema, making snapshot-restore cheaper than constructing a
  new ``Editor``.
"""

import json
import os

from django.conf import settings
from prosemirror_rs import Editor as _RustEditor

_schema_json_path = os.path.join(
    settings.PROJECT_PATH, "static-libs/json/schema.json"
)
_schema_json: str | None = None


def _get_schema_json() -> str:
    global _schema_json
    if _schema_json is None:
        with open(_schema_json_path) as fh:
            _schema_json = fh.read()
    return _schema_json


class Editor:
    """Thin wrapper around :class:`prosemirror_rs.Editor` (v0.3+).

    The wrapper's only job is to accept a list of step *dicts* (as they arrive
    from the WebSocket message) and serialise them to the JSON string that Rust
    expects.  All atomicity, rollback, and schema caching are handled by Rust.
    """

    __slots__ = ("_inner",)

    def __init__(self, schema_json: str, doc_json: str) -> None:
        self._inner = _RustEditor(schema_json, doc_json)
        self._schema_json = schema_json

    def apply_steps(self, steps: list) -> bool:
        """Apply *steps* (list of step dicts) atomically.

        Serialises the list to a JSON array string and delegates to Rust.
        Returns ``True`` if every step applied; ``False`` if any step failed,
        in which case the document and version counter are rolled back entirely
        by Rust — no Python-side snapshot is required.
        """
        result = self._inner.apply_steps_json(json.dumps(steps))
        if result:
            return result
        print("FAILED APPLICATION")
        print(json.dumps(steps))
        print(self._inner.doc_json())
        print(self._schema_json)

        return False
        # try:
        #     return
        # except ValueError:
        #     return False

    def doc_json(self, skip_defaults: bool = False) -> str:
        """Return the current document as a compact JSON string."""
        return self._inner.doc_json(skip_defaults)

    def reset(self, doc_json: str) -> None:
        """Reset to a new document state, reusing the already-cached schema.

        More efficient than constructing a new :class:`Editor` when restoring
        a snapshot (e.g. after an unrecoverable conflict), because the schema
        is never re-parsed.
        """
        self._inner.reset(doc_json)


# ---------------------------------------------------------------------------
# Public API (matches prosemirror.py)
# ---------------------------------------------------------------------------


def from_json(content) -> Editor:
    """Create an :class:`Editor` from document content.

    *content* may be either a ``dict`` (as stored in Django's JSONField) or
    an already-serialised JSON ``str``.
    """
    schema_json = _get_schema_json()
    doc_json = content if isinstance(content, str) else json.dumps(content)
    return Editor(schema_json, doc_json)


def apply(steps: list, editor: Editor):
    """Apply *steps* to *editor*.

    Returns *editor* on success (editor is mutated in place) or ``False`` on
    failure (editor state rolled back to before this call).

    This matches the Python backend's ``apply`` signature so callers need not
    know which backend is active.
    """
    return editor if editor.apply_steps(steps) else False


def to_content(editor: Editor) -> str:
    """Serialise the document to a compact JSON string.

    The returned string can be written directly to the database column without
    any Python-level JSON parsing.
    """
    return editor.doc_json(True)
