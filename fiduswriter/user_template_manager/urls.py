from django.conf.urls import url

from . import views

urlpatterns = [
    url('^list/$', views.list, name='document_template_list'),
    url('^save/$', views.save, name='document_template_save'),
    url('^copy/$', views.copy, name='document_template_copy'),
    url('^delete/$', views.delete, name='document_template_delete'),
]
