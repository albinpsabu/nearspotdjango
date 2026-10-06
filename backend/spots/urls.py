from django.urls import path

from .views import (
    CategoryListCreateView,
    CategoryDetailView,
    HiddenSpotCreateView,
    PendingSpotListView,
    ApproveSpotView,
    RejectSpotView,
    ApprovedSpotListView,
    ApprovedSpotDetailView,
    NearbySpotListView,
    MySpotListView,
    MySpotUpdateView,
    CancelSpotView,
    ReportSpotView,
    ReportListView,
    ReportStatusUpdateView,
    CommunityVerificationCreateView,
    CommunitySpotListView,
    CommunityVerificationSummaryView,
    SpotMediaUploadView,
    AdminSpotListView,
    AdminSpotDeleteView,
    AdminSpotStatusView,
    AuditLogListView
)


urlpatterns = [

    path(
        "categories/",
        CategoryListCreateView.as_view(),
        name="category-list-create",
    ),


    path(
    "categories/<int:pk>/",
    CategoryDetailView.as_view(),
    name="category-detail",
    ),

    path(
        "",
        HiddenSpotCreateView.as_view(),
        name="spot-create",
    ),


    path(
        "pending/",
        PendingSpotListView.as_view(),
        name="pending-spots",
    ),

    path(
    "<int:pk>/approve/",
    ApproveSpotView.as_view(),
    name="spot-approve",
    ),


    path(
    "<int:pk>/",
    ApprovedSpotDetailView.as_view(),
    name="approved-spot-detail",
    ),

    path(
        "<int:pk>/reject/",
        RejectSpotView.as_view(),
        name="spot-reject",
    ),

    path(
    "approved/",
    ApprovedSpotListView.as_view(),
    name="approved-spots",
    ),

    path(
    "nearby/",
    NearbySpotListView.as_view(),
    name="nearby-spots",
    ),



    path(
    "my/",
    MySpotListView.as_view(),
    name="my-spots",
    ),




    path(
        "my/<int:pk>/",
        MySpotUpdateView.as_view(),
        name="my-spot-update",
    ),


    path(
    "<int:pk>/cancel/",
    CancelSpotView.as_view(),
    name="spot-cancel",
    ),



    path(
    "<int:pk>/report/",
    ReportSpotView.as_view(),
    name="spot-report",
    ),



    path(
    "reports/", 
    ReportListView.as_view(), 
    name="report-list"
    ),


    path(
    "reports/<int:pk>/status/",
    ReportStatusUpdateView.as_view(),
    name="report-status-update",
    ),


    path(
    "community-verify/",
    CommunityVerificationCreateView.as_view(),
    name="community-verification",
    ),



    path(
    "community-spots/",
    CommunitySpotListView.as_view(),
    name="community-spots",
    ),



    path(
    "<int:pk>/community-summary/",
    CommunityVerificationSummaryView.as_view(),
    name="community-verification-summary",
    ),



    path(
    "media/upload/",
    SpotMediaUploadView.as_view(),
    name="spot-media-upload",
    ),


    path("admin/spots/", 
    AdminSpotListView.as_view(),
    name="admin-spot-list"
    ),


    path(
    "admin/spots/<int:pk>/",
    AdminSpotDeleteView.as_view(),
    name="admin-spot-delete",
    ),


    path(
    "admin/spots/<int:pk>/status/",
    AdminSpotStatusView.as_view(),
    name="admin-spot-status",
    ),



    path(
    "admin/audit-logs/",
    AuditLogListView.as_view(),
    name="admin-audit-logs",
    ),
]

