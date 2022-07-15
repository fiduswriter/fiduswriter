from django.urls import re_path

from . import views

urlpatterns = [
    re_path("^flatpage/$", views.flatpage, name="flatpage"),
    re_path("^configuration/$", views.configuration, name="configuration"),
]
