from django.conf.urls import url

from . import views

urlpatterns = [
    url('^$', views.index, name='index'),
    url('^stylelist/$', views.stylelist_js, name='stylelist'),
    url('^save/$', views.save_js, name='save'),
    url('^delete/$', views.delete_js, name='delete')

]
