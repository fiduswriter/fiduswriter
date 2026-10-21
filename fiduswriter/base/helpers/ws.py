import secrets
from urllib.parse import urlparse

from django.conf import settings

_process_broadcast_secret = None


def get_broadcast_secret():
    """Shared secret used to authenticate server-to-server
    system message relays. Random per-process when not configured,
    so relaying is restricted to the same process unless
    WS_BROADCAST_SHARED_SECRET is set identically on all instances."""
    global _process_broadcast_secret
    configured = getattr(settings, "WS_BROADCAST_SHARED_SECRET", "") or ""
    if configured:
        return configured
    if _process_broadcast_secret is None:
        _process_broadcast_secret = secrets.token_urlsafe(32)
    return _process_broadcast_secret


def get_configured_internal_ports():
    ports = set()
    for setting_name in ("LOCAL_PORTS", "PORTS"):
        for conn in getattr(settings, setting_name, []) or []:
            if isinstance(conn, dict):
                conn = conn.get("internal", conn.get("external"))
            try:
                ports.add(int(conn))
            except (TypeError, ValueError):
                pass
    return ports


def get_broadcast_allowed_hosts():
    """Hostnames the server will accept as relay targets in
    Presence.server_url. Only server-derived hosts, never
    client-supplied ones."""
    hosts = {"127.0.0.1", "localhost", "::1"}
    template = getattr(settings, "INTERNAL_WS_BROADCAST_URL", None)
    if template:
        try:
            filled = template.replace("{port}", "0")
        except Exception:
            filled = template
        parsed = urlparse(filled)
        if parsed.hostname:
            hosts.add(parsed.hostname.lower())
    return hosts


def broadcast_url_is_safe(server_url):
    """Validate a stored Presence.server_url immediately before connecting
    to it."""
    try:
        parsed = urlparse(server_url)
    except ValueError:
        return False
    if parsed.scheme not in ("ws", "wss") or not parsed.hostname:
        return False
    if parsed.hostname not in get_broadcast_allowed_hosts():
        return False
    if parsed.hostname not in ("127.0.0.1", "localhost", "::1"):
        # Non-loopback broadcast targets must point at one of the
        # configured server ports.
        allowed_ports = get_configured_internal_ports()
        try:
            port = parsed.port
        except ValueError:
            return False
        if port is not None and allowed_ports and port not in allowed_ports:
            return False
    return True


def get_url_base(origin, conn):

    # Determine the expected values based on conn

    if isinstance(conn, int) and conn > 0:
        # conn is a port: expect origin's host and conn's port
        # Parse the origin URL (hostname and port)
        parsed_origin = urlparse(origin)
        origin_name = parsed_origin.hostname
        return f"{origin_name}:{conn}/ws"

    elif isinstance(conn, dict) and "external" in conn:
        # conn is a dict of type:
        # {"internal": 8000, "external": 9000}
        # or
        # {"internal": 8000, "external": "ws1.fiduswriter.com"}
        if isinstance(conn["external"], str):
            return f"{conn["external"]}/ws"
        elif isinstance(conn["external"], int):
            parsed_origin = urlparse(origin)
            origin_name = parsed_origin.hostname
            return f"{origin_name}:{conn['external']}/ws"

    return "/ws"
