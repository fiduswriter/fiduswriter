def split_url(url, https):
    if ":" in url:
        name, rest = url.split(":")
        port, path = rest.split("/", 1)
    else:
        name, path = url.split("/", 1)
        port = "443" if https else "80"  # default port for HTTP
    if name == "localhost":
        name = "127.0.0.1"
    return name, port, path


def compare_url_base_with_expectation(base, expected, https):
    # Parse the actual host (hostname and port)
    base_url_parts = split_url(base, https)
    expected_url_parts = split_url(expected, https)

    return (
        base_url_parts[0] == expected_url_parts[0]
        and base_url_parts[1] == expected_url_parts[1]
        and base_url_parts[2] == expected_url_parts[2]
    )
