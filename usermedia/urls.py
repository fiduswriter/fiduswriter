

from django.conf.urls import url

from . import views
from base.views import app

urlpatterns = [
    url('^$', app, name='index'),
    url('^save/$', views.save_js, name='save_js'),
    url('^delete/$', views.delete_js, name='delete_js'),
    url('^images/$', views.images_js, name='images_js'),
    url('^save_category/$', views.save_category_js, name='save_category_js')
]
