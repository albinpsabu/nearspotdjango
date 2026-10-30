
from rest_framework import serializers

from .models import User, PasswordResetToken, FeaturePermission


# Registering a new user
class RegisterSerializer(serializers.ModelSerializer):

    password = serializers.CharField(
        write_only=True,
        min_length=8,
    )

    class Meta:
        model = User
        fields = [
            "name",
            "email",
            "password",
        ]

    def create(self, validated_data):
        user = User.objects.create_user(
            name=validated_data["name"],
            email=validated_data["email"],
            password=validated_data["password"],
        )

        return user


# Profile viewing and updating
class ProfileSerializer(serializers.ModelSerializer):

    class Meta:
        model = User
        fields = [
            "id",
            "name",
            "email",
            "role",
            "created_at",
        ]

        read_only_fields = [
            "id",
            "role",
            "created_at",
        ]


# Creating a new employee
class EmployeeCreateSerializer(serializers.ModelSerializer):

    password = serializers.CharField(
        write_only=True,
        min_length=8,
    )

    class Meta:
        model = User
        fields = [
            "name",
            "email",
            "password",
        ]

    def create(self, validated_data):
        user = User.objects.create_user(
            name=validated_data["name"],
            email=validated_data["email"],
            password=validated_data["password"],
            role=User.Role.EMPLOYEE,
        )

        # New employees receive no feature permissions by default.
        return user


# Admin user management
class AdminUserSerializer(serializers.ModelSerializer):

    class Meta:
        model = User
        fields = [
            "id",
            "name",
            "email",
            "role",
            "is_active",
            "created_at",
        ]

        read_only_fields = [
            "id",
            "created_at",
        ]


# Updating user or employee active status
class AdminUserStatusSerializer(serializers.Serializer):

    is_active = serializers.BooleanField()


# Changing the current user's password
class ChangePasswordSerializer(serializers.Serializer):

    current_password = serializers.CharField(
        write_only=True,
        required=True,
    )

    new_password = serializers.CharField(
        write_only=True,
        required=True,
        min_length=8,
    )

    def validate(self, attrs):
        user = self.context["request"].user

        if not user.check_password(attrs["current_password"]):
            raise serializers.ValidationError({
                "current_password": "Current password is incorrect."
            })

        if attrs["current_password"] == attrs["new_password"]:
            raise serializers.ValidationError({
                "new_password": (
                    "New password must be different from "
                    "the current password."
                )
            })

        return attrs


# Requesting a password reset
class PasswordResetRequestSerializer(serializers.Serializer):

    email = serializers.EmailField(required=True)

    def validate_email(self, value):
        value = value.lower()

        if not User.objects.filter(email=value).exists():
            raise serializers.ValidationError(
                "No account is registered with this email."
            )

        return value


# Confirming a password reset
class PasswordResetConfirmSerializer(serializers.Serializer):

    token = serializers.UUIDField(required=True)

    new_password = serializers.CharField(
        required=True,
        write_only=True,
        min_length=8,
    )

    def validate(self, attrs):
        try:
            reset_token = PasswordResetToken.objects.select_related(
                "user"
            ).get(
                token=attrs["token"],
                used=False,
            )

        except PasswordResetToken.DoesNotExist:
            raise serializers.ValidationError({
                "token": "Invalid or already used reset token."
            })

        if reset_token.is_expired():
            raise serializers.ValidationError({
                "token": "Reset token has expired."
            })

        attrs["reset_token"] = reset_token

        return attrs


# Listing available feature permissions for administrators
class FeaturePermissionSerializer(serializers.ModelSerializer):

    class Meta:
        model = FeaturePermission
        fields = [
            "id",
            "key",
            "name",
            "group",
            "description",
            "is_active",
        ]

        read_only_fields = fields


# Validating permission assignments to an employee
class EmployeePermissionUpdateSerializer(serializers.Serializer):

    permissions = serializers.ListField(
        child=serializers.CharField(
            max_length=100,
            trim_whitespace=True,
        ),
        allow_empty=True,
        required=True,
    )

    def validate_permissions(self, keys):
        # Prevent duplicate permission keys.
        if len(keys) != len(set(keys)):
            raise serializers.ValidationError(
                "Duplicate permissions are not allowed."
            )

        # Only existing, active permission keys can be assigned.
        available_permissions = FeaturePermission.objects.filter(
            key__in=keys,
            is_active=True,
        )

        permissions_by_key = {
            permission.key: permission
            for permission in available_permissions
        }

        invalid_keys = [
            key for key in keys
            if key not in permissions_by_key
        ]

        if invalid_keys:
            raise serializers.ValidationError({
                "invalid_permissions": invalid_keys,
                "detail": (
                    "One or more permission keys do not exist "
                    "or are inactive."
                ),
            })

        # Return model instances for employee.feature_permissions.set().
        return [
            permissions_by_key[key]
            for key in keys
        ]
