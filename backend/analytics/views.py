from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from appointments.models import Appointment
from django.core.cache import cache
from users.permissions import RequirePasswordChange

class PredictionAnalyticsView(APIView):
    """
    Get prediction accuracy and basic stats.
    Excludes incomplete (pending/canceled) appointments.
    Uses Redis caching (5 min timeout).
    """
    permission_classes = [IsAuthenticated, RequirePasswordChange]

    def get(self, request):
        cache_key = f"analytics_stats_{request.user.id}"
        cached_data = cache.get(cache_key)
        if cached_data:
            return Response(cached_data)

        if request.user.role == 'ADMIN':
            # Admins see global analytics
            done_apps = Appointment.objects.filter(status='done')
        else:
            # Doctors see their own analytics
            done_apps = Appointment.objects.filter(status='done', doctor=request.user)

        # Ensure prediction exists
        valid_apps = [a for a in done_apps if a.prediction is not None]
        
        total_predictions = len(valid_apps)
        successful_predictions = 0
        failed_predictions = 0

        for app in valid_apps:
            # Map outcome to label
            actual_label = "show" if app.showed_up else "no-show"
            if app.prediction.predicted_label == actual_label:
                successful_predictions += 1
            else:
                failed_predictions += 1

        accuracy = (successful_predictions / total_predictions * 100.0) if total_predictions > 0 else 0.0

        result = {
            'total_predictions': total_predictions,
            'successful_predictions': successful_predictions,
            'failed_predictions': failed_predictions,
            'accuracy_percentage': round(accuracy, 2)
        }
        
        cache.set(cache_key, result, timeout=300)
        return Response(result, status=status.HTTP_200_OK)
