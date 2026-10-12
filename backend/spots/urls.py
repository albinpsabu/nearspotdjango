
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
    MyExternalReviewListView
)


# ============================================================
# IMPORT EXISTING SPOT VIEWS
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
)


# ============================================================
# URL PATTERNS
# ============================================================

# These paths are relative to the prefix configured
# in the project's main urls.py.
#
# For example, if included under "api/spots/",
# the path "nearby/" becomes "/api/spots/nearby/".
#
# Public endpoints allow visitors to browse without login.
# Protected endpoints enforce permissions in their views.

urlpatterns = [

    # ========================================================
    # 1. CATEGORIES
    # ========================================================

    # GET  - List available categories (public)
    # POST - Create a category (admin only)
    path(
        "categories/",
        CategoryListCreateView.as_view(),
        name="category-list-create",
    ),

    # Retrieve, update or delete a category.
    path(
        "categories/<int:pk>/",
        CategoryDetailView.as_view(),
        name="category-detail",
    ),


    # ========================================================
    # 2. PUBLIC SPOT DISCOVERY
    # ========================================================

    # List all approved spots.
    path(
        "approved/",
        ApprovedSpotListView.as_view(),
        name="approved-spots",
    ),

    # Retrieve approved spots near a geographic location.
    #
    # Query parameters:
    # latitude  - Latitude of the search center
    # longitude - Longitude of the search center
    # radius    - Search radius in meters
    #
    # Example:
    # nearby/?latitude=8.5241&longitude=76.9366&radius=5000

    path(
        "nearby/",
        NearbySpotListView.as_view(),
        name="nearby-spots",
    ),


    # ========================================================
    # 3. USER SPOT SUBMISSION
    # ========================================================

    # POST - Submit a new hidden spot.
    # Requires an authenticated user with USER role.
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

    # Update one of the user's pending submissions.
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

    # GET  - List reviews for an approved spot.
    # POST - Create a review.
    path(
        "<int:pk>/reviews/",
        ReviewListCreateView.as_view(),
        name="spot-reviews",
    ),

    # Retrieve, update or delete a specific review.
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

    # POST   - Save an approved spot.
    # DELETE - Remove a saved spot.
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

    # Submit community verification for a spot.
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

    # List all pending spot submissions.
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

    # List all spots for administration.
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
    path(
        "<int:pk>/",
        ApprovedSpotDetailView.as_view(),
        name="approved-spot-detail",
    ),


    # ========================================================
    # 13. EXTERNAL OPENSTREETMAP PLACE DISCOVERY
    # ========================================================

    # GET - Discover OSM places within the map viewport.
    #
    # Query parameters:
    # south, west, north, east
    #
    # Uses persistent geographic caching through
    # place_discovery.py.
    #
    # Public access.

    path(
        "external/nearby/",
        ExternalPlaceNearbyView.as_view(),
        name="external-place-nearby",
    ),


    # ========================================================
    # 14. SAVED EXTERNAL PLACES
    # ========================================================

    # GET - List external places saved by the current user.
    #
    # Authentication required.

    path(
        "external/saved/",
        SavedExternalPlaceListView.as_view(),
        name="external-saved-places",
    ),


    # ========================================================
    # 15. SAVE / UNSAVE EXTERNAL PLACE
    # ========================================================

    # POST   - Save an external OSM place.
    # DELETE - Unsave an external OSM place.
    #
    # Authentication required.
    #
    # New places are verified through the official
    # OpenStreetMap API before registration.

    path(
        "external/<str:osm_type>/<int:osm_id>/save/",
        ExternalPlaceSaveView.as_view(),
        name="external-place-save",
    ),


    # ========================================================
    # 16. EXTERNAL PLACE REVIEWS
    # ========================================================

    # POST   - Create a review.
    # PATCH  - Update the current user's review.
    # DELETE - Delete the current user's review.
    #
    # Authentication required.
    #
    # Each user can review an external place once.

    path(
        "external/<str:osm_type>/<int:osm_id>/review/",
        ExternalPlaceReviewView.as_view(),
        name="external-place-review",
    ),


    # ========================================================
    # 17. EXTERNAL PLACE DETAILS
    # ========================================================

    # GET - Retrieve a registered external place's:
    # - Name
    # - Category
    # - Address
    # - Coordinates
    # - Average rating
    # - Review count
    # - Saved status
    # - Reviews
    #
    # Public access.
    #
    # Keep this generic external-place route after
    # the more specific external routes.

    path(
        "external/<str:osm_type>/<int:osm_id>/",
        ExternalPlaceDetailView.as_view(),
        name="external-place-detail",
    ),



    path(
    "external/reviews/my/",
    MyExternalReviewListView.as_view(),
    name="my-external-reviews",
),
]
