def compare_host_with_expected(host, expected, origin):
    https = origin.startswith("https")
    # Parse the actual host (hostname and port)
    if ":" in host:
        host_name, host_port = host.split(":")
        host_port = int(host_port)
    else:
        host_name = host
        host_port = 443 if https else 80  # default port for HTTP

    if ":" in expected:
        expected_name, expected_port = expected.split(":")
        expected_port = int(expected_port)
    else:
        expected_name = expected
        expected_port = 443 if https else 80  # default port for HTTP

    if expected_name == "localhost":
        expected_name = "127.0.0.1"

    # Compare the actual host and port with the expected ones
    return host_name == expected_name and host_port == expected_port
