from django.conf.urls import url

from . import views

urlpatterns = [
    url(
        '^delete_document_style/$',
        views.delete_document_style,
        name='delete_document_style'
    ),
    url(
        '^save_document_style/$',
        views.save_document_style,
        name='save_document_style'
    ),
]
