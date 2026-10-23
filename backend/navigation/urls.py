
from django.urls import path

from .views import (
    NavigationSessionListCreateView,
    NavigationSessionDetailView,
    NavigationSessionFinishView,
    RouteAPIView,
    TravelModesAPIView,
)


urlpatterns = [
    # ========================================================
    # NAVIGATION SESSION ENDPOINTS
    # ========================================================

    path(
        "sessions/",
        NavigationSessionListCreateView.as_view(),
        name="navigation-session-list-create",
    ),

    path(
        "sessions/<int:pk>/",
        NavigationSessionDetailView.as_view(),
        name="navigation-session-detail",
    ),

    path(
        "sessions/<int:pk>/finish/",
        NavigationSessionFinishView.as_view(),
        name="navigation-session-finish",
    ),

    # ========================================================
    # PUBLIC TRAVEL MODES ENDPOINT
    # ========================================================

    path(
        "travel-modes/",
        TravelModesAPIView.as_view(),
        name="navigation-travel-modes",
    ),

    # ========================================================
    # PUBLIC ROUTING ENDPOINT
    # ========================================================

    path(
        "routes/",
        RouteAPIView.as_view(),
        name="navigation-routes",
    ),
]
