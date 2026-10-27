from django.db import models
from django.contrib.gis.db import models as gis_models
from django.conf import settings



class Category(models.Model):

    name = models.CharField(
        max_length=100,
        unique=True
    )

    description = models.TextField(
        blank=True
    )

    is_active = models.BooleanField(
        default=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    def __str__(self):
        return self.name


class HiddenSpot(models.Model):

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        APPROVED = "APPROVED", "Approved"
        REJECTED = "REJECTED", "Rejected"
        CANCELLED = "CANCELLED", "Cancelled"

    name = models.CharField(
        max_length=200
    )

    description = models.TextField(
        blank=True
    )

    category = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,
        related_name="spots"
    )

    address = models.CharField(
        max_length=255,
        blank=False,
        null=False,
    )

    location = gis_models.PointField(
        geography=True,
        srid=4326
    )

    submitted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="submitted_spots"
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )

    rejection_reason = models.TextField(
        blank=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    def __str__(self):
        return self.name



class Verification(models.Model):

    class Action(models.TextChoices):
        APPROVED = "APPROVED", "Approved"
        REJECTED = "REJECTED", "Rejected"

    spot = models.ForeignKey(
        HiddenSpot,
        on_delete=models.CASCADE,
        related_name="verifications"
    )

    employee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="verifications"
    )

    action = models.CharField(
        max_length=20,
        choices=Action.choices
    )

    reason = models.TextField(
        blank=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    def __str__(self):
        return f"{self.spot.name} - {self.action}"



class Report(models.Model):

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        REVIEWED = "REVIEWED", "Reviewed"
        RESOLVED = "RESOLVED", "Resolved"

    spot = models.ForeignKey(
        HiddenSpot,
        on_delete=models.CASCADE,
        related_name="reports"
    )

    reported_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="reports"
    )

    reason = models.TextField()

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    def __str__(self):
        return f"{self.spot.name} - {self.status}"


class CommunityVerification(models.Model):
    class Action(models.TextChoices):
        CONFIRM = "CONFIRM", "Confirm"
        REPORT = "REPORT", "Report"

    spot = models.ForeignKey(
        HiddenSpot,
        on_delete=models.CASCADE,
        related_name="community_verifications"
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="community_verifications"
    )

    action = models.CharField(
        max_length=20,
        choices=Action.choices
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["spot", "user"],
                name="unique_community_verification_per_user"
            )
        ]

    def __str__(self):
        return f"{self.user.email} - {self.spot.name} - {self.action}"

class SpotMedia(models.Model):
    class MediaType(models.TextChoices):
        IMAGE = "IMAGE", "Image"
        VIDEO = "VIDEO", "Video"

    spot = models.ForeignKey(
        HiddenSpot,
        on_delete=models.CASCADE,
        related_name="media"
    )
    file = models.FileField(upload_to="spots/")
    media_type = models.CharField(
        max_length=10,
        choices=MediaType.choices
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.spot.name} - {self.media_type} - {self.id}"


class AuditLog(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs",
    )
    action = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.action} - {self.user}"



# Need to add to spots/models.py
# Add to backend/spots/models.py

class Review(models.Model):
    class Rating(models.IntegerChoices):
        ONE = 1, "1"
        TWO = 2, "2"
        THREE = 3, "3"
        FOUR = 4, "4"
        FIVE = 5, "5"

    spot = models.ForeignKey(
        HiddenSpot,
        on_delete=models.CASCADE,
        related_name="reviews"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="reviews"
    )
    rating = models.IntegerField(choices=Rating.choices)
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["spot", "user"],
                name="unique_review_per_user_per_spot"
            )
        ]
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.email} - {self.spot.name} - {self.rating}/5"


class SavedSpot(models.Model):
    spot = models.ForeignKey(
        HiddenSpot,
        on_delete=models.CASCADE,
        related_name="saved_by_users"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="saved_spots"
    )
    saved_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["spot", "user"],
                name="unique_saved_spot_per_user"
            )
        ]
        ordering = ["-saved_at"]

    def __str__(self):
        return f"{self.user.email} saved {self.spot.name}"




class ReviewMedia(models.Model):
    class MediaType(models.TextChoices):
        IMAGE = "IMAGE", "Image"
        VIDEO = "VIDEO", "Video"

    review = models.ForeignKey(
        Review,
        on_delete=models.CASCADE,
        related_name="media"
    )
    file = models.FileField(upload_to="reviews/")
    media_type = models.CharField(max_length=10, choices=MediaType.choices)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Review {self.review.id} - {self.media_type}"










# ============================================================
# EXTERNAL MAP PLACES
# ============================================================
# Places imported from OpenStreetMap.
# These are separate from user-submitted HiddenSpot records.


class ExternalPlace(models.Model):

    # OpenStreetMap identifies features as nodes, ways,
    # or relations. The ID is unique within each type.
    class OSMType(models.TextChoices):
        NODE = "node", "Node"
        WAY = "way", "Way"
        RELATION = "relation", "Relation"

    osm_type = models.CharField(
        max_length=10,
        choices=OSMType.choices
    )

    osm_id = models.BigIntegerField()

    name = models.CharField(max_length=255)

    category = models.CharField(
        max_length=100,
        blank=True
    )

    address = models.TextField(blank=True)

    # Store the geographic location using GeoDjango.
    location = gis_models.PointField(
        geography=True,
        srid=4326
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            # Prevent duplicate records for the same OSM place.
            models.UniqueConstraint(
                fields=["osm_type", "osm_id"],
                name="unique_external_osm_place"
            )
        ]

    def __str__(self):
        return self.name


# ============================================================
# SAVED EXTERNAL PLACES
# ============================================================
# Each user can bookmark an external place only once.


class SavedExternalPlace(models.Model):

    place = models.ForeignKey(
        ExternalPlace,
        on_delete=models.CASCADE,
        related_name="saved_by_users"
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="saved_external_places"
    )

    saved_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["place", "user"],
                name="unique_saved_external_place_per_user"
            )
        ]
        ordering = ["-saved_at"]

    def __str__(self):
        return f"{self.user.email} saved {self.place.name}"


# ============================================================
# EXTERNAL PLACE REVIEWS
# ============================================================
# NearSpot users can rate and review recognized map places.
# These reviews are stored in NearSpot, not OpenStreetMap.


class ExternalPlaceReview(models.Model):

    place = models.ForeignKey(
        ExternalPlace,
        on_delete=models.CASCADE,
        related_name="reviews"
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="external_place_reviews"
    )

    # Ratings must be between 1 and 5.
    rating = models.PositiveSmallIntegerField(
        choices=Review.Rating.choices
    )

    comment = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            # One review per user per external place.
            models.UniqueConstraint(
                fields=["place", "user"],
                name="unique_external_place_review_per_user"
            ),

            # Enforce the valid rating range in the database.
            models.CheckConstraint(
                condition=models.Q(rating__gte=1, rating__lte=5),
                name="external_place_rating_1_to_5"
            )
        ]
        ordering = ["-created_at"]

    def __str__(self):
        return (
            f"{self.user.email} - "
            f"{self.place.name} - {self.rating}/5"
        )








# ============================================================
# OSM DISCOVERY AREA CACHE
# ============================================================

class OSMDiscoveryArea(models.Model):
    """
    Tracks geographic areas already fetched from OpenStreetMap.

    This allows NearSpot to reuse previously discovered
    places instead of repeatedly requesting Overpass.
    """

    south = models.FloatField()
    west = models.FloatField()
    north = models.FloatField()
    east = models.FloatField()

    # Stores normalized OSM place data for this area.
    places = models.JSONField(default=list)

    # Indicates when the cached area was fetched.
    fetched_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(
                fields=["south", "west", "north", "east"]
            ),
            models.Index(fields=["fetched_at"]),
        ]

    def __str__(self):
        return (
            f"OSM Area: "
            f"{self.south}, {self.west} → "
            f"{self.north}, {self.east}"
        )





class Notification(models.Model):
    class NotificationType(models.TextChoices):
        SPOT_PENDING = "spot.pending", "Spot Pending"
        SPOT_APPROVED = "spot.approved", "Spot Approved"
        SPOT_REJECTED = "spot.rejected", "Spot Rejected"

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )

    notification_type = models.CharField(
        max_length=50,
        choices=NotificationType.choices,
    )

    title = models.CharField(max_length=200)
    message = models.TextField()

    spot = models.ForeignKey(
        HiddenSpot,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="notifications",
    )

    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.recipient} - {self.title}"
