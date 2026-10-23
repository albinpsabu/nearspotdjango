from django.urls import path 
from .consumers import SpotConsumer


websocket_urlpatterns=[
    path("ws/spots/",SpotConsumer.as_asgi())
]