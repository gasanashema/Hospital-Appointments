from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from mongoengine import connection

class HealthCheckView(APIView):
    """
    Health check endpoint for Render and monitoring.
    Checks MongoDB connection.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        health_status = {
            "status": "healthy",
            "services": {
                "mongodb": "unknown",
                "api": "healthy"
            }
        }
        
        try:
            # Check MongoDB connection
            connection.get_connection().admin.command('ping')
            health_status["services"]["mongodb"] = "healthy"
        except Exception as e:
            health_status["status"] = "unhealthy"
            health_status["services"]["mongodb"] = f"unhealthy: {str(e)}"
            return Response(health_status, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        return Response(health_status, status=status.HTTP_200_OK)
