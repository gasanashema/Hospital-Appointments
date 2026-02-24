from rest_framework.views import APIView
from rest_framework.response import Response
import mongoengine

class HealthCheckView(APIView):
    """
    System health monitoring.
    """
    permission_classes = []

    def get(self, request):
        try:
            # Check MongoDB
            mongoengine.connection.get_db()
            mongo_status = "healthy"
        except:
            mongo_status = "unhealthy"
            
        return Response({
            "status": "healthy" if mongo_status == "healthy" else "degraded",
            "services": {
                "mongodb": mongo_status,
                "api": "healthy"
            }
        })
