# Rust components and install profiles

Fidus Writer uses Rust in a few places. This page explains which components
are Rust, how to install Fidus Writer without them (for instance on PyPy),
and what each component does for performance.

## The components

| Component | What it does | Fallback |
|-----------|--------------|----------|
| [Granian](https://github.com/emmett-framework/granian) | The web server. It is a Rust ASGI/WSGI server; Fidus Writer's Django application and the collaboration WebSocket run inside it. | None. Granian ships PyPy wheels, so it works on PyPy as well. |
| [`prosemirror-rs`](https://pypi.org/project/prosemirror-rs/) | The ProseMirror step engine of the collaborative editor. The document tree lives in Rust memory; steps are applied and the document is serialised in Rust, so Python never builds a full object tree. | The pure-Python [`prosemirror`](https://pypi.org/project/prosemirror/) package (a port of ProseMirror). |
| [`orjson`](https://pypi.org/project/orjson/) | JSON encoding and decoding, including every WebSocket frame. | The standard library `json` module. |

Fidus Writer logs which of the two optional components it uses at startup:

```
Fidus Writer components: ProseMirror engine rust, JSON backend orjson
```

## Choosing the ProseMirror engine

The engine is selected with the `PROSEMIRROR_BACKEND` setting:

```python
# "auto"   - use the Rust engine when prosemirror-rs is installed, the
#            pure-Python engine otherwise (default).
# "rust"   - always use the Rust engine; falls back to the pure-Python
#            engine with a warning if prosemirror-rs is not installed.
# "python" - always use the pure-Python engine.
PROSEMIRROR_BACKEND = "auto"
```

The `PROSEMIRROR_BACKEND` environment variable overrides the setting, which
is handy for a one-off run:

```bash
PROSEMIRROR_BACKEND=python python manage.py test document.tests.test_collaboration
```

> The pure-Python engine is deprecated and will be removed in Fidus Writer
> 6.0. It remains available as an escape hatch in 5.0 and 5.1.

Both engines produce the same document content; the difference is in the
serialization of the document attributes (the Python engine writes all
document level attributes, the Rust engine omits the ones that have their
default value). The content tree itself is identical, which is what
`document/tests/test_fuzz_steps.py` asserts.

## Installing without the Rust extensions (PyPy)

`prosemirror-rs` and `orjson` are Rust extensions without PyPy wheels. They
are therefore installed with an environment marker:

```
prosemirror-rs==0.5.2; platform_python_implementation != "PyPy"
orjson==3.13.0; platform_python_implementation != "PyPy"
```

On CPython both are installed and used. On PyPy the installation succeeds
without them and Fidus Writer falls back to the pure-Python ProseMirror engine
and the standard library JSON implementation. Nothing has to be configured;
the automatic mode of `PROSEMIRROR_BACKEND` takes care of it.

The rest of the stack works on PyPy as well: Granian and Pillow both publish
PyPy wheels. Note that the Pillow wheels use a different ABI tag than the
other packages, so a PyPy installation may have to build Pillow from source.

## Serving static files from the Rust web server

In production, the static files are served by Granian directly from
`STATIC_ROOT`, so that static requests never reach the Django application:

```python
# In production (DEBUG off) the ASGI server serves /static from STATIC_ROOT.
# Set it explicitly to override the automatic behaviour.
# SERVE_STATIC_FROM_GRANIAN = not DEBUG
```

The Django middleware only handles the static files when the ASGI server does
not (in development):

```python
SERVESTATIC_USE_FINDERS = DEBUG
SERVESTATIC_AUTOREFRESH = DEBUG
```

Remember to run `python manage.py collectstatic` after an upgrade.

## Access rights and the collaboration hot path

The document WebSocket re-reads the access rights of a participant from the
database before every mutating frame, so that a revocation takes effect
immediately. This is one database query per keystroke batch, and it is also
what makes a revocation effective across servers (the notification channel is
local to one process).

Sites that can tolerate a small delay in revocation enforcement can reduce the
number of queries:

```python
# Re-read the access rights at most every N seconds. 0 (the default) means
# the rights are re-read before every mutating frame.
AUTHORIZATION_REFRESH_INTERVAL = 0
```

## Related documentation

- [Performance Optimization](performance.md)
- [Advanced Configuration](advanced.md)
- [Load Balancer Configuration](load-balancer.md)
