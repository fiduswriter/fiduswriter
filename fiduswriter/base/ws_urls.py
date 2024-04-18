from django.urls import re_path

from . import consumers

urlpatterns = [
    re_path(
        "^$", consumers.WebsocketConsumer.as_asgi(), name="message_consumer"
    ),
]
