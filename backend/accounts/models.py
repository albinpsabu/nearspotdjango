
import uuid
from datetime import timedelta

from django.utils import timezone
from django.contrib.auth.models import (
    AbstractBaseUser,
    BaseUserManager,
    PermissionsMixin,
)
from django.db import models


class UserManager(BaseUserManager):

    def create_user(self, email, name, password=None, **extra_fields):
        if not email:
            raise ValueError("Email is required")

        email = self.normalize_email(email)

        user = self.model(
            email=email,
            name=name,
            **extra_fields,
        )

        user.set_password(password)
        user.save(using=self._db)

        return user

    def create_superuser(self, email, name, password=None, **extra_fields):
        extra_fields.setdefault("role", User.Role.ADMIN)
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)

        if extra_fields.get("role") != User.Role.ADMIN:
            raise ValueError("Superuser must have the ADMIN role")

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True")

        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True")

        return self.create_user(
            email=email,
            name=name,
            password=password,
            **extra_fields,
        )


class User(AbstractBaseUser, PermissionsMixin):

    class Role(models.TextChoices):
        USER = "USER", "User"
        EMPLOYEE = "EMPLOYEE", "Employee"
        ADMIN = "ADMIN", "Admin"

    name = models.CharField(max_length=150)

    email = models.EmailField(unique=True)

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.USER,
    )

    is_active = models.BooleanField(default=True)

    is_staff = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    # Granular application permissions.
    # New users receive no feature permissions automatically.
    feature_permissions = models.ManyToManyField(
        "FeaturePermission",
        blank=True,
        related_name="assigned_users",
    )

    objects = UserManager()

    # Authenticate using email instead of username.
    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["name"]

    def __str__(self):
        return f"{self.name} ({self.email})"


class FeaturePermission(models.Model):
    """
    Catalogue of granular application permissions.

    Examples:
        spots.view_pending
        spots.approve
        spots.reject
        reports.view
    """

    key = models.CharField(
        max_length=100,
        unique=True,
    )

    name = models.CharField(max_length=150)

    group = models.CharField(max_length=100)

    description = models.CharField(
        max_length=255,
        blank=True,
    )

    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["group", "name"]
        verbose_name = "Feature Permission"
        verbose_name_plural = "Feature Permissions"

    def __str__(self):
        return f"{self.group}: {self.name}"


class PasswordResetToken(models.Model):

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="password_reset_tokens",
    )

    token = models.UUIDField(
        unique=True,
        default=uuid.uuid4,
        editable=False,
    )

    created_at = models.DateTimeField(auto_now_add=True)

    used = models.BooleanField(default=False)

    def is_expired(self):
        return timezone.now() > (
            self.created_at + timedelta(minutes=30)
        )

    def __str__(self):
        return f"Password reset token for {self.user.email}"
