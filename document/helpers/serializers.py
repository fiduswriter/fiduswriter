from django.core import serializers
from django.db import models

PythonSerializer = serializers.get_serializer("python")


class PythonWithURLSerializer(PythonSerializer):
    def handle_field(self, obj, field):
        value = field.value_from_object(obj)
        if isinstance(field, models.FileField) and hasattr(value, 'url'):
            self._current[field.name] = value.url
        else:
            return super(PythonWithURLSerializer, self).handle_field(
                obj,
                field
            )
