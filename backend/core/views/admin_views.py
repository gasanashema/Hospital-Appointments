"""
core/views/admin_views.py

Admin-only endpoint for manual model retraining.

POST /api/admin/retrain/
  - Immediately triggers a full retrain synchronously
  - Merges CSV baseline + all MongoDB done appointments
  - Returns the new model version and accuracy
  - Useful for forcing an update outside the automatic trigger window

To adjust the automatic trigger frequency, set RETRAIN_EVERY_N=<int> in .env
(default: 10 — retrain after every 10 completed appointments)
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from core.services.ml_service import retrain_now, get_model_version


class ManualRetrainView(APIView):
    """POST /api/admin/retrain/ — trigger immediate model retraining."""

    def post(self, request):
        try:
            result = retrain_now()
            return Response({
                "message": "Model retrained successfully.",
                "version": result["version"],
                "accuracy": f"{result['accuracy']:.1%}",
                "total_samples": result["total_samples"],
                "live_samples": result["live_samples"],
            })
        except Exception as e:
            return Response(
                {"error": f"Retraining failed: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class ModelStatusView(APIView):
    """GET /api/admin/model-status/ — return current model info."""

    def get(self, request):
        from core.models.appointment import Appointment
        done_count = Appointment.objects(status="done", showed_up__ne=None).count()

        return Response({
            "version": get_model_version(),
            "evaluated_appointments": done_count,
        })
