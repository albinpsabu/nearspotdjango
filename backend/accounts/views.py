from rest_framework import generics
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import RegisterSerializer,ProfileSerializer,EmployeeCreateSerializer,AdminUserSerializer
from .permissions import IsUser,IsAdmin
from .models import User


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({
            "id": request.user.id,
            "name": request.user.name,
            "email": request.user.email,
            "role": request.user.role,
        })


class UserOnlyView(APIView):
    permission_classes = [IsUser]

    def get(self, request):
        return Response({
            "message": "You are a normal USER.",
            "role": request.user.role,
        })



class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = ProfileSerializer(request.user)
        return Response(serializer.data)

    def put(self, request):
        serializer = ProfileSerializer(
            request.user,
            data=request.data,
            partial=True
        )

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)

        return Response(
            serializer.errors,
            status=400
        )

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




class AdminUserStatusView(APIView):
    permission_classes = [IsAdmin]

    def patch(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response(
                {"error": "User not found."},
                status=404
            )

        if "is_active" not in request.data:
            return Response(
                {"error": "is_active is required."},
                status=400
            )

        user.is_active = request.data["is_active"]
        user.save(update_fields=["is_active"])

        return Response({
            "message": "User status updated successfully.",
            "user_id": user.id,
            "email": user.email,
            "role": user.role,
            "is_active": user.is_active,
        })

    