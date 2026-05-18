from django.utils.datastructures import MultiValueDict


class JsonFormMixin:
    """Mixin that populates form data from request.JSON instead of request.POST."""

    def get_form_kwargs(self):
        kwargs = super().get_form_kwargs()
        if self.request.method == "POST" and self.request.JSON:
            data = MultiValueDict()
            for key, value in self.request.JSON.items():
                if isinstance(value, bool):
                    data[key] = "true" if value else "false"
                elif value is not None:
                    data[key] = str(value)
            kwargs["data"] = data
        return kwargs
