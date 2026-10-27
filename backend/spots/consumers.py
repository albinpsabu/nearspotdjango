
from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from django.contrib.auth import get_user_model


@database_sync_to_async
def get_user_from_token(token):
    try:
        validated_token = AccessToken(token)
        user_id = validated_token.get("user_id")

        if not user_id:
            return None

        User = get_user_model()
        user = User.objects.filter(
            pk=user_id,
            is_active=True,
        ).first()

        return user

    except (InvalidToken, TokenError, ValueError, TypeError):
        return None


class SpotConsumer(AsyncJsonWebsocketConsumer):

    async def connect(self):
        self.user = None
        self.notification_groups = []

        await self.accept()

        await self.send_json({
            "type": "authentication.required",
            "message": "Send your access token to authenticate.",
        })

    async def disconnect(self, close_code):
        # Remove this connection from every group it joined.
        for group_name in self.notification_groups:
            await self.channel_layer.group_discard(
                group_name,
                self.channel_name,
            )

        self.notification_groups = []

        print(f"WebSocket disconnected: {close_code}")

    async def join_notification_groups(self):
        role = getattr(self.user, "role", None)

        # Admins and employees receive spot-review notifications.
        if role in ("ADMIN", "EMPLOYEE"):
            await self.channel_layer.group_add(
                "spot_review_staff",
                self.channel_name,
            )
            self.notification_groups.append("spot_review_staff")

        # Each user receives notifications for their own submissions.
        user_group = f"spot_user_{self.user.pk}"

        await self.channel_layer.group_add(
            user_group,
            self.channel_name,
        )
        self.notification_groups.append(user_group)

    async def receive_json(self, content, **kwargs):
        # Authenticate before processing any other message.
        if self.user is None:
            if not isinstance(content, dict):
                await self.close(code=4401)
                return

            if content.get("type") != "authenticate":
                await self.close(code=4401)
                return

            token = content.get("token")

            if not isinstance(token, str) or not token:
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

    # Receive events sent to the spot-review staff group.
    async def spot_notification(self, event):
        await self.send_json({
            "type": event["notification_type"],
            "data": event["data"],
        })

    # Receive events sent to an individual user's group.
    async def user_notification(self, event):
        await self.send_json({
            "type": event["notification_type"],
            "data": event["data"],
        })
