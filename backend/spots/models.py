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