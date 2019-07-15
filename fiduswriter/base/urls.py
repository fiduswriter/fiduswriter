from django.conf.urls import url

from . import views

urlpatterns = [
    url('^flatpage/$', views.flatpage, name='flatpage'),
]
