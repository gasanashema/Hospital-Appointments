from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from users.permissions import RequirePasswordChange
from appointments.models import Appointment

class PredictionAnalyticsView(APIView):
    """
    Calculate accuracy stats based on actual outcomes.
    """
    permission_classes = [IsAuthenticated, RequirePasswordChange]

    def get(self, request):
        # Get all appointments with an outcome
        done_appointments = Appointment.objects.filter(status='done', showed_up__ne=None)
        
        total = done_appointments.count()
        if total == 0:
            return Response({
                'total': 0,
                'correct': 0,
                'incorrect': 0,
                'accuracy': 0
            })
            
        correct = 0
        for appt in done_appointments:
            if not appt.prediction:
                continue
                
            predicted = appt.prediction.predicted_label # "show" or "no-show"
            actual = "show" if appt.showed_up else "no-show"
            
            if predicted == actual:
                correct += 1
                
        accuracy = round((correct / total) * 100)
        
        return Response({
            'total': total,
            'correct': correct,
            'incorrect': total - correct,
            'accuracy': accuracy
        })
