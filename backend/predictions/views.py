from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from users.permissions import IsAdmin, RequirePasswordChange
from .services.ml_service import MLService
import datetime

class OnDemandPredictionView(APIView):
    """
    Get a prediction without saving to the database.
    Used for "what-if" scenarios in the UI.
    """
    permission_classes = [IsAuthenticated, RequirePasswordChange]

    def post(self, request):
        try:
            data = request.data
            age = int(data.get('age', 0))
            gender = data.get('gender', 'M')
            sms_received = int(data.get('smsReceived', 0))
            attendance_score = float(data.get('attendanceScore', 75.0))
            
            # Scheduling interval (default 0)
            appointment_date_str = data.get('appointmentDate')
            if appointment_date_str:
                appointment_date = datetime.datetime.fromisoformat(appointment_date_str.replace('Z', '+00:00'))
                scheduling_interval = (appointment_date - datetime.datetime.utcnow()).days
                if scheduling_interval < 0: scheduling_interval = 0
            else:
                scheduling_interval = 0

            sex = 0 if gender == 'M' else 1
            
            ml_service = MLService()
            label, prob, version = ml_service.predict(
                age=age,
                sex=sex,
                scheduling_interval=scheduling_interval,
                sms_received=sms_received,
                attendance_score=attendance_score
            )
            
            return Response({
                'label': label.capitalize(),
                'probability': round(prob * 100),
                'modelVersion': version
            })
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class ModelRetrainView(APIView):
    """
    Manually trigger a full model retraining.
    Admin only.
    """
    permission_classes = [IsAuthenticated, IsAdmin, RequirePasswordChange]

    def post(self, request):
        # In a real app, this would be a Celery task.
        # For simplicity in this demo, we run it synchronously or trigger a task.
        try:
            from .tasks import train_model_task
            task = train_model_task.delay()
            return Response({'status': 'Retraining started', 'task_id': task.id})
        except Exception as e:
            # Fallback to sync if celery not configured
            try:
                ml_service = MLService()
                version, accuracy = ml_service.train_model()
                return Response({
                    'status': 'Retrained synchronously',
                    'version': version,
                    'accuracy': round(accuracy * 100, 2)
                })
            except Exception as se:
                return Response({'error': str(se)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ModelStatusView(APIView):
    """
    Get current model info and historical performance.
    """
    permission_classes = [IsAuthenticated, RequirePasswordChange]

    def get(self, request):
        ml_service = MLService()
        version = ml_service.get_current_version()
        
        # In a real app, we'd fetch this from a 'ModelMetadata' collection
        return Response({
            'currentVersion': version,
            'algorithm': 'Logistic Regression',
            'lastTrained': datetime.datetime.utcnow().isoformat(), # Placeholder
            'isActive': True
        })
