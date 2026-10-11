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
    AuditLogListView,
    EmployeeSpotDetailView,
    EmployeeDashboardStatsView,
    ReviewListCreateView,
    ReviewDetailView,
    SavedSpotView,          # <-- Single view for POST + DELETE
    SavedSpotListView,
    MyReviewListView
)
urlpatterns = [
    # Categories
    path("categories/", CategoryListCreateView.as_view(), name="category-list-create"),
    path("categories/<int:pk>/", CategoryDetailView.as_view(), name="category-detail"),
    # Spot create
    path("", HiddenSpotCreateView.as_view(), name="spot-create"),
    # Employee/Admin spot review
    path("pending/", PendingSpotListView.as_view(), name="pending-spots"),
    path("<int:pk>/approve/", ApproveSpotView.as_view(), name="spot-approve"),
    path("<int:pk>/reject/", RejectSpotView.as_view(), name="spot-reject"),
    # Public approved spots
    path("approved/", ApprovedSpotListView.as_view(), name="approved-spots"),
    path("nearby/", NearbySpotListView.as_view(), name="nearby-spots"),
    # ============================================================
    # SPECIFIC PATTERNS FIRST (before generic <int:pk>/)
    # ============================================================
    
    # Reviews
    path("<int:pk>/reviews/", ReviewListCreateView.as_view(), name="spot-reviews"),
    path("<int:pk>/reviews/<int:review_pk>/", ReviewDetailView.as_view(), name="review-detail"),
    # Saved spots — single view handles POST + DELETE
    path("<int:pk>/save/", SavedSpotView.as_view(), name="spot-save-unsave"),
    path("saved/", SavedSpotListView.as_view(), name="saved-spots"),
    # User's own spots
    path("my/", MySpotListView.as_view(), name="my-spots"),
    path("my/<int:pk>/", MySpotUpdateView.as_view(), name="my-spot-update"),
    path("<int:pk>/cancel/", CancelSpotView.as_view(), name="spot-cancel"),
    # Reports
    path("<int:pk>/report/", ReportSpotView.as_view(), name="spot-report"),
    path("reports/", ReportListView.as_view(), name="report-list"),
    path("reports/<int:pk>/status/", ReportStatusUpdateView.as_view(), name="report-status-update"),
    # Community
    path("community-verify/", CommunityVerificationCreateView.as_view(), name="community-verification"),
    path("community-spots/", CommunitySpotListView.as_view(), name="community-spots"),
    path("<int:pk>/community-summary/", CommunityVerificationSummaryView.as_view(), name="community-verification-summary"),
    # Media
    path("media/upload/", SpotMediaUploadView.as_view(), name="spot-media-upload"),
    # Admin
    path("admin/spots/", AdminSpotListView.as_view(), name="admin-spot-list"),
    path("admin/spots/<int:pk>/", AdminSpotDeleteView.as_view(), name="admin-spot-delete"),
    path("admin/spots/<int:pk>/status/", AdminSpotStatusView.as_view(), name="admin-spot-status"),
    path("admin/audit-logs/", AuditLogListView.as_view(), name="admin-audit-logs"),
    # Employee
    path("employee/spots/<int:pk>/", EmployeeSpotDetailView.as_view(), name="employee-spot-detail"),
    path("employee/dashboard/", EmployeeDashboardStatsView.as_view(), name="employee-dashboard-stats"),
    # ============================================================
    # GENERIC DETAIL LAST
    # ============================================================
    path("<int:pk>/", ApprovedSpotDetailView.as_view(), name="approved-spot-detail"),



    # Add pattern (place before generic <int:pk>/)
    path("my-reviews/", MyReviewListView.as_view(), name="my-reviews"),
]