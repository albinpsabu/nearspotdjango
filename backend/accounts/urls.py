from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView

from .views import (
    RegisterView,
    MeView,
    UserOnlyView,
    ProfileView,
    EmployeeListCreateView,
    AdminUserListView,
    AdminListView,
    AdminUserStatusView,
)


urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", TokenObtainPairView.as_view(), name="login"),
    path("me/", MeView.as_view(), name="me"),
    path("user-only/", UserOnlyView.as_view(), name="user-only"),
    path("profile/", ProfileView.as_view(), name="profile"),

    # Employee management
    path(
        "employees/",
        EmployeeListCreateView.as_view(),
        name="employee-list-create",
    ),
    # User management
    path(
        "users/",
        AdminUserListView.as_view(),
        name="admin-users",
    ),

    # Admin management
    path(
        "admins/",
        AdminListView.as_view(),
        name="admin-list",
    ),
    #status management
    path(
    "users/<int:pk>/status/",
    AdminUserStatusView.as_view(),
    name="admin-user-status",
    ),
]