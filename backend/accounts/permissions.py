from rest_framework.permissions import BasePermission

from .models import User


class IsUser(BasePermission):
    """
    Allows access only to normal USER accounts.
    """

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role == User.Role.USER
        )


class IsEmployee(BasePermission):
    """
    Allows access only to EMPLOYEE accounts.
    """

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role == User.Role.EMPLOYEE
        )


class IsAdmin(BasePermission):
    """
    Allows access only to ADMIN accounts.
    """

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role == User.Role.ADMIN
        )


class IsAdminOrEmployee(BasePermission):
    """
    Allows access to ADMIN and EMPLOYEE accounts.
    """

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role in [
                User.Role.ADMIN,
                User.Role.EMPLOYEE,
            ]
        )