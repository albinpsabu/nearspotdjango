
from django.db import transaction
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404

from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import User, PasswordResetToken, FeaturePermission
from .serializers import (
    RegisterSerializer,
    ProfileSerializer,
    EmployeeCreateSerializer,
    AdminUserSerializer,
    AdminUserStatusSerializer,
    ChangePasswordSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
    FeaturePermissionSerializer,
    EmployeePermissionUpdateSerializer,
)
from .permissions import IsUser, IsAdmin

from spots.models import HiddenSpot, Category, Report


# ============================================================
# USER REGISTRATION
# ============================================================

class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]


# ============================================================
# CURRENT USER INFORMATION
# ============================================================


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        permissions = []

        if user.role == User.Role.EMPLOYEE:
            permissions = list(
                user.feature_permissions.filter(
                    is_active=True
                ).values_list("key", flat=True)
            )

        return Response({
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "permissions": permissions,
        })


# ============================================================
# NORMAL USER ONLY
# ============================================================

class UserOnlyView(APIView):
    permission_classes = [IsUser]

    def get(self, request):
        return Response({
            "message": "You are a normal USER.",
            "role": request.user.role,
        })


# ============================================================
# PROFILE VIEW AND UPDATE
# ============================================================

class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = ProfileSerializer(request.user)
        return Response(serializer.data)

    def put(self, request):
        serializer = ProfileSerializer(
            request.user,
            data=request.data,
            partial=True,
        )

        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(serializer.data, status=status.HTTP_200_OK)


# ============================================================
# ADMIN: EMPLOYEE LIST AND CREATION
# ============================================================

class EmployeeListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get_serializer_class(self):
        if self.request.method == "GET":
            return AdminUserSerializer

        return EmployeeCreateSerializer

    def get_queryset(self):
        return User.objects.filter(
            role=User.Role.EMPLOYEE
        ).order_by("-created_at")


# ============================================================
# ADMIN: NORMAL USER LIST
# ============================================================

class AdminUserListView(generics.ListAPIView):
    serializer_class = AdminUserSerializer
    permission_classes = [IsAuthenticated, IsAdmin]

    def get_queryset(self):
        return User.objects.filter(
            role=User.Role.USER
        ).order_by("-created_at")


# ============================================================
# ADMIN: EMPLOYEE LIST
# ============================================================

class AdminEmployeeListView(generics.ListAPIView):
    serializer_class = AdminUserSerializer
    permission_classes = [IsAuthenticated, IsAdmin]

    def get_queryset(self):
        return User.objects.filter(
            role=User.Role.EMPLOYEE
        ).order_by("-created_at")


# ============================================================
# ADMIN: ADMIN LIST
# ============================================================

class AdminListView(generics.ListAPIView):
    serializer_class = AdminUserSerializer
    permission_classes = [IsAuthenticated, IsAdmin]

    def get_queryset(self):
        return User.objects.filter(
            role=User.Role.ADMIN
        ).order_by("-created_at")


# ============================================================
# ADMIN: UPDATE USER STATUS
# ============================================================

class AdminUserStatusView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def patch(self, request, pk):
        user = get_object_or_404(User, pk=pk)

        serializer = AdminUserStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user.is_active = serializer.validated_data["is_active"]
        user.save(update_fields=["is_active"])

        return Response({
            "message": "User status updated successfully.",
            "user_id": user.id,
            "email": user.email,
            "role": user.role,
            "is_active": user.is_active,
        }, status=status.HTTP_200_OK)


# ============================================================
# CHANGE PASSWORD
# ============================================================

class ChangePasswordView(generics.GenericAPIView):
    serializer_class = ChangePasswordSerializer
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = self.get_serializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)

        request.user.set_password(
            serializer.validated_data["new_password"]
        )
        request.user.save(update_fields=["password"])

        return Response(
            {"message": "Password changed successfully."},
            status=status.HTTP_200_OK,
        )


# ============================================================
# PASSWORD RESET REQUEST
# ============================================================

class PasswordResetRequestView(generics.GenericAPIView):
    serializer_class = PasswordResetRequestSerializer
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        user = User.objects.get(email=email)

        # Invalidate previous unused tokens.
        PasswordResetToken.objects.filter(
            user=user,
            used=False,
        ).update(used=True)

        # Create a new reset token.
        reset_token = PasswordResetToken.objects.create(user=user)

        return Response({
            "message": "Password reset token generated successfully.",
            "token": str(reset_token.token),
        }, status=status.HTTP_200_OK)


# ============================================================
# PASSWORD RESET CONFIRMATION
# ============================================================

class PasswordResetConfirmView(generics.GenericAPIView):
    serializer_class = PasswordResetConfirmSerializer
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        reset_token = serializer.validated_data["reset_token"]
        new_password = serializer.validated_data["new_password"]

        user = reset_token.user
        user.set_password(new_password)
        user.save(update_fields=["password"])

        reset_token.used = True
        reset_token.save(update_fields=["used"])

        return Response(
            {"message": "Password reset successfully."},
            status=status.HTTP_200_OK,
        )


# ============================================================
# ADMIN DASHBOARD STATISTICS
# ============================================================

class AdminDashboardStatsView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        users = User.objects.filter(
            role=User.Role.USER
        ).count()

        employees = User.objects.filter(
            role=User.Role.EMPLOYEE
        ).count()

        admins = User.objects.filter(
            role=User.Role.ADMIN
        ).count()

        spot_stats = HiddenSpot.objects.aggregate(
            total=Count("id"),
            pending=Count(
                "id",
                filter=Q(status=HiddenSpot.Status.PENDING),
            ),
            approved=Count(
                "id",
                filter=Q(status=HiddenSpot.Status.APPROVED),
            ),
            rejected=Count(
                "id",
                filter=Q(status=HiddenSpot.Status.REJECTED),
            ),
            cancelled=Count(
                "id",
                filter=Q(status=HiddenSpot.Status.CANCELLED),
            ),
        )

        report_stats = Report.objects.aggregate(
            total=Count("id"),
            pending=Count(
                "id",
                filter=Q(status=Report.Status.PENDING),
            ),
            reviewed=Count(
                "id",
                filter=Q(status=Report.Status.REVIEWED),
            ),
            resolved=Count(
                "id",
                filter=Q(status=Report.Status.RESOLVED),
            ),
        )

        categories = Category.objects.count()

        return Response({
            "users": users,
            "employees": employees,
            "admins": admins,
            "spots": spot_stats,
            "reports": report_stats,
            "categories": categories,
        })


# ============================================================
# ADMIN: UPDATE EMPLOYEE STATUS
# ============================================================

class AdminEmployeeStatusView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def patch(self, request, pk):
        employee = get_object_or_404(
            User,
            pk=pk,
            role=User.Role.EMPLOYEE,
        )

        serializer = AdminUserStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        employee.is_active = serializer.validated_data["is_active"]
        employee.save(update_fields=["is_active"])

        return Response({
            "message": "Employee status updated successfully.",
            "user_id": employee.id,
            "name": employee.name,
            "email": employee.email,
            "role": employee.role,
            "is_active": employee.is_active,
        }, status=status.HTTP_200_OK)


# ============================================================
# ADMIN: AVAILABLE FEATURE PERMISSIONS
# ============================================================

class AdminPermissionCatalogueView(generics.ListAPIView):
    """
    Returns active feature permissions that administrators
    can assign to employees.
    """

    serializer_class = FeaturePermissionSerializer
    permission_classes = [IsAuthenticated, IsAdmin]

    def get_queryset(self):
        return FeaturePermission.objects.filter(
            is_active=True
        ).order_by("group", "name")


# ============================================================
# ADMIN: VIEW AND UPDATE EMPLOYEE PERMISSIONS
# ============================================================

class AdminEmployeePermissionsView(APIView):
    """
    GET:
        Retrieve an employee and their assigned permission keys.

    PUT:
        Replace the employee's complete permission assignment.
        An empty list removes all assigned permissions.
    """

    permission_classes = [IsAuthenticated, IsAdmin]

    def get_employee(self, pk):
        return get_object_or_404(
            User,
            pk=pk,
            role=User.Role.EMPLOYEE,
        )

    def get(self, request, pk):
        employee = self.get_employee(pk)

        permissions = employee.feature_permissions.filter(
            is_active=True
        ).order_by("key")

        return Response({
            "employee": {
                "id": employee.id,
                "name": employee.name,
                "email": employee.email,
                "role": employee.role,
            },
            "permissions": list(
                permissions.values_list("key", flat=True)
            ),
        }, status=status.HTTP_200_OK)

    @transaction.atomic
    def put(self, request, pk):
        employee = self.get_employee(pk)

        serializer = EmployeePermissionUpdateSerializer(
            data=request.data
        )
        serializer.is_valid(raise_exception=True)

        # Replace all assigned permissions with the validated list.
        employee.feature_permissions.set(
            serializer.validated_data["permissions"]
        )

        assigned_permissions = employee.feature_permissions.filter(
            is_active=True
        ).order_by("key")

        return Response({
            "message": "Employee permissions updated successfully.",
            "employee_id": employee.id,
            "permissions": list(
                assigned_permissions.values_list("key", flat=True)
            ),
        }, status=status.HTTP_200_OK)
