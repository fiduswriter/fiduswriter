from django.conf.urls import url

from . import views

urlpatterns = [
    url("^save/$", views.save, name="bibliography_save"),
    url("^delete/$", views.delete, name="bibliography_delete"),
    url(
        "^save_category/$",
        views.save_category,
        name="bibliopgraphy_save_category",
    ),
    url(
        "^delete_category/$",
        views.delete_category,
        name="bibliography_delete_category",
    ),
    url("^biblist/$", views.biblist, name="bibliography_biblist"),
]
