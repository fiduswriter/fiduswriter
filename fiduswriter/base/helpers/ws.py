from urllib.parse import urlparse


def get_url_base(origin, ws_server):

    # Determine the expected values based on ws_server

    if isinstance(ws_server, int) and ws_server > 0:
        # ws_server is a port: expect origin's host and ws_server's port
        # Parse the origin URL (hostname and port)
        parsed_origin = urlparse(origin)
        origin_name = parsed_origin.hostname
        return f"{origin_name}:{ws_server}/ws"

    elif isinstance(ws_server, str):
        # ws_server is a string:
        # Check if prefix in URL
        if "/" in ws_server:
            return ws_server
        else:
            return f"{ws_server}/ws"

    return "/ws"
