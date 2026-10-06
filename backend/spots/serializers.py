from rest_framework import serializers
from django.contrib.gis.geos import Point
from .utils import compress_image

from .models import (
    Category,
    HiddenSpot,
    Verification,
    Report,
    CommunityVerification,
    SpotMedia,
    AuditLog
)

class CategorySerializer(serializers.ModelSerializer):

    class Meta:
        model = Category
        fields = [
            "id",
            "name",
            "description",
            "is_active",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
        ]


class HiddenSpotSerializer(serializers.ModelSerializer):

    latitude = serializers.FloatField(write_only=True)
    longitude = serializers.FloatField(write_only=True)

    class Meta:
        model = HiddenSpot

        fields = [
            "id",
            "name",
            "description",
            "category",
            "latitude",
            "longitude",
            "status",
            "created_at",
        ]

        read_only_fields = [
            "id",
            "status",
            "created_at",
        ]

    def validate_category(self, category):

        if not category.is_active:
            raise serializers.ValidationError(
                "This category is not active."
            )

        return category

    def create(self, validated_data):

        latitude = validated_data.pop("latitude")
        longitude = validated_data.pop("longitude")

        location = Point(
            longitude,
            latitude,
            srid=4326
        )

        spot = HiddenSpot.objects.create(
            location=location,
            submitted_by=self.context["request"].user,
            status=HiddenSpot.Status.PENDING,
            **validated_data
        )

        return spot


class PendingSpotSerializer(serializers.ModelSerializer):

    category_name = serializers.CharField(
        source="category.name",
        read_only=True
    )

    submitted_by_name = serializers.CharField(
        source="submitted_by.name",
        read_only=True
    )

    submitted_by_email = serializers.CharField(
        source="submitted_by.email",
        read_only=True
    )

    latitude = serializers.SerializerMethodField()
    longitude = serializers.SerializerMethodField()

    class Meta:
        model = HiddenSpot

        fields = [
            "id",
            "name",
            "description",
            "category",
            "category_name",
            "latitude",
            "longitude",
            "submitted_by_name",
            "submitted_by_email",
            "status",
            "created_at",
        ]

    def get_latitude(self, obj):
        return obj.location.y

    def get_longitude(self, obj):
        return obj.location.x


class VerificationSerializer(serializers.ModelSerializer):

    class Meta:
        model = Verification
        fields = [
            "id",
            "spot",
            "employee",
            "action",
            "reason",
            "created_at",
        ]

        read_only_fields = [
            "id",
            "employee",
            "created_at",
        ]


class ApprovedSpotSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(
        source="category.name",
        read_only=True
    )

    latitude = serializers.SerializerMethodField()
    longitude = serializers.SerializerMethodField()
    distance_meters = serializers.SerializerMethodField()
    media = serializers.SerializerMethodField()

    class Meta:
        model = HiddenSpot
        fields = [
            "id",
            "name",
            "description",
            "category",
            "category_name",
            "latitude",
            "longitude",
            "status",
            "created_at",
            "media",
            "distance_meters",
        ]

    def get_latitude(self, obj):
        return obj.location.y

    def get_longitude(self, obj):
        return obj.location.x

    def get_distance_meters(self, obj):
        distance = getattr(obj, "distance", None)

        if distance is None:
            return None

        return round(distance.m, 2)

    def get_media(self, obj):
        request = self.context.get("request")

        media_list = []

        for media in obj.media.all():
            if request:
                file_url = request.build_absolute_uri(
                    media.file.url
                )
            else:
                file_url = media.file.url

            media_list.append({
                "id": media.id,
                "media_type": media.media_type,
                "url": file_url,
                "uploaded_at": media.uploaded_at,
            })

        return media_list

class MySpotSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(
        source="category.name",
        read_only=True
    )

    latitude = serializers.SerializerMethodField()
    longitude = serializers.SerializerMethodField()

    class Meta:
        model = HiddenSpot
        fields = [
            "id",
            "name",
            "description",
            "category",
            "category_name",
            "latitude",
            "longitude",
            "status",
            "rejection_reason",
            "created_at",
        ]

        read_only_fields = [
            "id",
            "status",
            "rejection_reason",
            "created_at",
        ]

    def get_latitude(self, obj):
        return obj.location.y

    def get_longitude(self, obj):
        return obj.location.x




class ReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = Report
        fields = [
            "id",
            "spot",
            "reason",
            "status",
            "created_at",
        ]

        read_only_fields = [
            "id",
            "status",
            "created_at",
        ]

    def validate_spot(self, spot):
        if spot.status != HiddenSpot.Status.APPROVED:
            raise serializers.ValidationError(
                "Only approved spots can be reported."
            )

        return spot



class ReportStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = Report
        fields = ["status"]

    def validate_status(self, value):
        allowed_statuses = [
            Report.Status.REVIEWED,
            Report.Status.RESOLVED,
        ]

        if value not in allowed_statuses:
            raise serializers.ValidationError(
                "Status must be REVIEWED or RESOLVED."
            )

        return value



class CommunityVerificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = CommunityVerification
        fields = [
            "id",
            "spot",
            "action",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
        ]

    def validate_spot(self, spot):
        if spot.status != HiddenSpot.Status.PENDING:
            raise serializers.ValidationError(
                "Only pending spots can be community verified."
            )

        return spot



class CommunitySpotSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(
        source="category.name",
        read_only=True
    )

    latitude = serializers.SerializerMethodField()
    longitude = serializers.SerializerMethodField()

    class Meta:
        model = HiddenSpot
        fields = [
            "id",
            "name",
            "description",
            "category",
            "category_name",
            "latitude",
            "longitude",
            "status",
            "created_at",
        ]

        read_only_fields = [
            "id",
            "status",
            "created_at",
        ]

    def get_latitude(self, obj):
        return obj.location.y

    def get_longitude(self, obj):
        return obj.location.x




class CommunityVerificationSummarySerializer(serializers.Serializer):
    confirm_count = serializers.IntegerField()
    report_count = serializers.IntegerField()
    community_status = serializers.CharField()



class SpotMediaSerializer(serializers.ModelSerializer):
    class Meta:
        model = SpotMedia
        fields = [
            "id",
            "spot",
            "file",
            "media_type",
            "uploaded_at",
        ]
        read_only_fields = [
            "id",
            "uploaded_at",
        ]

    def validate(self, attrs):
        file = attrs.get("file")
        media_type = attrs.get("media_type")

        if not file:
            raise serializers.ValidationError({
                "file": "A file is required."
            })

        # -------------------------
        # IMAGE VALIDATION
        # -------------------------
        if media_type == SpotMedia.MediaType.IMAGE:

            allowed_types = [
                "image/jpeg",
                "image/png",
                "image/webp",
            ]

            if file.content_type not in allowed_types:
                raise serializers.ValidationError({
                    "file": "Only JPG, PNG, and WEBP images are allowed."
                })

            # Maximum original upload size: 10 MB
            if file.size > 10 * 1024 * 1024:
                raise serializers.ValidationError({
                    "file": "Image size cannot exceed 10 MB."
                })

        # -------------------------
        # VIDEO VALIDATION
        # -------------------------
        elif media_type == SpotMedia.MediaType.VIDEO:

            allowed_types = [
                "video/mp4",
                "video/webm",
                "video/quicktime",
                "video/x-msvideo",
                "video/x-matroska",
                "video/x-m4v",
                "video/3gpp",
            ]

            if file.content_type not in allowed_types:
                raise serializers.ValidationError({
                    "file": (
                        "Unsupported video format. "
                        "Allowed formats: MP4, WEBM, MOV, AVI, MKV, M4V and 3GP."
                    )
                })

            # Maximum original video upload size: 100 MB
            if file.size > 100 * 1024 * 1024:
                raise serializers.ValidationError({
                    "file": "Video size cannot exceed 100 MB."
                })

        else:
            raise serializers.ValidationError({
                "media_type": "Media type must be IMAGE or VIDEO."
            })

        return attrs

    def create(self, validated_data):
        file = validated_data["file"]
        media_type = validated_data["media_type"]

        # -------------------------
        # IMAGE COMPRESSION
        # -------------------------
        if media_type == SpotMedia.MediaType.IMAGE:

            optimized_file = compress_image(file)

            validated_data["file"] = optimized_file

        # -------------------------
        # VIDEO COMPRESSION
        # -------------------------
        elif media_type == SpotMedia.MediaType.VIDEO:

            optimized_file = compress_video(file)

            validated_data["file"] = optimized_file

        return super().create(validated_data)




class AuditLogSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(
        source="user.name",
        read_only=True,
    )

    class Meta:
        model = AuditLog
        fields = [
            "id",
            "user",
            "user_name",
            "action",
            "description",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "user",
            "user_name",
            "created_at",
        ]