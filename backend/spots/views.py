from rest_framework import generics
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from rest_framework.views import APIView
from accounts.permissions import IsAdmin, IsUser,IsAdminOrEmployee
from rest_framework.permissions import AllowAny
from django.db import transaction
from django.db.models import Count, Q
from .models import (
    Category,
    HiddenSpot,
    Verification,
    Report,
    CommunityVerification,
    SpotMedia,
    AuditLog,
)
from django.contrib.gis.geos import Point
from django.contrib.gis.db.models.functions import Distance
from django.contrib.gis.measure import D



from .serializers import (
    CategorySerializer,
    HiddenSpotSerializer,
    PendingSpotSerializer,
    VerificationSerializer,
    ApprovedSpotSerializer,
    MySpotSerializer,
    ReportSerializer,
    ReportStatusSerializer,
    CommunityVerificationSerializer,
    CommunitySpotSerializer,
    SpotMediaSerializer,
    AuditLogSerializer
)


class CategoryListCreateView(generics.ListCreateAPIView):

    queryset = Category.objects.all()
    serializer_class = CategorySerializer

    def get_permissions(self):

        if self.request.method == "GET":
            return []

        return [IsAdmin()]



class CategoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAdmin]

    def perform_destroy(self, instance):
        if instance.spots.exists():
            from rest_framework.exceptions import ValidationError

            raise ValidationError({
                "error": "This category cannot be deleted because it is being used by one or more spots."
            })

        instance.delete()


class HiddenSpotCreateView(generics.CreateAPIView):

    queryset = HiddenSpot.objects.all()
    serializer_class = HiddenSpotSerializer
    permission_classes = [IsUser]


class PendingSpotListView(generics.ListAPIView):

    serializer_class = PendingSpotSerializer
    permission_classes = [IsAdminOrEmployee]

    def get_queryset(self):
        return HiddenSpot.objects.filter(
            status=HiddenSpot.Status.PENDING
        ).select_related(
            "category",
            "submitted_by"
        ).order_by(
            "-created_at"
        )


class ApproveSpotView(APIView):

    permission_classes = [IsAdminOrEmployee]

    def post(self, request, pk):

        try:
            spot = HiddenSpot.objects.get(pk=pk)
        except HiddenSpot.DoesNotExist:
            return Response(
                {"error": "Spot not found."},
                status=404
            )

        if spot.status != HiddenSpot.Status.PENDING:
            return Response(
                {
                    "error": "Only pending spots can be approved."
                },
                status=400
            )

        spot.status = HiddenSpot.Status.APPROVED
        spot.rejection_reason = ""
        spot.save()

        verification = Verification.objects.create(
            spot=spot,
            employee=request.user,
            action=Verification.Action.APPROVED,
            reason=""
        )

        return Response(
            {
                "message": "Spot approved successfully.",
                "spot_id": spot.id,
                "status": spot.status,
                "verification_id": verification.id,
            }
        )
class ApprovedSpotDetailView(generics.RetrieveAPIView):
    serializer_class = ApprovedSpotSerializer
    permission_classes = [IsUser]

    def get_queryset(self):
        return (
            HiddenSpot.objects
            .filter(status=HiddenSpot.Status.APPROVED)
            .select_related("category")
            .prefetch_related("media")
        )


class RejectSpotView(APIView):

    permission_classes = [IsAdminOrEmployee]

    def post(self, request, pk):

        try:
            spot = HiddenSpot.objects.get(pk=pk)
        except HiddenSpot.DoesNotExist:
            return Response(
                {"error": "Spot not found."},
                status=404
            )

        if spot.status != HiddenSpot.Status.PENDING:
            return Response(
                {
                    "error": "Only pending spots can be rejected."
                },
                status=400
            )

        reason = request.data.get("reason")

        if not reason:
            return Response(
                {
                    "error": "Rejection reason is required."
                },
                status=400
            )

        spot.status = HiddenSpot.Status.REJECTED
        spot.rejection_reason = reason
        spot.save()

        verification = Verification.objects.create(
            spot=spot,
            employee=request.user,
            action=Verification.Action.REJECTED,
            reason=reason
        )

        AuditLog.objects.create(
            user=request.user,
            action="SPOT_REJECTED",
            description=f"Spot '{spot.name}' (ID: {spot.id}) was rejected. Reason: {reason}",
        )

        return Response(
            {
                "message": "Spot rejected successfully.",
                "spot_id": spot.id,
                "status": spot.status,
                "reason": reason,
                "verification_id": verification.id,
            }
        )

    
class ApproveSpotView(APIView):

    permission_classes = [IsAdminOrEmployee]

    def post(self, request, pk):

        try:
            spot = HiddenSpot.objects.get(pk=pk)
        except HiddenSpot.DoesNotExist:
            return Response(
                {"error": "Spot not found."},
                status=404
            )

        if spot.status != HiddenSpot.Status.PENDING:
            return Response(
                {
                    "error": "Only pending spots can be approved."
                },
                status=400
            )

        with transaction.atomic():

            spot.status = HiddenSpot.Status.APPROVED
            spot.rejection_reason = ""
            spot.save()

            verification = Verification.objects.create(
                spot=spot,
                employee=request.user,
                action=Verification.Action.APPROVED,
                reason=""
            )
            AuditLog.objects.create(
                user=request.user,
                action="SPOT_APPROVED",
                description=f"Spot '{spot.name}' (ID: {spot.id}) was approved.",
            )

        return Response(
            {
                "message": "Spot approved successfully.",
                "spot_id": spot.id,
                "status": spot.status,
                "verification_id": verification.id,
            }
        )


class ApprovedSpotListView(generics.ListAPIView):

    serializer_class = ApprovedSpotSerializer
    permission_classes = [IsUser]

    def get_queryset(self):

        return (
            HiddenSpot.objects
            .filter(
                status=HiddenSpot.Status.APPROVED
            )
            .select_related(
                "category"
            )
            .order_by(
                "-created_at"
            )
        )





class NearbySpotListView(generics.ListAPIView):
    serializer_class = ApprovedSpotSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        latitude_param = self.request.query_params.get("latitude")
        longitude_param = self.request.query_params.get("longitude")
        radius_param = self.request.query_params.get("radius", "5000")

        if latitude_param is None or longitude_param is None:
            raise ValidationError({
                "error": "latitude and longitude are required."
            })

        try:
            latitude = float(latitude_param)
            longitude = float(longitude_param)
            radius = float(radius_param)
        except (TypeError, ValueError):
            raise ValidationError({
                "error": "latitude, longitude, and radius must be valid numbers."
            })

        if not -90 <= latitude <= 90:
            raise ValidationError({
                "latitude": "Latitude must be between -90 and 90."
            })

        if not -180 <= longitude <= 180:
            raise ValidationError({
                "longitude": "Longitude must be between -180 and 180."
            })

        if radius <= 0:
            raise ValidationError({
                "radius": "Radius must be greater than 0."
            })

        user_location = Point(
            longitude,
            latitude,
            srid=4326
        )

        return (
            HiddenSpot.objects
            .filter(
                status=HiddenSpot.Status.APPROVED,
                location__distance_lte=(
                    user_location,
                    D(m=radius)
                )
            )
            .annotate(
                distance=Distance(
                    "location",
                    user_location
                )
            )
            .select_related("category")
            .order_by("distance")
        )

class MySpotListView(generics.ListAPIView):
    serializer_class = MySpotSerializer
    permission_classes = [IsUser]

    def get_queryset(self):
        return (
            HiddenSpot.objects
            .filter(
                submitted_by=self.request.user
            )
            .select_related("category")
            .order_by("-created_at")
        )



class MySpotUpdateView(generics.UpdateAPIView):
    serializer_class = HiddenSpotSerializer
    permission_classes = [IsUser]

    def get_queryset(self):
        return HiddenSpot.objects.filter(
            submitted_by=self.request.user,
            status=HiddenSpot.Status.PENDING
        )


class CancelSpotView(APIView):
    permission_classes = [IsUser]

    def post(self, request, pk):
        try:
            spot = HiddenSpot.objects.get(
                pk=pk,
                submitted_by=request.user
            )
        except HiddenSpot.DoesNotExist:
            return Response(
                {"error": "Spot not found."},
                status=404
            )

        if spot.status != HiddenSpot.Status.PENDING:
            return Response(
                {
                    "error": "Only pending spots can be cancelled."
                },
                status=400
            )

        spot.status = HiddenSpot.Status.CANCELLED
        spot.save()

        return Response({
            "message": "Spot cancelled successfully.",
            "spot_id": spot.id,
            "status": spot.status,
        })




class ReportSpotView(generics.CreateAPIView):
    serializer_class = ReportSerializer
    permission_classes = [IsUser]

    def perform_create(self, serializer):
        serializer.save(reported_by=self.request.user)





class ReportListView(generics.ListAPIView):
    serializer_class = ReportSerializer
    permission_classes = [IsAdminOrEmployee]

    def get_queryset(self):
        return (
            Report.objects
            .select_related("spot", "reported_by")
            .order_by("-created_at")
        )



class ReportStatusUpdateView(generics.UpdateAPIView):
    queryset = Report.objects.all()
    serializer_class = ReportStatusSerializer
    permission_classes = [IsAdminOrEmployee]

    http_method_names = ["patch"]

    def perform_update(self, serializer):
        report = serializer.save()

        AuditLog.objects.create(
            user=self.request.user,
            action="REPORT_STATUS_UPDATED",
            description=(
                f"Report ID {report.id} for spot "
                f"'{report.spot.name}' was changed to "
                f"{report.status}."
            ),
        )



class CommunityVerificationCreateView(generics.CreateAPIView):
    serializer_class = CommunityVerificationSerializer
    permission_classes = [IsUser]

    def perform_create(self, serializer):
        spot = serializer.validated_data["spot"]

        if spot.submitted_by == self.request.user:
            from rest_framework.exceptions import ValidationError

            raise ValidationError(
                {"spot": "You cannot verify your own spot."}
            )

        serializer.save(user=self.request.user)



class CommunitySpotListView(generics.ListAPIView):
    serializer_class = CommunitySpotSerializer
    permission_classes = [IsUser]

    def get_queryset(self):
        return (
            HiddenSpot.objects
            .filter(status=HiddenSpot.Status.PENDING)
            .exclude(submitted_by=self.request.user)
            .select_related("category")
            .order_by("-created_at")
        )




class CommunityVerificationSummaryView(APIView):
    permission_classes = [IsUser]

    def get(self, request, pk):
        try:
            spot = HiddenSpot.objects.get(
                pk=pk,
                status=HiddenSpot.Status.APPROVED
            )
        except HiddenSpot.DoesNotExist:
            return Response(
                {"error": "Approved spot not found."},
                status=404
            )

        summary = CommunityVerification.objects.filter(
            spot=spot
        ).aggregate(
            confirm_count=Count(
                "id",
                filter=Q(
                    action=CommunityVerification.Action.CONFIRM
                )
            ),
            report_count=Count(
                "id",
                filter=Q(
                    action=CommunityVerification.Action.REPORT
                )
            ),
        )

        confirm_count = summary["confirm_count"] or 0
        report_count = summary["report_count"] or 0

        if confirm_count > report_count:
            community_status = "CONFIRMED"
        elif report_count > confirm_count:
            community_status = "REPORTED"
        else:
            community_status = "NEUTRAL"

        return Response({
            "spot_id": spot.id,
            "confirm_count": confirm_count,
            "report_count": report_count,
            "community_status": community_status,
        })


class SpotMediaUploadView(generics.CreateAPIView):
    serializer_class = SpotMediaSerializer
    permission_classes = [IsUser]

    def perform_create(self, serializer):
        spot = serializer.validated_data["spot"]

        # Only the owner can upload media
        if spot.submitted_by != self.request.user:
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied(
                "You can upload media only to your own spots."
            )

        # Media can only be added while the spot is pending
        if spot.status != HiddenSpot.Status.PENDING:
            from rest_framework.exceptions import ValidationError

            raise ValidationError({
                "spot": "Media can only be uploaded while the spot is pending."
            })

        serializer.save()




class AdminSpotListView(generics.ListAPIView):
    queryset = (
        HiddenSpot.objects
        .select_related("category", "submitted_by")
        .order_by("-created_at")
    )
    serializer_class = MySpotSerializer
    permission_classes = [IsAdmin]





class AdminSpotDeleteView(generics.DestroyAPIView):
    queryset = HiddenSpot.objects.all()
    permission_classes = [IsAdmin]

    def perform_destroy(self, instance):
        AuditLog.objects.create(
            user=self.request.user,
            action="SPOT_DELETED",
            description=(
                f"Spot '{instance.name}' "
                f"(ID: {instance.id}) was deleted."
            ),
        )

        instance.delete()

        



class AdminSpotStatusView(generics.UpdateAPIView):
    queryset = HiddenSpot.objects.all()
    serializer_class = MySpotSerializer
    permission_classes = [IsAdmin]

    def update(self, request, *args, **kwargs):
        spot = self.get_object()
        old_status = spot.status
        new_status = request.data.get("status")

        allowed_statuses = [
            HiddenSpot.Status.PENDING,
            HiddenSpot.Status.APPROVED,
            HiddenSpot.Status.REJECTED,
            HiddenSpot.Status.CANCELLED,
        ]

        if new_status not in allowed_statuses:
            return Response(
                {
                    "error": "Invalid status.",
                    "allowed_statuses": allowed_statuses,
                },
                status=400,
            )

        spot.status = new_status

        if new_status != HiddenSpot.Status.REJECTED:
            spot.rejection_reason = ""

        spot.save()

        AuditLog.objects.create(
            user=request.user,
            action="SPOT_STATUS_UPDATED",
            description=(
                f"Spot '{spot.name}' (ID: {spot.id}) "
                f"status changed from {old_status} to {new_status}."
            ),
        )

        return Response(
            MySpotSerializer(
                spot,
                context={"request": request},
            ).data
        )


    
class AuditLogListView(generics.ListAPIView):
    queryset = (
        AuditLog.objects
        .select_related("user")
        .order_by("-created_at")
    )
    serializer_class = AuditLogSerializer
    permission_classes = [IsAdmin]