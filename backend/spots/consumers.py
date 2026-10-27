
from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer

from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

from django.contrib.auth import get_user_model


@database_sync_to_async
def get_user_from_token(token):
    """
    Validate a JWT access token and retrieve its active user.
    """
    try:
        validated_token = AccessToken(token)
        user_id = validated_token.get("user_id")

        if not user_id:
            return None

        User = get_user_model()

        return User.objects.filter(
            pk=user_id,
            is_active=True,
        ).first()

    except (InvalidToken, TokenError, ValueError, TypeError):
        return None


class SpotConsumer(AsyncJsonWebsocketConsumer):
    """
    WebSocket consumer for NearSpot notifications.

    Clients must authenticate with a JWT access token before
    they can join notification groups or exchange messages.
    """

    async def connect(self):
        self.user = None
        self.notification_groups = []

        # Accept the connection so the client can send its JWT.
        await self.accept()

        await self.send_json({
            "type": "authentication.required",
            "message": "Send your access token to authenticate.",
        })

    async def disconnect(self, close_code):
        """
        Remove this connection from all groups it joined.
        """
        for group_name in self.notification_groups:
            await self.channel_layer.group_discard(
                group_name,
                self.channel_name,
            )

        self.notification_groups = []

    async def join_notification_groups(self):
        """
        Subscribe the authenticated user to appropriate groups.
        """
        role = getattr(self.user, "role", None)

        # Admins and employees receive staff review notifications.
        if role in ("ADMIN", "EMPLOYEE"):
            group_name = "spot_review_staff"

            await self.channel_layer.group_add(
                group_name,
                self.channel_name,
            )

            self.notification_groups.append(group_name)

        # Every authenticated user receives their own notifications.
        user_group = f"spot_user_{self.user.pk}"

        await self.channel_layer.group_add(
            user_group,
            self.channel_name,
        )

        self.notification_groups.append(user_group)

    async def receive_json(self, content, **kwargs):
        """
        Authenticate first; process messages only after authentication.
        """
        if self.user is None:
            if not isinstance(content, dict):
                await self.close(code=4401)
                return

            if content.get("type") != "authenticate":
                await self.close(code=4401)
                return

            token = content.get("token")

            if not isinstance(token, str) or not token.strip():
                await self.close(code=4401)
                return

            user = await get_user_from_token(token)

            if user is None:
                await self.close(code=4401)
                return

            self.user = user

            await self.join_notification_groups()

            await self.send_json({
                "type": "authentication.success",
                "message": "WebSocket authentication successful.",
                "user": {
                    "id": user.pk,
                    "role": user.role,
                },
            })

            return

        # Preserve the existing echo behavior for authenticated users.
        await self.send_json({
            "type": "echo",
            "message": content,
        })

    async def spot_notification(self, event):
        """
        Handle notifications sent to the staff review group.
        """
        await self.send_json({
            "type": event["notification_type"],
            "data": event["data"],
        })

    async def user_notification(self, event):
        """
        Handle notifications sent to an individual user.
        """
        await self.send_json({
            "type": event["notification_type"],
            "data": event["data"],
        })
