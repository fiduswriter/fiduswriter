import json
from django.conf import settings


class JsonToPostMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Always initialise request.JSON so that views can rely on it
        # existing regardless of content-type.  It will be overwritten below
        # with the parsed body when the request actually carries JSON.
        request.JSON = {}
        content_type = request.META.get("CONTENT_TYPE", "")

        # Only intercept JSON payloads for write methods
        if request.method in ("POST", "PUT", "PATCH", "DELETE"):
            if "application/json" in content_type:
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
                except json.JSONDecodeError:
                    pass  # Let downstream handle invalid JSON gracefully
            elif (
                request.method == "POST"
                and "multipart/form-data" in content_type
            ):
                # Hybrid requests: JSON payload embedded in multipart form
                # data (used when files need to be uploaded alongside JSON).
                json_data = request.POST.get("json", None)
                if json_data:
                    try:
                        data = json.loads(json_data)
                        request.JSON = data
                        if isinstance(data, dict):
                            csrftoken = data.get("csrfmiddlewaretoken", None)
                            if csrftoken:
                                request.META[settings.CSRF_HEADER_NAME] = (
                                    csrftoken
                                )
                    except json.JSONDecodeError:
                        pass  # Let downstream handle invalid JSON gracefully

        return self.get_response(request)
