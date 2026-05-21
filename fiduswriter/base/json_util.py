"""JSON compatibility wrapper that prefers orjson when available.

Provides a ``json`` object with the standard library's ``json`` module API
(``dumps``, ``loads``, ``dump``, ``load``, ``JSONDecodeError``), backed by
orjson when installed for a significant speed boost, with a graceful fallback
to the stdlib ``json`` module when orjson is not available.

Usage
-----
Replace ``import json`` with::

    from base.json_util import json

No other code changes are needed.
"""

import json as _stdlib_json
from typing import Any, TextIO

try:
    import orjson as _orjson

    _HAS_ORJSON = True
except ImportError:
    _HAS_ORJSON = False


class _JsonProxy:
    """Drop-in replacement for the stdlib ``json`` module.

    Delegates to ``orjson`` when available; falls back to the stdlib otherwise.
    No kwargs beyond the value/stream are accepted because no call site in this
    project uses them — keeping it maximally simple.
    """

    def dumps(self, obj: Any) -> str:
        """Serialize *obj* to a JSON ``str``."""
        if _HAS_ORJSON:
            return _orjson.dumps(obj).decode("utf-8")
        return _stdlib_json.dumps(obj)

    def loads(self, s: str | bytes | bytearray) -> Any:
        """Deserialize *s* (str or bytes) to a Python object."""
        if _HAS_ORJSON:
            return _orjson.loads(s)
        return _stdlib_json.loads(s)

    def dump(self, obj: Any, fp: TextIO) -> None:
        """Serialize *obj* and write it to a text stream."""
        fp.write(self.dumps(obj))

    def load(self, fp: TextIO) -> Any:
        """Deserialize a text stream to a Python object."""
        return self.loads(fp.read())


json = _JsonProxy()

if _HAS_ORJSON:
    JSONDecodeError = _orjson.JSONDecodeError
else:
    JSONDecodeError = _stdlib_json.JSONDecodeError

json.JSONDecodeError = JSONDecodeError

__all__ = ["json", "JSONDecodeError"]
