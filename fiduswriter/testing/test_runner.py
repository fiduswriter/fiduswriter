from django.test.runner import DiscoverRunner


class FidusTestRunner(DiscoverRunner):
    """Test runner that forces DEBUG=True so static files are served unhashed."""

    def __init__(self, **kwargs):
        kwargs["debug_mode"] = True
        super().__init__(**kwargs)
