
import asyncio
import importlib

from asgiref.sync import async_to_sync
from channels.db import database_sync_to_async
from channels.layers import get_channel_layer
from channels.testing import WebsocketCommunicator
from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken


module_name, app_name = settings.ASGI_APPLICATION.rsplit(".", 1)
application = getattr(
    importlib.import_module(module_name),
    app_name,
)


@database_sync_to_async
def get_admin():
    User = get_user_model()
    return User.objects.filter(
        role="ADMIN",
        is_active=True,
    ).first()


async def run_test():
    admin = await get_admin()

    if admin is None:
        print("ERROR: No active ADMIN user found.")
        return

    token = str(RefreshToken.for_user(admin).access_token)

    communicator = WebsocketCommunicator(
        application,
        "/ws/spots/",
    )

    try:
        connected, _ = await communicator.connect()
        print("Connected:", connected)

        challenge = await communicator.receive_json_from(timeout=5)
        print("Initial message:", challenge["type"])

        await communicator.send_json_to({
            "type": "authenticate",
            "token": token,
        })

        auth_result = await communicator.receive_json_from(timeout=5)
        print("Authentication:", auth_result["type"])

        if auth_result["type"] != "authentication.success":
            print("ERROR: Authentication failed.")
            return

        channel_layer = get_channel_layer()

        await channel_layer.group_send(
            "spot_review_staff",
            {
                "type": "spot.notification",
                "notification_type": "spot.pending",
                "data": {
                    "spot_id": 999,
                    "name": "WebSocket Test Spot",
                    "status": "PENDING",
                    "message": "Test notification received.",
                },
            },
        )

        notification = await communicator.receive_json_from(timeout=5)
        print("Notification received:", notification)

    finally:
        await communicator.disconnect()


async_to_sync(run_test)()
