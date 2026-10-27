
from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError


@database_sync_to_async
def get_user_from_token(raw_token):
    try:
        jwt_auth = JWTAuthentication()
        validated_token = jwt_auth.get_validated_token(raw_token)
        return jwt_auth.get_user(validated_token)
    except (InvalidToken, TokenError):
        return None


class JWTAuthMiddleware:
    """
    Authenticate a WebSocket connection using a JWT access token
    supplied as the `token` query parameter.
    """

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        query_string = scope.get("query_string", b"").decode()
        query_params = parse_qs(query_string)
        tokens = query_params.get("token", [])

        scope = dict(scope)
        scope["user"] = await get_user_from_token(tokens[0]) if tokens else None

        return await self.app(scope, receive, send)


class JWTAuthMiddlewareStack:
    def __init__(self, app):
        self.app = JWTAuthMiddleware(app)

    async def __call__(self, scope, receive, send):
        return await self.app(scope, receive, send)
