from __future__ import unicode_literals

from django.conf.urls import url

from . import views

urlpatterns = [
    url('^$', views.index, name='index'),
    url('^save/$', views.save_js, name='save_js'),
    url('^delete/$', views.delete_js, name='delete_js'),
    url('^images/$', views.images_js, name='images_js'),
    url('^save_category/$', views.save_category_js, name='save_category_js')
]
