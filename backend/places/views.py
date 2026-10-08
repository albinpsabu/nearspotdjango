import requests

from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status


class PlaceSearchView(APIView):
    """
    Search public places using OpenStreetMap Nominatim.
    """

    permission_classes = [AllowAny]

    def get(self, request):
        query = request.query_params.get("q", "").strip()

        if not query:
            return Response(
                {
                    "detail": "Search query is required."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(query) < 2:
            return Response(
                {
                    "detail": "Search query must contain at least 2 characters."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        url = "https://nominatim.openstreetmap.org/search"

        params = {
            "q": query,
            "format": "json",
            "addressdetails": 1,
            "limit": 8,
            "countrycodes": "in",
        }

        headers = {
            "User-Agent": "NearSpot/1.0"
        }

        try:
            response = requests.get(
                url,
                params=params,
                headers=headers,
                timeout=10,
            )

            response.raise_for_status()

            results = response.json()

        except requests.RequestException:
            return Response(
                {
                    "detail": "Unable to search places right now."
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        formatted_results = []

        for result in results:
            formatted_results.append(
                {
                    "name": result.get("name") or result.get("display_name", ""),
                    "display_name": result.get("display_name", ""),
                    "latitude": result.get("lat"),
                    "longitude": result.get("lon"),
                    "type": result.get("type"),
                    "category": result.get("class"),
                    "osm_type": result.get("osm_type"),
                    "osm_id": result.get("osm_id"),
                }
            )

        return Response(formatted_results)