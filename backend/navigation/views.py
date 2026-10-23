
import requests

from django.utils import timezone

from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import NavigationSession
from .serializers import (
    RouteRequestSerializer,
    NavigationSessionSerializer,
)
from .services.routing_service import RoutingService
from .services.travel_modes import get_available_travel_modes


# ============================================================
# NAVIGATION SESSION MANAGEMENT
# ============================================================

class NavigationSessionListCreateView(generics.ListCreateAPIView):
    """
    List and create navigation sessions for the authenticated user.
    """

    serializer_class = NavigationSessionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return NavigationSession.objects.filter(
            user=self.request.user
        ).order_by("-started_at")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class NavigationSessionDetailView(generics.RetrieveAPIView):
    """
    Retrieve a navigation session belonging to the current user.
    """

    serializer_class = NavigationSessionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return NavigationSession.objects.filter(
            user=self.request.user
        )


class NavigationSessionFinishView(APIView):
    """
    Complete or cancel an authenticated user's navigation session.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):

        try:
            session = NavigationSession.objects.get(
                pk=pk,
                user=request.user,
            )

        except NavigationSession.DoesNotExist:
            return Response(
                {"detail": "Navigation session not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if session.status != NavigationSession.Status.ACTIVE:
            return Response(
                {"detail": "Navigation session is already closed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        action = request.data.get("action", "completed")

        if action not in ("completed", "cancelled"):
            return Response(
                {"detail": "Invalid action."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        session.status = action
        session.ended_at = timezone.now()

        session.save(
            update_fields=["status", "ended_at"]
        )

        return Response(
            NavigationSessionSerializer(session).data,
            status=status.HTTP_200_OK,
        )


# ============================================================
# PUBLIC TRAVEL MODES API
# ============================================================

class TravelModesAPIView(APIView):
    """
    Return available transportation modes.

    Public endpoint:
        GET /api/navigation/travel-modes/

    Modes are defined in services/travel_modes.py.
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        modes = get_available_travel_modes()

        return Response(
            modes,
            status=status.HTTP_200_OK,
        )


# ============================================================
# PUBLIC ROUTING API
# ============================================================

class RouteAPIView(APIView):
    """
    Calculate a route between two coordinates.

    Public endpoint:
        POST /api/navigation/routes/

    Supports:
        - driving
        - cycling
        - walking

    Authentication is not required.
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):

        serializer = RouteRequestSerializer(
            data=request.data
        )
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data

        origin = {
            "latitude": data["origin_latitude"],
            "longitude": data["origin_longitude"],
        }

        destination = {
            "latitude": data["destination_latitude"],
            "longitude": data["destination_longitude"],
        }

        try:
            route = RoutingService.get_route(
                origin=origin,
                destination=destination,
                travel_mode=data["travel_mode"],
            )

        except ValueError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        except requests.Timeout:
            return Response(
                {"detail": "Routing service timed out."},
                status=status.HTTP_504_GATEWAY_TIMEOUT,
            )

        except requests.RequestException:
            return Response(
                {
                    "detail": (
                        "Routing service unavailable "
                        "or route not found."
                    )
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response(
            route,
            status=status.HTTP_200_OK,
        )
