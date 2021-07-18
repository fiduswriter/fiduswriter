from django.conf.urls import url

from . import views

urlpatterns = [
    url("^save/$", views.save, name="usermedia_save"),
    url("^delete/$", views.delete, name="usermedia_delete"),
    url("^images/$", views.images, name="usermedia_images"),
    url(
        "^save_category/$", views.save_category, name="usermedia_save_category"
    ),
]
