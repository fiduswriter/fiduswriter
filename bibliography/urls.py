from django.conf.urls import url

from . import views

urlpatterns = [
    url('^$', views.index, name='index'),
    url('^import_bibtex/$', views.import_bibtex_js, name='import_bibtex'),
    url('^save/$', views.save_js, name='save'),
    url('^delete/$', views.delete_js, name='delete'),
    url('^save_category/$', views.save_category_js, name='save_category'),
    url(
        '^delete_category/$',
        views.delete_category_js,
        name='delete_category'
    ),
    url('^biblist/$', views.biblist_js, name='biblist')
]
