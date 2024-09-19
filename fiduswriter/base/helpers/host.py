from urllib.parse import urlparse


def get_host(origin, ws_server):
    # Parse the origin URL (hostname and port)
    parsed_origin = urlparse(origin)
    origin_name = parsed_origin.hostname
    origin_port = parsed_origin.port or (
        443 if parsed_origin.scheme == "https" else 80
    )

    # Determine the expected values based on ws_server
    if ws_server is False:
        # ws_server is False: expect origin's host and port
        return f"{origin_name}:{origin_port}"

    elif isinstance(ws_server, int):
        # ws_server is a port: expect origin's host and ws_server's port
        return f"{origin_name}:{ws_server}"

    elif isinstance(ws_server, str):
        # ws_server is a string: parse it to check for a hostname and optional port
        if ":" in ws_server:
            ws_host, ws_port = ws_server.split(":")
            ws_port = int(ws_port)
        else:
            ws_host = ws_server
            ws_port = (
                443 if parsed_origin.scheme == "https" else 80
            )  # default ports

        return f"{ws_host}:{ws_port}"

    # If none of the conditions match, return origin's host and port
    return f"{origin_name}:{origin_port}"
