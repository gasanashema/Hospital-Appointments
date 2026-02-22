"""
core/views/auth_views.py

Simple demo-only token authentication.
NOT secure — for demonstration purposes only.

Usage:
  POST /api/auth/login/ with { "username": "admin", "password": "admin" }
  Returns { "token": "..." }

Enable/Disable:
  Set ENABLE_AUTH=True/False in your .env file.
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status


# Hardcoded demo credentials — NOT for production use
DEMO_TOKEN = "health-sphere-demo-token-12345"
DEMO_CREDENTIALS = {"admin": "admin", "demo": "demo123"}


class DemoLoginView(APIView):
    """
    POST /api/auth/login/

    Returns a fixed demo token if credentials match.
    This is a demo only — no real auth logic.
    """
    authentication_classes = []  # No auth required for login endpoint
    permission_classes = []

    def post(self, request):
        username = request.data.get("username", "")
        password = request.data.get("password", "")

        if DEMO_CREDENTIALS.get(username) == password:
            return Response({"token": DEMO_TOKEN})

        return Response(
            {"error": "Invalid credentials. Try admin/admin"},
            status=status.HTTP_401_UNAUTHORIZED
        )
