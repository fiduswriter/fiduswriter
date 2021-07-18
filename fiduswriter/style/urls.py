from django.conf.urls import url

from . import views

urlpatterns = [
    url(
        "^delete_document_style/$",
        views.delete_document_style,
        name="delete_document_style",
    ),
    url(
        "^save_document_style/$",
        views.save_document_style,
        name="save_document_style",
    ),
    url(
        "^delete_export_template/$",
        views.delete_export_template,
        name="delete_export_template",
    ),
    url(
        "^save_export_template/$",
        views.save_export_template,
        name="save_export_template",
    ),
]
