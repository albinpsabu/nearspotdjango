
from django.urls import path

# ============================================================
# IMPORT EXTERNAL OPENSTREETMAP VIEWS
# ============================================================

from .views_external import (
    ExternalPlaceNearbyView,
    ExternalPlaceDetailView,
    ExternalPlaceSaveView,
    SavedExternalPlaceListView,
    ExternalPlaceReviewView,
    MyExternalReviewListView,
)


# ============================================================
# IMPORT REGULAR SPOT VIEWS
# ============================================================

from .views import (
    # Categories
    CategoryListCreateView,
    CategoryDetailView,

    # Spot submission and discovery
    HiddenSpotCreateView,
    ApprovedSpotListView,
    ApprovedSpotDetailView,
    NearbySpotListView,

    # Employee spot moderation
    PendingSpotListView,
    EmployeeSpotDetailView,
    ApproveSpotView,
    RejectSpotView,
    EmployeeDashboardStatsView,

    # User spot management
    MySpotListView,
    MySpotUpdateView,
    CancelSpotView,

    # Reports
    ReportSpotView,
    ReportListView,
    ReportStatusUpdateView,

    # Community verification
    CommunityVerificationCreateView,
    CommunitySpotListView,
    CommunityVerificationSummaryView,

    # Spot media
    SpotMediaUploadView,

    # Reviews
    ReviewListCreateView,
    ReviewDetailView,
    MyReviewListView,

    # Saved spots
    SavedSpotView,
    SavedSpotListView,

    # Admin management
    AdminSpotListView,
    AdminSpotDeleteView,
    AdminSpotStatusView,
    AuditLogListView,

    # Persistent notifications
    NotificationListView,
    NotificationMarkReadView,
    NotificationMarkAllReadView,
)


# ============================================================
# URL PATTERNS
# ============================================================
#
# These paths are relative to the "api/spots/" prefix
# configured in the project's main urls.py.
#
# Example:
# "nearby/" becomes "/api/spots/nearby/".
#
# Public endpoints allow visitors to browse places.
# Protected endpoints require authentication or permissions
# defined by their corresponding views.
# ============================================================

urlpatterns = [

    # ========================================================
    # 1. CATEGORIES
    # ========================================================
    # GET: List categories.
    # POST: Create a category, subject to view permissions.

    path(
        "categories/",
        CategoryListCreateView.as_view(),
        name="category-list-create",
    ),

    # Retrieve, update, or delete a category.
    path(
        "categories/<int:pk>/",
        CategoryDetailView.as_view(),
        name="category-detail",
    ),


    # ========================================================
    # 2. PUBLIC SPOT DISCOVERY
    # ========================================================
    # List approved spots.

    path(
        "approved/",
        ApprovedSpotListView.as_view(),
        name="approved-spots",
    ),

    # Find approved spots near a geographic location.
    # Query parameters: latitude, longitude, radius.

    path(
        "nearby/",
        NearbySpotListView.as_view(),
        name="nearby-spots",
    ),


    # ========================================================
    # 3. USER SPOT SUBMISSION
    # ========================================================
    # Submit a new hidden spot.

    path(
        "",
        HiddenSpotCreateView.as_view(),
        name="spot-create",
    ),


    # ========================================================
    # 4. USER SPOT MANAGEMENT
    # ========================================================
    # List spots submitted by the current user.

    path(
        "my/",
        MySpotListView.as_view(),
        name="my-spots",
    ),

    # Update a user's own spot submission.
    path(
        "my/<int:pk>/",
        MySpotUpdateView.as_view(),
        name="my-spot-update",
    ),

    # Cancel a pending spot submission.
    path(
        "<int:pk>/cancel/",
        CancelSpotView.as_view(),
        name="spot-cancel",
    ),


    # ========================================================
    # 5. SPOT REVIEWS
    # ========================================================
    # List or create reviews for a spot.

    path(
        "<int:pk>/reviews/",
        ReviewListCreateView.as_view(),
        name="spot-reviews",
    ),

    # Retrieve, update, or delete a specific review.
    path(
        "<int:pk>/reviews/<int:review_pk>/",
        ReviewDetailView.as_view(),
        name="review-detail",
    ),

    # List reviews written by the current user.
    path(
        "my-reviews/",
        MyReviewListView.as_view(),
        name="my-reviews",
    ),


    # ========================================================
    # 6. SAVED SPOTS
    # ========================================================
    # List spots saved by the current user.

    path(
        "saved/",
        SavedSpotListView.as_view(),
        name="saved-spots",
    ),

    # POST: Save an approved spot.
    # DELETE: Remove a saved spot.

    path(
        "<int:pk>/save/",
        SavedSpotView.as_view(),
        name="spot-save-unsave",
    ),


    # ========================================================
    # 7. SPOT REPORTS
    # ========================================================
    # Submit a report about a spot.

    path(
        "<int:pk>/report/",
        ReportSpotView.as_view(),
        name="spot-report",
    ),

    # List submitted reports.
    path(
        "reports/",
        ReportListView.as_view(),
        name="report-list",
    ),

    # Update a report's status.
    path(
        "reports/<int:pk>/status/",
        ReportStatusUpdateView.as_view(),
        name="report-status-update",
    ),


    # ========================================================
    # 8. COMMUNITY VERIFICATION
    # ========================================================
    # Submit a community verification.

    path(
        "community-verify/",
        CommunityVerificationCreateView.as_view(),
        name="community-verification",
    ),

    # List spots available for community verification.
    path(
        "community-spots/",
        CommunitySpotListView.as_view(),
        name="community-spots",
    ),

    # Retrieve community verification statistics.
    path(
        "<int:pk>/community-summary/",
        CommunityVerificationSummaryView.as_view(),
        name="community-verification-summary",
    ),


    # ========================================================
    # 9. SPOT MEDIA
    # ========================================================
    # Upload media for a submitted spot.

    path(
        "media/upload/",
        SpotMediaUploadView.as_view(),
        name="spot-media-upload",
    ),


    # ========================================================
    # 10. EMPLOYEE SPOT MODERATION
    # ========================================================
    # List pending spot submissions.

    path(
        "pending/",
        PendingSpotListView.as_view(),
        name="pending-spots",
    ),

    # Retrieve a submission for employee review.
    path(
        "employee/spots/<int:pk>/",
        EmployeeSpotDetailView.as_view(),
        name="employee-spot-detail",
    ),

    # Approve a pending spot.
    path(
        "<int:pk>/approve/",
        ApproveSpotView.as_view(),
        name="spot-approve",
    ),

    # Reject a pending spot.
    path(
        "<int:pk>/reject/",
        RejectSpotView.as_view(),
        name="spot-reject",
    ),

    # Retrieve employee dashboard statistics.
    path(
        "employee/dashboard/",
        EmployeeDashboardStatsView.as_view(),
        name="employee-dashboard-stats",
    ),


    # ========================================================
    # 11. ADMIN SPOT MANAGEMENT
    # ========================================================
    # List spots for administration.

    path(
        "admin/spots/",
        AdminSpotListView.as_view(),
        name="admin-spot-list",
    ),

    # Delete a spot.
    path(
        "admin/spots/<int:pk>/",
        AdminSpotDeleteView.as_view(),
        name="admin-spot-delete",
    ),

    # Change a spot's status.
    path(
        "admin/spots/<int:pk>/status/",
        AdminSpotStatusView.as_view(),
        name="admin-spot-status",
    ),

    # View system audit logs.
    path(
        "admin/audit-logs/",
        AuditLogListView.as_view(),
        name="admin-audit-logs",
    ),


    # ========================================================
    # 12. PUBLIC SPOT DETAILS
    # ========================================================
    # Retrieve an approved spot.
    # Keep this generic route after more specific spot routes.

    path(
        "<int:pk>/",
        ApprovedSpotDetailView.as_view(),
        name="approved-spot-detail",
    ),


    # ========================================================
    # 13. EXTERNAL OPENSTREETMAP PLACE DISCOVERY
    # ========================================================
    # Discover OpenStreetMap places in the current map viewport.
    # Query parameters: south, west, north, east.

    path(
        "external/nearby/",
        ExternalPlaceNearbyView.as_view(),
        name="external-place-nearby",
    ),


    # ========================================================
    # 14. SAVED EXTERNAL PLACES
    # ========================================================
    # List external places saved by the current user.

    path(
        "external/saved/",
        SavedExternalPlaceListView.as_view(),
        name="external-saved-places",
    ),


    # ========================================================
    # 15. SAVE OR UNSAVE EXTERNAL PLACES
    # ========================================================
    # POST: Save an external OpenStreetMap place.
    # DELETE: Unsave an external place.

    path(
        "external/<str:osm_type>/<int:osm_id>/save/",
        ExternalPlaceSaveView.as_view(),
        name="external-place-save",
    ),


    # ========================================================
    # 16. EXTERNAL PLACE REVIEWS
    # ========================================================
    # Create, update, or delete the current user's review.

    path(
        "external/<str:osm_type>/<int:osm_id>/review/",
        ExternalPlaceReviewView.as_view(),
        name="external-place-review",
    ),

    # List reviews written by the current user for external places.
    path(
        "external/reviews/my/",
        MyExternalReviewListView.as_view(),
        name="my-external-reviews",
    ),


    # ========================================================
    # 17. EXTERNAL PLACE DETAILS
    # ========================================================
    # Retrieve external place details, ratings, and reviews.
    # Keep this generic route after more specific external routes.

    path(
        "external/<str:osm_type>/<int:osm_id>/",
        ExternalPlaceDetailView.as_view(),
        name="external-place-detail",
    ),


    # ========================================================
    # 18. PERSISTENT NOTIFICATIONS
    # ========================================================
    # GET: Retrieve notifications belonging to the logged-in user.
    #
    # Full endpoint:
    # /api/spots/notifications/

    path(
        "notifications/",
        NotificationListView.as_view(),
        name="notification-list",
    ),

    # PATCH: Mark one notification as read.
    #
    # Full endpoint example:
    # /api/spots/notifications/1/read/

    path(
        "notifications/<int:pk>/read/",
        NotificationMarkReadView.as_view(),
        name="notification-mark-read",
    ),

    # POST: Mark all unread notifications as read.
    #
    # Full endpoint:
    # /api/spots/notifications/read-all/

    path(
        "notifications/read-all/",
        NotificationMarkAllReadView.as_view(),
        name="notification-mark-all-read",
    ),
]
