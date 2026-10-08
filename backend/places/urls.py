from django.urls import path

from .views import PlaceSearchView


urlpatterns = [
    path("search/", PlaceSearchView.as_view(), name="place-search"),
]