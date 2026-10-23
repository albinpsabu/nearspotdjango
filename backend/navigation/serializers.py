from rest_framework import serializers
from .models import NavigationSession


class NavigationSessionSerializer(serializers.ModelSerializer):

    class Meta:
        model = NavigationSession

        fields = [
            "id",
            "user",
            "destination_latitude",
            "destination_longitude",
            "travel_mode",
            "status",
            "started_at",
            "ended_at",
        ]

        read_only_fields = [
            "id",
            "user",
            "status",
            "started_at",
            "ended_at",
        ]

    def validate_destination_latitude(self, value):
        if not -90 <= value <= 90:
            raise serializers.ValidationError(
                "Latitude must be between -90 and 90."
            )
        return value

    def validate_destination_longitude(self, value):
        if not -180 <= value <= 180:
            raise serializers.ValidationError(
                "Longitude must be between -180 and 180."
            )
        return value



class RouteRequestSerializer(serializers.Serializer):
    origin_latitude = serializers.FloatField(
        min_value=-90, max_value=90
    )
    origin_longitude = serializers.FloatField(
        min_value=-180, max_value=180
    )
    destination_latitude = serializers.FloatField(
        min_value=-90, max_value=90
    )
    destination_longitude = serializers.FloatField(
        min_value=-180, max_value=180
    )
    travel_mode = serializers.ChoiceField(
        choices=["driving", "walking", "cycling"],
        default="driving"
    )