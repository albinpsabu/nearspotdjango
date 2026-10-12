
"""
API views for external OpenStreetMap places.

Separate from the existing HiddenSpot APIs.

Features:
1. Discover nearby OSM places using database caching.
2. Retrieve place details and reviews.
3. Save and unsave places.
4. List saved external places.
5. Create, update, and delete reviews.
6. List the authenticated user's external reviews.

Guests can browse places and read reviews.

Authenticated users can save places and manage
their own reviews.
"""

from django.contrib.gis.geos import Point
from django.db import transaction
from django.db.models import Avg, Count

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import (
    AllowAny,
    IsAuthenticated,
)
from rest_framework import status
from rest_framework.throttling import (
    AnonRateThrottle,
    UserRateThrottle,
)

from .models import (
    ExternalPlace,
    SavedExternalPlace,
    ExternalPlaceReview,
)

from .serializers import (
    ExternalPlaceReviewSerializer,
    MyExternalReviewSerializer,
)

from .services.osm import (
    fetch_external_place_by_id,
    validate_osm_identifier,
    OSMServiceError,
    OSMValidationError,
)

# Database-backed geographic discovery service.
from .services.place_discovery import discover_places


# ============================================================
# THROTTLING
# ============================================================

class ExternalPlaceAnonThrottle(AnonRateThrottle):
    """
    Limit anonymous users to 20 requests per minute.
    """

    rate = "20/min"


class ExternalPlaceUserThrottle(UserRateThrottle):
    """
    Limit authenticated users to 40 requests per minute.
    """

    rate = "40/min"


class ExternalPlaceThrottleMixin:
    """
    Apply throttling based on authentication status.
    """

    def get_throttles(self):
        if self.request.user.is_authenticated:
            return [ExternalPlaceUserThrottle()]

        return [ExternalPlaceAnonThrottle()]


# ============================================================
# SHARED HELPER FUNCTIONS
# ============================================================

def find_external_place(osm_type, osm_id):
    """
    Find an already registered external place.

    Does not make an external API request.
    """

    osm_type, osm_id = validate_osm_identifier(
        osm_type,
        osm_id,
    )

    return ExternalPlace.objects.filter(
        osm_type=osm_type,
        osm_id=osm_id,
    ).first()


def register_external_place(osm_type, osm_id):
    """
    Find or register a verified OpenStreetMap place.

    Existing records are reused.

    New records are created only after verification
    through the official OpenStreetMap API.

    Returns:
        (place, created)
    """

    osm_type, osm_id = validate_osm_identifier(
        osm_type,
        osm_id,
    )

    existing_place = find_external_place(
        osm_type,
        osm_id,
    )

    if existing_place is not None:
        return existing_place, False

    verified_data = fetch_external_place_by_id(
        osm_type,
        osm_id,
    )

    if verified_data is None:
        return None, False

    # GeoDjango Point uses longitude first.
    location = Point(
        verified_data["longitude"],
        verified_data["latitude"],
        srid=4326,
    )

    # Prevent duplicate registration when multiple
    # users interact with the same OSM place.
    with transaction.atomic():
        place, created = ExternalPlace.objects.get_or_create(
            osm_type=osm_type,
            osm_id=osm_id,
            defaults={
                "name": verified_data["name"],
                "category": verified_data["category"],
                "address": verified_data["address"],
                "location": location,
            },
        )

    return place, created


def serialize_external_place(place, user=None):
    """
    Build a standard API response for an external place.

    Includes:
    - OSM identity
    - Place information
    - Average rating
    - Review count
    - Current user's saved status
    """

    rating_data = place.reviews.aggregate(
        average_rating=Avg("rating"),
        review_count=Count("id"),
    )

    average_rating = rating_data["average_rating"]

    if average_rating is not None:
        average_rating = round(average_rating, 1)

    is_saved = False

    if user is not None and user.is_authenticated:
        is_saved = SavedExternalPlace.objects.filter(
            place=place,
            user=user,
        ).exists()

    return {
        "osm_type": place.osm_type,
        "osm_id": place.osm_id,
        "name": place.name,
        "category": place.category,
        "address": place.address,
        "latitude": place.location.y,
        "longitude": place.location.x,
        "average_rating": average_rating,
        "review_count": rating_data["review_count"],
        "is_saved": is_saved,
    }


def error_response(message, http_status):
    """
    Return a consistent API error response.
    """

    return Response(
        {"error": message},
        status=http_status,
    )


# ============================================================
# PUBLIC EXTERNAL PLACE DISCOVERY
# ============================================================

class ExternalPlaceNearbyView(
    ExternalPlaceThrottleMixin,
    APIView,
):
    """
    GET /api/spots/external/nearby/

    Query parameters:
        south
        west
        north
        east

    Authentication is not required.

    Uses persistent database-backed discovery caching.
    """

    permission_classes = [AllowAny]

    def get(self, request):
        south = request.query_params.get("south")
        west = request.query_params.get("west")
        north = request.query_params.get("north")
        east = request.query_params.get("east")

        if any(
            value is None
            for value in (south, west, north, east)
        ):
            return error_response(
                "south, west, north and east "
                "query parameters are required.",
                status.HTTP_400_BAD_REQUEST,
            )

        try:
            # First checks previously discovered database
            # areas, then calls Overpass only when needed.
            places = discover_places(
                south=south,
                west=west,
                north=north,
                east=east,
            )

        except OSMValidationError as exc:
            return error_response(
                str(exc),
                status.HTTP_400_BAD_REQUEST,
            )

        except OSMServiceError as exc:
            return error_response(
                str(exc),
                status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return Response(
            {
                "count": len(places),
                "places": places,
            },
            status=status.HTTP_200_OK,
        )


# ============================================================
# PUBLIC EXTERNAL PLACE DETAILS
# ============================================================

class ExternalPlaceDetailView(
    ExternalPlaceThrottleMixin,
    APIView,
):
    """
    GET /api/spots/external/<osm_type>/<osm_id>/

    Returns registered place details, ratings,
    reviews and saved status.

    Unregistered places return 404.
    """

    permission_classes = [AllowAny]

    def get(self, request, osm_type, osm_id):
        try:
            place = find_external_place(
                osm_type,
                osm_id,
            )

        except OSMValidationError as exc:
            return error_response(
                str(exc),
                status.HTTP_400_BAD_REQUEST,
            )

        if place is None:
            return error_response(
                "This external place has not been "
                "registered in NearSpot yet.",
                status.HTTP_404_NOT_FOUND,
            )

        reviews = ExternalPlaceReview.objects.filter(
            place=place,
        ).select_related(
            "user",
        ).order_by(
            "-created_at",
        )

        review_serializer = ExternalPlaceReviewSerializer(
            reviews,
            many=True,
        )

        place_data = serialize_external_place(
            place,
            request.user,
        )

        place_data["reviews"] = review_serializer.data

        return Response(
            place_data,
            status=status.HTTP_200_OK,
        )


# ============================================================
# SAVE / UNSAVE EXTERNAL PLACE
# ============================================================

class ExternalPlaceSaveView(
    ExternalPlaceThrottleMixin,
    APIView,
):
    """
    POST /api/spots/external/<osm_type>/<osm_id>/save/

        Save an external place.

    DELETE /api/spots/external/<osm_type>/<osm_id>/save/

        Remove a saved external place.

    Authentication required.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, osm_type, osm_id):
        try:
            place, _ = register_external_place(
                osm_type,
                osm_id,
            )

        except OSMValidationError as exc:
            return error_response(
                str(exc),
                status.HTTP_400_BAD_REQUEST,
            )

        except OSMServiceError as exc:
            return error_response(
                str(exc),
                status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        if place is None:
            return error_response(
                "This OpenStreetMap place could not be verified.",
                status.HTTP_404_NOT_FOUND,
            )

        saved_place, created = (
            SavedExternalPlace.objects.get_or_create(
                place=place,
                user=request.user,
            )
        )

        return Response(
            {
                "message": (
                    "Place saved successfully."
                    if created
                    else "Place is already saved."
                ),
                "is_saved": True,
                "place": serialize_external_place(
                    place,
                    request.user,
                ),
            },
            status=(
                status.HTTP_201_CREATED
                if created
                else status.HTTP_200_OK
            ),
        )

    def delete(self, request, osm_type, osm_id):
        try:
            place = find_external_place(
                osm_type,
                osm_id,
            )

        except OSMValidationError as exc:
            return error_response(
                str(exc),
                status.HTTP_400_BAD_REQUEST,
            )

        if place is None:
            return error_response(
                "External place not found.",
                status.HTTP_404_NOT_FOUND,
            )

        SavedExternalPlace.objects.filter(
            place=place,
            user=request.user,
        ).delete()

        return Response(
            {
                "message": "Place removed from saved places.",
                "is_saved": False,
            },
            status=status.HTTP_200_OK,
        )


# ============================================================
# LIST SAVED EXTERNAL PLACES
# ============================================================

class SavedExternalPlaceListView(
    ExternalPlaceThrottleMixin,
    APIView,
):
    """
    GET /api/spots/external/saved/

    Return places saved by the authenticated user.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        saved_places = SavedExternalPlace.objects.filter(
            user=request.user,
        ).select_related(
            "place",
        ).order_by(
            "-saved_at",
        )

        results = []

        for saved in saved_places:
            place_data = serialize_external_place(
                saved.place,
                request.user,
            )

            place_data["saved_at"] = saved.saved_at

            results.append(place_data)

        return Response(
            {
                "count": len(results),
                "places": results,
            },
            status=status.HTTP_200_OK,
        )


# ============================================================
# CREATE / UPDATE / DELETE EXTERNAL PLACE REVIEW
# ============================================================

class ExternalPlaceReviewView(
    ExternalPlaceThrottleMixin,
    APIView,
):
    """
    POST /api/spots/external/<osm_type>/<osm_id>/review/

        Create a review.

    PATCH /api/spots/external/<osm_type>/<osm_id>/review/

        Update the current user's review.

    DELETE /api/spots/external/<osm_type>/<osm_id>/review/

        Delete the current user's review.

    Authentication required.

    Each user can review a place only once.
    """

    permission_classes = [IsAuthenticated]

    # --------------------------------------------------------
    # CREATE REVIEW
    # --------------------------------------------------------

    def post(self, request, osm_type, osm_id):
        try:
            place, _ = register_external_place(
                osm_type,
                osm_id,
            )

        except OSMValidationError as exc:
            return error_response(
                str(exc),
                status.HTTP_400_BAD_REQUEST,
            )

        except OSMServiceError as exc:
            return error_response(
                str(exc),
                status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        if place is None:
            return error_response(
                "This OpenStreetMap place could not be verified.",
                status.HTTP_404_NOT_FOUND,
            )

        if ExternalPlaceReview.objects.filter(
            place=place,
            user=request.user,
        ).exists():
            return error_response(
                "You have already reviewed this place. "
                "Use PATCH to update your review.",
                status.HTTP_400_BAD_REQUEST,
            )

        serializer = ExternalPlaceReviewSerializer(
            data=request.data,
        )

        serializer.is_valid(raise_exception=True)

        serializer.save(
            place=place,
            user=request.user,
        )

        return Response(
            {
                "message": "Review submitted successfully.",
                "review": serializer.data,
                "place": serialize_external_place(
                    place,
                    request.user,
                ),
            },
            status=status.HTTP_201_CREATED,
        )

    # --------------------------------------------------------
    # UPDATE REVIEW
    # --------------------------------------------------------

    def patch(self, request, osm_type, osm_id):
        try:
            place = find_external_place(
                osm_type,
                osm_id,
            )

        except OSMValidationError as exc:
            return error_response(
                str(exc),
                status.HTTP_400_BAD_REQUEST,
            )

        if place is None:
            return error_response(
                "External place not found.",
                status.HTTP_404_NOT_FOUND,
            )

        review = ExternalPlaceReview.objects.filter(
            place=place,
            user=request.user,
        ).first()

        if review is None:
            return error_response(
                "You have not reviewed this place yet.",
                status.HTTP_404_NOT_FOUND,
            )

        serializer = ExternalPlaceReviewSerializer(
            review,
            data=request.data,
            partial=True,
        )

        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(
            {
                "message": "Review updated successfully.",
                "review": serializer.data,
                "place": serialize_external_place(
                    place,
                    request.user,
                ),
            },
            status=status.HTTP_200_OK,
        )

    # --------------------------------------------------------
    # DELETE REVIEW
    # --------------------------------------------------------

    def delete(self, request, osm_type, osm_id):
        try:
            place = find_external_place(
                osm_type,
                osm_id,
            )

        except OSMValidationError as exc:
            return error_response(
                str(exc),
                status.HTTP_400_BAD_REQUEST,
            )

        if place is None:
            return error_response(
                "External place not found.",
                status.HTTP_404_NOT_FOUND,
            )

        deleted_count, _ = (
            ExternalPlaceReview.objects.filter(
                place=place,
                user=request.user,
            ).delete()
        )

        if deleted_count == 0:
            return error_response(
                "You have not reviewed this place yet.",
                status.HTTP_404_NOT_FOUND,
            )

        return Response(
            {
                "message": "Review deleted successfully.",
                "place": serialize_external_place(
                    place,
                    request.user,
                ),
            },
            status=status.HTTP_200_OK,
        )


# ============================================================
# LIST CURRENT USER'S EXTERNAL PLACE REVIEWS
# ============================================================

class MyExternalReviewListView(
    ExternalPlaceThrottleMixin,
    APIView,
):
    """
    GET /api/spots/external/reviews/my/

    Returns all external OSM place reviews submitted
    by the authenticated user.

    Includes the related place details.

    Reviews are ordered from newest to oldest.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Retrieve only reviews written by this user.
        reviews = (
            ExternalPlaceReview.objects
            .filter(user=request.user)
            .select_related("place")
            .order_by("-created_at")
        )

        # Include OSM place details with each review.
        serializer = MyExternalReviewSerializer(
            reviews,
            many=True,
        )

        return Response(
            {
                "count": len(serializer.data),
                "reviews": serializer.data,
            },
            status=status.HTTP_200_OK,
        )
