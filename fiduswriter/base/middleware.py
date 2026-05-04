import json
from django.conf import settings
from django.http import QueryDict


class JsonToPostMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        content_type = request.META.get("CONTENT_TYPE", "")

        # Only intercept JSON payloads for write methods
        if (
            request.method in ("POST", "PUT", "PATCH", "DELETE")
            and "application/json" in content_type
        ):
            try:
                if request.body:
                    data = json.loads(request.body)
                else:
                    data = {}
                request.JSON = data
                if isinstance(data, dict):
                    csrftoken = data.get("csrfmiddlewaretoken", None)
                    if csrftoken:
                        request.META[settings.CSRF_HEADER_NAME] = csrftoken
                    # Populate request.POST so that regular Django views
                    # and forms work transparently with JSON payloads.
                    query_dict = QueryDict(mutable=True)
                    for key, value in data.items():
                        if isinstance(value, (list, dict)):
                            query_dict[key] = json.dumps(value)
                        elif isinstance(value, bool):
                            query_dict[key] = "true" if value else "false"
                        elif value is None:
                            query_dict[key] = ""
                        else:
                            query_dict[key] = str(value)
                    query_dict._mutable = False
                    request.POST = query_dict
            except json.JSONDecodeError:
                pass  # Let downstream handle invalid JSON gracefully

        return self.get_response(request)
