from rest_framework import generics#generics is a prebuilt classes that provides common crud api operations
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView#used for custom api views
from rest_framework import status#for http status codes
from .models import PasswordResetToken#import the password reset token model

from .serializers import (
    RegisterSerializer,
    ProfileSerializer,
    EmployeeCreateSerializer,
    AdminUserSerializer,
    AdminUserStatusSerializer,
    ChangePasswordSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer
)


from .permissions import IsUser,IsAdmin
from .models import User


#user registration
class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]



#current user information view
class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({
            "id": request.user.id,
            "name": request.user.name,
            "email": request.user.email,
            "role": request.user.role,
        })#



#accessible only by the normal user accounts
class UserOnlyView(APIView):
    permission_classes = [IsUser]

    def get(self, request):
        return Response({
            "message": "You are a normal USER.",
            "role": request.user.role,
        })


#for the profile view
class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = ProfileSerializer(request.user)
        return Response(serializer.data)
    #we can update 
    def put(self, request):
        serializer = ProfileSerializer(
            request.user,
            data=request.data,
            partial=True
        )
        #checks whether the data is valid through the serializers
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)

        return Response(
            serializer.errors,
            status=400
        )



#for employee list and employee creation
class EmployeeListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAdmin]

    def get_serializer_class(self):
        if self.request.method == "GET":
            return AdminUserSerializer

        return EmployeeCreateSerializer

    def get_queryset(self):
        return User.objects.filter(
            role=User.Role.EMPLOYEE
        ).order_by("-created_at")

    

#for users 
class AdminUserListView(generics.ListAPIView):
    serializer_class = AdminUserSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        return User.objects.filter(
            role=User.Role.USER
        ).order_by("-created_at")



#for employees
class AdminEmployeeListView(generics.ListAPIView):
    serializer_class = AdminUserSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        return User.objects.filter(
            role=User.Role.EMPLOYEE
        ).order_by("-created_at")



#for admin list 
class AdminListView(generics.ListAPIView):
    serializer_class = AdminUserSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        return User.objects.filter(
            role=User.Role.ADMIN
        ).order_by("-created_at")



#for seeing the current user status
class AdminUserStatusView(APIView):
    permission_classes = [IsAdmin]
    #here pk is users primary key
    def patch(self, request, pk):
        try:
            user = User.objects.get(pk=pk)#try to find the requested user
        except User.DoesNotExist:
            return Response(
                {"error": "User not found."},
                status=404
            )

        if "is_active" not in request.data:#checking the is_active in the request body
            return Response(
                {"error": "is_active is required."},
                status=400
            )

        user.is_active = request.data["is_active"]#update
        user.save(update_fields=["is_active"])

        return Response({
            "message": "User status updated successfully.",
            "user_id": user.id,
            "email": user.email,
            "role": user.role,
            "is_active": user.is_active,
        })



#view for the password change
class ChangePasswordView(generics.GenericAPIView):
    serializer_class = ChangePasswordSerializer
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = self.get_serializer(
            data=request.data,
            context={"request": request}
        )
        serializer.is_valid(raise_exception=True)

        request.user.set_password(
            serializer.validated_data["new_password"]
        )
        request.user.save()

        return Response(
            {"message": "Password changed successfully."},
            status=status.HTTP_200_OK
        )



#password reset request
class PasswordResetRequestView(generics.GenericAPIView):
    serializer_class = PasswordResetRequestSerializer
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        user = User.objects.get(email=email)

        # Invalidate previous unused tokens
        PasswordResetToken.objects.filter(
            user=user,
            used=False,
        ).update(used=True)

        # Create a new reset token
        reset_token = PasswordResetToken.objects.create(
            user=user
        )

        return Response(
            {
                "message": "Password reset token generated successfully.",
                "token": str(reset_token.token),
            },
            status=status.HTTP_200_OK,
        )



#Password reset confirmation
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
        user.save()

        reset_token.used = True
        reset_token.save(update_fields=["used"])

        return Response(
            {"message": "Password reset successfully."},
            status=status.HTTP_200_OK,
        )






# ============================================================
# ADMIN DASHBOARD STATISTICS
# ============================================================

from django.db.models import Count, Q

from spots.models import HiddenSpot, Category, Report


class AdminDashboardStatsView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        # ----------------------------------------------------
        # USER STATISTICS
        # ----------------------------------------------------

        users = User.objects.filter(
            role=User.Role.USER
        ).count()

        employees = User.objects.filter(
            role=User.Role.EMPLOYEE
        ).count()

        admins = User.objects.filter(
            role=User.Role.ADMIN
        ).count()

        # ----------------------------------------------------
        # HIDDEN SPOT STATISTICS
        # ----------------------------------------------------

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

        # ----------------------------------------------------
        # REPORT STATISTICS
        # ----------------------------------------------------

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

        # ----------------------------------------------------
        # CATEGORY STATISTICS
        # ----------------------------------------------------

        categories = Category.objects.count()

        # ----------------------------------------------------
        # RESPONSE
        # ----------------------------------------------------

        return Response({
            "users": users,
            "employees": employees,
            "admins": admins,
            "spots": spot_stats,
            "reports": report_stats,
            "categories": categories,
        })





# ============================================================
# ADMIN EMPLOYEE STATUS MANAGEMENT
# ============================================================

class AdminEmployeeStatusView(APIView):
    permission_classes = [IsAdmin]

    def patch(self, request, pk):
        try:
            employee = User.objects.get(
                pk=pk,
                role=User.Role.EMPLOYEE,
            )
        except User.DoesNotExist:
            return Response(
                {"error": "Employee not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = AdminUserStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        employee.is_active = serializer.validated_data["is_active"]
        employee.save(update_fields=["is_active"])

        return Response(
            {
                "message": "Employee status updated successfully.",
                "user_id": employee.id,
                "name": employee.name,
                "email": employee.email,
                "role": employee.role,
                "is_active": employee.is_active,
            },
            status=status.HTTP_200_OK,
        )
