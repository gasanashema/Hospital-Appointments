"""
core/views/stats_views.py

Prediction accuracy statistics endpoint.

GET /api/stats/predictions/

Returns:
  {
    "total":    42,   ← total appointments with a known outcome (showed_up != null)
    "correct":  35,   ← predictions that matched the actual outcome
    "incorrect": 7,   ← predictions that did NOT match
    "accuracy": 83    ← (correct / total) * 100, rounded integer
  }

Accuracy logic:
  - A prediction is CORRECT if:
    (predicted_label == "show" AND showed_up == True)
    OR
    (predicted_label == "no-show" AND showed_up == False)
  - Appointments where showed_up is None (pending/canceled) are EXCLUDED
    from the calculation.
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from core.models.appointment import Appointment


class PredictionStatsView(APIView):
    """GET /api/stats/predictions/"""

    def get(self, request):
        # Only include appointments that have a real outcome (status=done)
        evaluated = Appointment.objects(status="done", showed_up__ne=None)
        total = evaluated.count()

        if total == 0:
            return Response({
                "total": 0,
                "correct": 0,
                "incorrect": 0,
                "accuracy": 0,
            })

        correct = 0
        incorrect = 0

        for appt in evaluated:
            if not appt.prediction:
                continue  # Skip appointments without a prediction

            pred_label = appt.prediction.predicted_label  # "show" or "no-show"
            actual_showed = appt.showed_up                # True or False

            # Check if prediction matches outcome
            prediction_correct = (
                (pred_label == "show" and actual_showed is True) or
                (pred_label == "no-show" and actual_showed is False)
            )

            if prediction_correct:
                correct += 1
            else:
                incorrect += 1

        # Only count appointments that actually had a prediction
        evaluated_with_pred = correct + incorrect
        accuracy = round((correct / evaluated_with_pred) * 100) if evaluated_with_pred > 0 else 0

        return Response({
            "total": evaluated_with_pred,
            "correct": correct,
            "incorrect": incorrect,
            "accuracy": accuracy,
        })
