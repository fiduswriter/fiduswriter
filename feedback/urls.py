from django.conf.urls import url
from . import views

urlpatterns = [
    url('^feedback/$', views.feedback, name='feedback'),
]
