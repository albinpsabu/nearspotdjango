
from rest_framework.permissions import BasePermission

from .models import User


class IsUser(BasePermission):
    """
    Allows access only to authenticated normal USER accounts.
    """

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role == User.Role.USER
        )


class IsEmployee(BasePermission):
    """
    Allows access only to authenticated EMPLOYEE accounts.
    """

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role == User.Role.EMPLOYEE
        )


class IsAdmin(BasePermission):
    """
    Allows access only to authenticated ADMIN accounts.
    """

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role == User.Role.ADMIN
        )


class IsAdminOrEmployee(BasePermission):
    """
    Allows access to authenticated ADMIN and EMPLOYEE accounts.

    WARNING:
    This checks the role only. It does not check individual
    employee feature permissions.

    Do not use it alone for endpoints that require granular
    employee authorization.
    """

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role in [
                User.Role.ADMIN,
                User.Role.EMPLOYEE,
            ]
        )


class HasFeaturePermission(BasePermission):
    """
    Enforces granular feature permissions.

    ADMIN:
        Always allowed; bypasses employee feature assignments.

    EMPLOYEE:
        Must have the permission specified by the view's
        required_permission attribute.

    USER:
        Denied access.

    Missing permission configuration:
        Access is denied by default.
    """

    message = "You do not have permission to perform this action."

    def has_permission(self, request, view):
        user = request.user

        # Reject unauthenticated requests.
        if not user or not user.is_authenticated:
            return False

        # Admins retain full application access.
        if user.role == User.Role.ADMIN:
            return True

        # Only employees can use employee feature permissions.
        if user.role != User.Role.EMPLOYEE:
            return False

        # Each protected view must declare its required permission.
        required_permission = getattr(
            view,
            "required_permission",
            None,
        )

        # Fail closed when no permission is configured.
        if not required_permission:
            return False

        # Check the current database assignments on every request.
        return user.feature_permissions.filter(
            key=required_permission,
            is_active=True,
        ).exists()
