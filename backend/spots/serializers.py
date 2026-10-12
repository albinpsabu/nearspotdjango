
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
    Review,
    SavedSpot,
    ReviewMedia,
    ExternalPlace,
    SavedExternalPlace,
    ExternalPlaceReview,
)


# ============================================================
# 1. CATEGORY SERIALIZER
# ============================================================

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


# ============================================================
# 2. HIDDEN SPOT SERIALIZER
# ============================================================
# Used when users submit new hidden spots.

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

        # GeoDjango Point uses longitude before latitude.
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


# ============================================================
# 3. PENDING SPOT SERIALIZER
# ============================================================
# Provides employee moderation details and uploaded media.

class PendingSpotSerializer(serializers.ModelSerializer):

    category_name = serializers.CharField(
        source="category.name",
        read_only=True,
    )

    category_description = serializers.CharField(
        source="category.description",
        read_only=True,
    )

    submitted_by_name = serializers.CharField(
        source="submitted_by.name",
        read_only=True,
    )

    submitted_by_email = serializers.CharField(
        source="submitted_by.email",
        read_only=True,
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


# ============================================================
# 4. VERIFICATION SERIALIZER
# ============================================================

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


# ============================================================
# 5. APPROVED SPOT SERIALIZER
# ============================================================
# Used for public spot discovery and details.

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


# ============================================================
# 6. MY SPOT SERIALIZER
# ============================================================

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
# 7. REPORT SERIALIZER
# ============================================================
# Used for user reports and employee/admin report management.

class ReportSerializer(serializers.ModelSerializer):

    reported_by_name = serializers.CharField(
        source="reported_by.name",
        read_only=True,
    )

    reported_by_email = serializers.EmailField(
        source="reported_by.email",
        read_only=True,
    )

    spot_name = serializers.CharField(
        source="spot.name",
        read_only=True,
    )

    spot_category = serializers.CharField(
        source="spot.category.name",
        read_only=True,
    )

    spot_status = serializers.CharField(
        source="spot.status",
        read_only=True,
    )

    spot_description = serializers.CharField(
        source="spot.description",
        read_only=True,
    )

    spot_latitude = serializers.SerializerMethodField()
    spot_longitude = serializers.SerializerMethodField()

    class Meta:
        model = Report
        fields = [
            "id",
            "reason",
            "status",
            "created_at",
            "updated_at",
            "spot",
            "spot_name",
            "spot_category",
            "spot_status",
            "spot_description",
            "spot_latitude",
            "spot_longitude",
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

    def get_spot_latitude(self, obj):
        if not obj.spot.location:
            return None

        return obj.spot.location.y

    def get_spot_longitude(self, obj):
        if not obj.spot.location:
            return None

        return obj.spot.location.x

    def validate_spot(self, spot):
        if spot.status != HiddenSpot.Status.APPROVED:
            raise serializers.ValidationError(
                "Only approved spots can be reported."
            )

        return spot


# ============================================================
# 8. REPORT STATUS SERIALIZER
# ============================================================

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


# ============================================================
# 9. COMMUNITY VERIFICATION SERIALIZER
# ============================================================

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


# ============================================================
# 10. COMMUNITY SPOT SERIALIZER
# ============================================================

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


# ============================================================
# 11. COMMUNITY VERIFICATION SUMMARY
# ============================================================

class CommunityVerificationSummarySerializer(serializers.Serializer):

    confirm_count = serializers.IntegerField()
    report_count = serializers.IntegerField()
    community_status = serializers.CharField()


# ============================================================
# 12. SPOT MEDIA SERIALIZER
# ============================================================
# Validates image/video types and compresses uploaded files.

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

        if media_type == SpotMedia.MediaType.IMAGE:
            optimized_file = compress_image(file)
            validated_data["file"] = optimized_file

        elif media_type == SpotMedia.MediaType.VIDEO:
            optimized_file = compress_video(file)
            validated_data["file"] = optimized_file

        return super().create(validated_data)


# ============================================================
# 13. AUDIT LOG SERIALIZER
# ============================================================

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


# ============================================================
# 14. REVIEW MEDIA SERIALIZER
# ============================================================

class ReviewMediaSerializer(serializers.ModelSerializer):

    class Meta:
        model = ReviewMedia
        fields = [
            "id",
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

        if media_type == ReviewMedia.MediaType.IMAGE:
            allowed = [
                "image/jpeg",
                "image/png",
                "image/webp",
            ]

            if file.content_type not in allowed:
                raise serializers.ValidationError({
                    "file": "Only JPG, PNG, WEBP allowed."
                })

            if file.size > 10 * 1024 * 1024:
                raise serializers.ValidationError({
                    "file": "Image max 10MB."
                })

        elif media_type == ReviewMedia.MediaType.VIDEO:
            allowed = [
                "video/mp4",
                "video/webm",
                "video/quicktime",
            ]

            if file.content_type not in allowed:
                raise serializers.ValidationError({
                    "file": "Only MP4, WEBM, MOV allowed."
                })

            if file.size > 100 * 1024 * 1024:
                raise serializers.ValidationError({
                    "file": "Video max 100MB."
                })

        else:
            raise serializers.ValidationError({
                "media_type": "Must be IMAGE or VIDEO."
            })

        return attrs


# ============================================================
# 15. REVIEW SERIALIZER
# ============================================================
# Existing reviews for approved NearSpot submissions.

class ReviewSerializer(serializers.ModelSerializer):

    user_name = serializers.CharField(
        source="user.name",
        read_only=True,
    )

    user_email = serializers.EmailField(
        source="user.email",
        read_only=True,
    )

    spot_name = serializers.CharField(
        source="spot.name",
        read_only=True,
    )

    media = ReviewMediaSerializer(
        many=True,
        read_only=True,
    )

    media_files = serializers.ListField(
        child=serializers.FileField(),
        write_only=True,
        required=False,
    )

    media_types = serializers.ListField(
        child=serializers.ChoiceField(
            choices=ReviewMedia.MediaType.choices
        ),
        write_only=True,
        required=False,
    )

    class Meta:
        model = Review
        fields = [
            "id",
            "spot",
            "spot_name",
            "user",
            "user_name",
            "user_email",
            "rating",
            "comment",
            "created_at",
            "updated_at",
            "media",
            "media_files",
            "media_types",
        ]
        read_only_fields = [
            "id",
            "spot",
            "user",
            "user_name",
            "user_email",
            "spot_name",
            "created_at",
            "updated_at",
            "media",
        ]

    def validate_rating(self, value):
        if not 1 <= value <= 5:
            raise serializers.ValidationError(
                "Rating must be between 1 and 5."
            )

        return value

    def validate(self, attrs):
        media_files = attrs.get("media_files", [])
        media_types = attrs.get("media_types", [])

        if media_files and len(media_files) != len(media_types):
            raise serializers.ValidationError(
                "media_files and media_types must have same length."
            )

        return attrs

    def create(self, validated_data):
        media_files = validated_data.pop("media_files", [])
        media_types = validated_data.pop("media_types", [])

        validated_data["user"] = self.context["request"].user

        review = super().create(validated_data)

        for f, t in zip(media_files, media_types):
            ReviewMedia.objects.create(
                review=review,
                file=f,
                media_type=t,
            )

        return review

    def update(self, instance, validated_data):
        media_files = validated_data.pop(
            "media_files",
            None,
        )

        media_types = validated_data.pop(
            "media_types",
            None,
        )

        review = super().update(
            instance,
            validated_data,
        )

        # Replace existing media when new files are provided.
        if media_files is not None:
            review.media.all().delete()

            for f, t in zip(
                media_files,
                media_types or ["IMAGE"] * len(media_files),
            ):
                ReviewMedia.objects.create(
                    review=review,
                    file=f,
                    media_type=t,
                )

        return review


# ============================================================
# 16. SAVED SPOT SERIALIZER
# ============================================================
# Existing bookmarks for approved NearSpot submissions.

class SavedSpotSerializer(serializers.ModelSerializer):

    spot_name = serializers.CharField(
        source="spot.name",
        read_only=True,
    )

    spot_category = serializers.CharField(
        source="spot.category.name",
        read_only=True,
    )

    latitude = serializers.SerializerMethodField()
    longitude = serializers.SerializerMethodField()
    media = serializers.SerializerMethodField()

    class Meta:
        model = SavedSpot
        fields = [
            "id",
            "spot",
            "spot_name",
            "spot_category",
            "latitude",
            "longitude",
            "media",
            "saved_at",
        ]
        read_only_fields = [
            "id",
            "user",
            "spot_name",
            "spot_category",
            "latitude",
            "longitude",
            "media",
            "saved_at",
        ]

    def get_latitude(self, obj):
        return (
            obj.spot.location.y
            if obj.spot.location
            else None
        )

    def get_longitude(self, obj):
        return (
            obj.spot.location.x
            if obj.spot.location
            else None
        )

    def get_media(self, obj):
        request = self.context.get("request")
        media_list = []

        for media in obj.spot.media.all():
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

    def validate_spot(self, spot):
        if spot.status != HiddenSpot.Status.APPROVED:
            raise serializers.ValidationError(
                "Can only save approved spots."
            )

        return spot

    def create(self, validated_data):
        validated_data["user"] = self.context["request"].user

        return super().create(validated_data)


# ============================================================
# 17. SAVED SPOT LIST SERIALIZER
# ============================================================

class SavedSpotListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing saved spots."""

    spot_name = serializers.CharField(
        source="spot.name",
        read_only=True,
    )

    spot_category = serializers.CharField(
        source="spot.category.name",
        read_only=True,
    )

    latitude = serializers.SerializerMethodField()
    longitude = serializers.SerializerMethodField()

    class Meta:
        model = SavedSpot
        fields = [
            "id",
            "spot",
            "spot_name",
            "spot_category",
            "latitude",
            "longitude",
            "saved_at",
        ]
        read_only_fields = fields

    def get_latitude(self, obj):
        return (
            obj.spot.location.y
            if obj.spot.location
            else None
        )

    def get_longitude(self, obj):
        return (
            obj.spot.location.x
            if obj.spot.location
            else None
        )


# ============================================================
# 18. MY REVIEW SERIALIZER
# ============================================================

class MyReviewSerializer(serializers.ModelSerializer):
    """Lightweight serializer for user's own reviews."""

    spot_name = serializers.CharField(
        source="spot.name",
        read_only=True,
    )

    spot_category = serializers.CharField(
        source="spot.category.name",
        read_only=True,
    )

    latitude = serializers.SerializerMethodField()
    longitude = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = [
            "id",
            "spot",
            "spot_name",
            "spot_category",
            "latitude",
            "longitude",
            "rating",
            "comment",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_latitude(self, obj):
        return (
            obj.spot.location.y
            if obj.spot.location
            else None
        )

    def get_longitude(self, obj):
        return (
            obj.spot.location.x
            if obj.spot.location
            else None
        )


# ============================================================
# 19. EXTERNAL PLACE SERIALIZER
# ============================================================
# NEW: Read-only information about an OpenStreetMap place.
#
# Each place is identified by:
# - osm_type: node, way, or relation
# - osm_id: OpenStreetMap element ID
#
# The location is stored using a GeoDjango PointField.

class ExternalPlaceSerializer(serializers.ModelSerializer):

    latitude = serializers.SerializerMethodField()
    longitude = serializers.SerializerMethodField()

    class Meta:
        model = ExternalPlace
        fields = [
            "id",
            "osm_type",
            "osm_id",
            "name",
            "category",
            "address",
            "latitude",
            "longitude",
        ]
        read_only_fields = fields

    def get_latitude(self, obj):
        return (
            obj.location.y
            if obj.location
            else None
        )

    def get_longitude(self, obj):
        return (
            obj.location.x
            if obj.location
            else None
        )


# ============================================================
# 20. SAVED EXTERNAL PLACE SERIALIZER
# ============================================================
# NEW: Returns a saved OpenStreetMap place with its details.
#
# Saving and unsaving will be handled by authenticated views.

class SavedExternalPlaceSerializer(serializers.ModelSerializer):

    place = ExternalPlaceSerializer(
        read_only=True,
    )

    class Meta:
        model = SavedExternalPlace
        fields = [
            "id",
            "place",
            "saved_at",
        ]
        read_only_fields = fields



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
    Review,
    SavedSpot,
    ReviewMedia,
    ExternalPlace,
    SavedExternalPlace,
    ExternalPlaceReview,
)


# ============================================================
# 1. CATEGORY SERIALIZER
# ============================================================

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


# ============================================================
# 2. HIDDEN SPOT SERIALIZER
# ============================================================
# Used when users submit new hidden spots.

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

        # GeoDjango Point uses longitude before latitude.
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


# ============================================================
# 3. PENDING SPOT SERIALIZER
# ============================================================
# Provides employee moderation details and uploaded media.

class PendingSpotSerializer(serializers.ModelSerializer):

    category_name = serializers.CharField(
        source="category.name",
        read_only=True,
    )

    category_description = serializers.CharField(
        source="category.description",
        read_only=True,
    )

    submitted_by_name = serializers.CharField(
        source="submitted_by.name",
        read_only=True,
    )

    submitted_by_email = serializers.CharField(
        source="submitted_by.email",
        read_only=True,
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


# ============================================================
# 4. VERIFICATION SERIALIZER
# ============================================================

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


# ============================================================
# 5. APPROVED SPOT SERIALIZER
# ============================================================
# Used for public spot discovery and details.

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


# ============================================================
# 6. MY SPOT SERIALIZER
# ============================================================

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
# 7. REPORT SERIALIZER
# ============================================================
# Used for user reports and employee/admin report management.

class ReportSerializer(serializers.ModelSerializer):

    reported_by_name = serializers.CharField(
        source="reported_by.name",
        read_only=True,
    )

    reported_by_email = serializers.EmailField(
        source="reported_by.email",
        read_only=True,
    )

    spot_name = serializers.CharField(
        source="spot.name",
        read_only=True,
    )

    spot_category = serializers.CharField(
        source="spot.category.name",
        read_only=True,
    )

    spot_status = serializers.CharField(
        source="spot.status",
        read_only=True,
    )

    spot_description = serializers.CharField(
        source="spot.description",
        read_only=True,
    )

    spot_latitude = serializers.SerializerMethodField()
    spot_longitude = serializers.SerializerMethodField()

    class Meta:
        model = Report
        fields = [
            "id",
            "reason",
            "status",
            "created_at",
            "updated_at",
            "spot",
            "spot_name",
            "spot_category",
            "spot_status",
            "spot_description",
            "spot_latitude",
            "spot_longitude",
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

    def get_spot_latitude(self, obj):
        if not obj.spot.location:
            return None

        return obj.spot.location.y

    def get_spot_longitude(self, obj):
        if not obj.spot.location:
            return None

        return obj.spot.location.x

    def validate_spot(self, spot):
        if spot.status != HiddenSpot.Status.APPROVED:
            raise serializers.ValidationError(
                "Only approved spots can be reported."
            )

        return spot


# ============================================================
# 8. REPORT STATUS SERIALIZER
# ============================================================

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


# ============================================================
# 9. COMMUNITY VERIFICATION SERIALIZER
# ============================================================

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


# ============================================================
# 10. COMMUNITY SPOT SERIALIZER
# ============================================================

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


# ============================================================
# 11. COMMUNITY VERIFICATION SUMMARY
# ============================================================

class CommunityVerificationSummarySerializer(serializers.Serializer):

    confirm_count = serializers.IntegerField()
    report_count = serializers.IntegerField()
    community_status = serializers.CharField()


# ============================================================
# 12. SPOT MEDIA SERIALIZER
# ============================================================
# Validates image/video types and compresses uploaded files.

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

        if media_type == SpotMedia.MediaType.IMAGE:
            optimized_file = compress_image(file)
            validated_data["file"] = optimized_file

        elif media_type == SpotMedia.MediaType.VIDEO:
            optimized_file = compress_video(file)
            validated_data["file"] = optimized_file

        return super().create(validated_data)


# ============================================================
# 13. AUDIT LOG SERIALIZER
# ============================================================

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


# ============================================================
# 14. REVIEW MEDIA SERIALIZER
# ============================================================

class ReviewMediaSerializer(serializers.ModelSerializer):

    class Meta:
        model = ReviewMedia
        fields = [
            "id",
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

        if media_type == ReviewMedia.MediaType.IMAGE:
            allowed = [
                "image/jpeg",
                "image/png",
                "image/webp",
            ]

            if file.content_type not in allowed:
                raise serializers.ValidationError({
                    "file": "Only JPG, PNG, WEBP allowed."
                })

            if file.size > 10 * 1024 * 1024:
                raise serializers.ValidationError({
                    "file": "Image max 10MB."
                })

        elif media_type == ReviewMedia.MediaType.VIDEO:
            allowed = [
                "video/mp4",
                "video/webm",
                "video/quicktime",
            ]

            if file.content_type not in allowed:
                raise serializers.ValidationError({
                    "file": "Only MP4, WEBM, MOV allowed."
                })

            if file.size > 100 * 1024 * 1024:
                raise serializers.ValidationError({
                    "file": "Video max 100MB."
                })

        else:
            raise serializers.ValidationError({
                "media_type": "Must be IMAGE or VIDEO."
            })

        return attrs


# ============================================================
# 15. REVIEW SERIALIZER
# ============================================================
# Existing reviews for approved NearSpot submissions.

class ReviewSerializer(serializers.ModelSerializer):

    user_name = serializers.CharField(
        source="user.name",
        read_only=True,
    )

    user_email = serializers.EmailField(
        source="user.email",
        read_only=True,
    )

    spot_name = serializers.CharField(
        source="spot.name",
        read_only=True,
    )

    media = ReviewMediaSerializer(
        many=True,
        read_only=True,
    )

    media_files = serializers.ListField(
        child=serializers.FileField(),
        write_only=True,
        required=False,
    )

    media_types = serializers.ListField(
        child=serializers.ChoiceField(
            choices=ReviewMedia.MediaType.choices
        ),
        write_only=True,
        required=False,
    )

    class Meta:
        model = Review
        fields = [
            "id",
            "spot",
            "spot_name",
            "user",
            "user_name",
            "user_email",
            "rating",
            "comment",
            "created_at",
            "updated_at",
            "media",
            "media_files",
            "media_types",
        ]
        read_only_fields = [
            "id",
            "spot",
            "user",
            "user_name",
            "user_email",
            "spot_name",
            "created_at",
            "updated_at",
            "media",
        ]

    def validate_rating(self, value):
        if not 1 <= value <= 5:
            raise serializers.ValidationError(
                "Rating must be between 1 and 5."
            )

        return value

    def validate(self, attrs):
        media_files = attrs.get("media_files", [])
        media_types = attrs.get("media_types", [])

        if media_files and len(media_files) != len(media_types):
            raise serializers.ValidationError(
                "media_files and media_types must have same length."
            )

        return attrs

    def create(self, validated_data):
        media_files = validated_data.pop("media_files", [])
        media_types = validated_data.pop("media_types", [])

        validated_data["user"] = self.context["request"].user

        review = super().create(validated_data)

        for f, t in zip(media_files, media_types):
            ReviewMedia.objects.create(
                review=review,
                file=f,
                media_type=t,
            )

        return review

    def update(self, instance, validated_data):
        media_files = validated_data.pop(
            "media_files",
            None,
        )

        media_types = validated_data.pop(
            "media_types",
            None,
        )

        review = super().update(
            instance,
            validated_data,
        )

        # Replace existing media when new files are provided.
        if media_files is not None:
            review.media.all().delete()

            for f, t in zip(
                media_files,
                media_types or ["IMAGE"] * len(media_files),
            ):
                ReviewMedia.objects.create(
                    review=review,
                    file=f,
                    media_type=t,
                )

        return review


# ============================================================
# 16. SAVED SPOT SERIALIZER
# ============================================================
# Existing bookmarks for approved NearSpot submissions.

class SavedSpotSerializer(serializers.ModelSerializer):

    spot_name = serializers.CharField(
        source="spot.name",
        read_only=True,
    )

    spot_category = serializers.CharField(
        source="spot.category.name",
        read_only=True,
    )

    latitude = serializers.SerializerMethodField()
    longitude = serializers.SerializerMethodField()
    media = serializers.SerializerMethodField()

    class Meta:
        model = SavedSpot
        fields = [
            "id",
            "spot",
            "spot_name",
            "spot_category",
            "latitude",
            "longitude",
            "media",
            "saved_at",
        ]
        read_only_fields = [
            "id",
            "user",
            "spot_name",
            "spot_category",
            "latitude",
            "longitude",
            "media",
            "saved_at",
        ]

    def get_latitude(self, obj):
        return (
            obj.spot.location.y
            if obj.spot.location
            else None
        )

    def get_longitude(self, obj):
        return (
            obj.spot.location.x
            if obj.spot.location
            else None
        )

    def get_media(self, obj):
        request = self.context.get("request")
        media_list = []

        for media in obj.spot.media.all():
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

    def validate_spot(self, spot):
        if spot.status != HiddenSpot.Status.APPROVED:
            raise serializers.ValidationError(
                "Can only save approved spots."
            )

        return spot

    def create(self, validated_data):
        validated_data["user"] = self.context["request"].user

        return super().create(validated_data)


# ============================================================
# 17. SAVED SPOT LIST SERIALIZER
# ============================================================

class SavedSpotListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing saved spots."""

    spot_name = serializers.CharField(
        source="spot.name",
        read_only=True,
    )

    spot_category = serializers.CharField(
        source="spot.category.name",
        read_only=True,
    )

    latitude = serializers.SerializerMethodField()
    longitude = serializers.SerializerMethodField()

    class Meta:
        model = SavedSpot
        fields = [
            "id",
            "spot",
            "spot_name",
            "spot_category",
            "latitude",
            "longitude",
            "saved_at",
        ]
        read_only_fields = fields

    def get_latitude(self, obj):
        return (
            obj.spot.location.y
            if obj.spot.location
            else None
        )

    def get_longitude(self, obj):
        return (
            obj.spot.location.x
            if obj.spot.location
            else None
        )


# ============================================================
# 18. MY REVIEW SERIALIZER
# ============================================================

class MyReviewSerializer(serializers.ModelSerializer):
    """Lightweight serializer for user's own reviews."""

    spot_name = serializers.CharField(
        source="spot.name",
        read_only=True,
    )

    spot_category = serializers.CharField(
        source="spot.category.name",
        read_only=True,
    )

    latitude = serializers.SerializerMethodField()
    longitude = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = [
            "id",
            "spot",
            "spot_name",
            "spot_category",
            "latitude",
            "longitude",
            "rating",
            "comment",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_latitude(self, obj):
        return (
            obj.spot.location.y
            if obj.spot.location
            else None
        )

    def get_longitude(self, obj):
        return (
            obj.spot.location.x
            if obj.spot.location
            else None
        )


# ============================================================
# 19. EXTERNAL PLACE SERIALIZER
# ============================================================
# NEW: Read-only information about an OpenStreetMap place.
#
# Each place is identified by:
# - osm_type: node, way, or relation
# - osm_id: OpenStreetMap element ID
#
# The location is stored using a GeoDjango PointField.

class ExternalPlaceSerializer(serializers.ModelSerializer):

    latitude = serializers.SerializerMethodField()
    longitude = serializers.SerializerMethodField()

    class Meta:
        model = ExternalPlace
        fields = [
            "id",
            "osm_type",
            "osm_id",
            "name",
            "category",
            "address",
            "latitude",
            "longitude",
        ]
        read_only_fields = fields

    def get_latitude(self, obj):
        return (
            obj.location.y
            if obj.location
            else None
        )

    def get_longitude(self, obj):
        return (
            obj.location.x
            if obj.location
            else None
        )


# ============================================================
# 20. SAVED EXTERNAL PLACE SERIALIZER
# ============================================================
# NEW: Returns a saved OpenStreetMap place with its details.
#
# Saving and unsaving will be handled by authenticated views.

class SavedExternalPlaceSerializer(serializers.ModelSerializer):

    place = ExternalPlaceSerializer(
        read_only=True,
    )

    class Meta:
        model = SavedExternalPlace
        fields = [
            "id",
            "place",
            "saved_at",
        ]
        read_only_fields = fields


# ============================================================
# 21. EXTERNAL PLACE REVIEW SERIALIZER
# ============================================================
# NEW: Handles NearSpot reviews for ordinary map places.
#
# The API view must assign the authenticated user and place.
# Reviews are stored in NearSpot, not OpenStreetMap.


class ExternalPlaceReviewSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(
        source="user_id",
        read_only=True,
    )

    user_name = serializers.CharField(
        source="user.name",
        read_only=True,
    )

    class Meta:
        model = ExternalPlaceReview

        fields = [
            "id",
            "place",
            "user_id",
            "user_name",
            "rating",
            "comment",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "place",
            "user_id",
            "user_name",
            "created_at",
            "updated_at",
        ]

    def validate_rating(self, value):
        if not 1 <= value <= 5:
            raise serializers.ValidationError(
                "Rating must be between 1 and 5."
            )

        return value



# ============================================================
# 22. MY EXTERNAL REVIEW SERIALIZER
# ============================================================
# Returns the logged-in user's reviews along with
# the associated OpenStreetMap place information.

class MyExternalReviewSerializer(serializers.ModelSerializer):

    place = ExternalPlaceSerializer(
        read_only=True,
    )

    class Meta:
        model = ExternalPlaceReview

        fields = [
            "id",
            "place",
            "rating",
            "comment",
            "created_at",
            "updated_at",
        ]

        read_only_fields = fields
