
from rest_framework import serializers
from django.contrib.gis.geos import Point

from .utils import compress_image, compress_video

from .models import (
    Category,
    HiddenSpot,
    Verification,
    Report,
    CommunityVerification,
    SpotMedia,
    AuditLog,
)


# =========================
# CATEGORY SERIALIZER
# =========================

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


# =========================
# HIDDEN SPOT SERIALIZER
# =========================

class HiddenSpotSerializer(serializers.ModelSerializer):

    name = serializers.CharField(
        required=True,
        allow_blank=True,
    )

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

    def validate_name(self, name):
        name = name.strip()

        if not name:
            raise serializers.ValidationError(
                "Spot name cannot be empty."
            )

        return name

    def validate_description(self, description):
        return description.strip()

    def validate_category(self, category):
        if not category.is_active:
            raise serializers.ValidationError(
                "This category is not active."
            )

        return category

    def validate_latitude(self, latitude):
        if not -90 <= latitude <= 90:
            raise serializers.ValidationError(
                "Latitude must be between -90 and 90."
            )

        return latitude

    def validate_longitude(self, longitude):
        if not -180 <= longitude <= 180:
            raise serializers.ValidationError(
                "Longitude must be between -180 and 180."
            )

        return longitude

    def create(self, validated_data):
        latitude = validated_data.pop("latitude")
        longitude = validated_data.pop("longitude")

        location = Point(
            longitude,
            latitude,
            srid=4326,
        )

        spot = HiddenSpot.objects.create(
            location=location,
            submitted_by=self.context["request"].user,
            status=HiddenSpot.Status.PENDING,
            **validated_data,
        )

        return spot


# =========================
# PENDING SPOT SERIALIZER
# =========================

# ============================================================
# EMPLOYEE SPOT REVIEW SERIALIZER
# Returns full submission details, including uploaded media.
# ============================================================

class PendingSpotSerializer(serializers.ModelSerializer):

    category_name = serializers.CharField(
        source="category.name",
        read_only=True
    )

    category_description = serializers.CharField(
        source="category.description",
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
    media = serializers.SerializerMethodField()

    class Meta:
        model = HiddenSpot

        fields = [
            "id",
            "name",
            "description",
            "category",
            "category_name",
            "category_description",
            "latitude",
            "longitude",
            "submitted_by_name",
            "submitted_by_email",
            "status",
            "rejection_reason",
            "created_at",
            "updated_at",
            "media",
        ]

        read_only_fields = fields

    def get_latitude(self, obj):
        return obj.location.y if obj.location else None

    def get_longitude(self, obj):
        return obj.location.x if obj.location else None

    def get_media(self, obj):
        request = self.context.get("request")
        media_list = []

        for media in obj.media.all():
            file_url = media.file.url

            if request:
                file_url = request.build_absolute_uri(file_url)

            media_list.append({
                "id": media.id,
                "media_type": media.media_type,
                "url": file_url,
                "uploaded_at": media.uploaded_at,
            })

        return media_list
# =========================
# VERIFICATION SERIALIZER
# =========================

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


# =========================
# APPROVED SPOT SERIALIZER
# =========================

class ApprovedSpotSerializer(serializers.ModelSerializer):

    category_name = serializers.CharField(
        source="category.name",
        read_only=True,
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


# =========================
# MY SPOT SERIALIZER
# =========================

class MySpotSerializer(serializers.ModelSerializer):

    category_name = serializers.CharField(
        source="category.name",
        read_only=True,
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


# ============================================================
# REPORT SERIALIZER
# Provides complete report information for Admin and Employee.
# Also remains compatible with the User report-creation API.
# ============================================================

class ReportSerializer(serializers.ModelSerializer):

    # --------------------------------------------
    # REPORTER INFORMATION
    # --------------------------------------------

    reported_by_name = serializers.CharField(
        source="reported_by.name",
        read_only=True
    )

    reported_by_email = serializers.EmailField(
        source="reported_by.email",
        read_only=True
    )

    # --------------------------------------------
    # REPORTED SPOT INFORMATION
    # --------------------------------------------

    spot_name = serializers.CharField(
        source="spot.name",
        read_only=True
    )

    spot_category = serializers.CharField(
        source="spot.category.name",
        read_only=True
    )

    spot_status = serializers.CharField(
        source="spot.status",
        read_only=True
    )

    spot_description = serializers.CharField(
        source="spot.description",
        read_only=True
    )

    spot_latitude = serializers.SerializerMethodField()
    spot_longitude = serializers.SerializerMethodField()

    # --------------------------------------------
    # SERIALIZER CONFIGURATION
    # --------------------------------------------

    class Meta:
        model = Report

        fields = [
            "id",

            # Report information
            "reason",
            "status",
            "created_at",
            "updated_at",

            # Reported spot
            "spot",
            "spot_name",
            "spot_category",
            "spot_status",
            "spot_description",
            "spot_latitude",
            "spot_longitude",

            # Reporter
            "reported_by",
            "reported_by_name",
            "reported_by_email",
        ]

        read_only_fields = [
            "id",
            "status",
            "created_at",
            "updated_at",
            "reported_by",
        ]

    # --------------------------------------------
    # LOCATION COORDINATES
    # --------------------------------------------

    def get_spot_latitude(self, obj):
        if not obj.spot.location:
            return None

        return obj.spot.location.y

    def get_spot_longitude(self, obj):
        if not obj.spot.location:
            return None

        return obj.spot.location.x

    # --------------------------------------------
    # VALIDATION
    # --------------------------------------------

    def validate_spot(self, spot):
        if spot.status != HiddenSpot.Status.APPROVED:
            raise serializers.ValidationError(
                "Only approved spots can be reported."
            )

        return spot

# =========================
# REPORT STATUS SERIALIZER
# =========================

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


# =========================
# COMMUNITY VERIFICATION SERIALIZER
# =========================

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


# =========================
# COMMUNITY SPOT SERIALIZER
# =========================

class CommunitySpotSerializer(serializers.ModelSerializer):

    category_name = serializers.CharField(
        source="category.name",
        read_only=True,
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


# =========================
# COMMUNITY VERIFICATION SUMMARY
# =========================

class CommunityVerificationSummarySerializer(serializers.Serializer):

    confirm_count = serializers.IntegerField()
    report_count = serializers.IntegerField()
    community_status = serializers.CharField()


# =========================
# SPOT MEDIA SERIALIZER
# =========================

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

        # =========================
        # IMAGE VALIDATION
        # =========================

        if media_type == SpotMedia.MediaType.IMAGE:

            allowed_types = [
                "image/jpeg",
                "image/png",
                "image/webp",
            ]

            if file.content_type not in allowed_types:
                raise serializers.ValidationError({
                    "file": (
                        "Only JPG, PNG, and WEBP images are allowed."
                    )
                })

            if file.size > 10 * 1024 * 1024:
                raise serializers.ValidationError({
                    "file": "Image size cannot exceed 10 MB."
                })

        # =========================
        # VIDEO VALIDATION
        # =========================

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
                        "Allowed formats: MP4, WEBM, MOV, AVI, "
                        "MKV, M4V and 3GP."
                    )
                })

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

        # =========================
        # IMAGE COMPRESSION
        # =========================

        if media_type == SpotMedia.MediaType.IMAGE:
            optimized_file = compress_image(file)
            validated_data["file"] = optimized_file

        # =========================
        # VIDEO COMPRESSION
        # =========================

        elif media_type == SpotMedia.MediaType.VIDEO:
            optimized_file = compress_video(file)
            validated_data["file"] = optimized_file

        return super().create(validated_data)


# =========================
# AUDIT LOG SERIALIZER
# =========================

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
