from django.conf.urls import url

from . import views

urlpatterns = [
    url(
        '^save_document_style/$',
        views.save_document_style,
        name='save_document_style'
    ),
]
