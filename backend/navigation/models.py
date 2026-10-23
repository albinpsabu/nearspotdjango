from django.conf import settings
from django.db import models


class NavigationSession(models.Model):

    class TravelMode(models.TextChoices):
        DRIVING = "driving", "Driving"
        WALKING = "walking", "Walking"
        CYCLING = "cycling", "Cycling"

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="navigation_sessions"
    )

    destination_latitude = models.FloatField()
    destination_longitude = models.FloatField()

    travel_mode = models.CharField(
        max_length=10,
        choices=TravelMode.choices,
        default=TravelMode.DRIVING
    )

    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.ACTIVE
    )

    started_at = models.DateTimeField(auto_now_add=True)

    ended_at = models.DateTimeField(
        null=True,
        blank=True
    )

    def __str__(self):
        return f"Navigation {self.id} - {self.user}"