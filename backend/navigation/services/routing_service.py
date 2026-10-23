
import requests

from django.conf import settings

from .travel_modes import get_travel_mode


class RoutingService:

    BASE_URL = "https://api.openrouteservice.org/v2/directions"

    @classmethod
    def get_route(cls, origin, destination, travel_mode="driving"):

        # Resolve the selected travel mode from the central configuration.
        mode = get_travel_mode(travel_mode)
        profile = mode.ors_profile

        url = f"{cls.BASE_URL}/{profile}/geojson"

        headers = {
            "Authorization": settings.ORS_API_KEY,
            "Content-Type": "application/json",
        }

        payload = {
            "coordinates": [
                [origin["longitude"], origin["latitude"]],
                [destination["longitude"], destination["latitude"]],
            ],
            "instructions": True,
        }

        response = requests.post(
            url,
            json=payload,
            headers=headers,
            timeout=20,
        )

        response.raise_for_status()

        return response.json()
