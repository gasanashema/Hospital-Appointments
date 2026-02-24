from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from users.permissions import IsAdmin
from .services.ml_service import MLService
from .tasks import train_model_task

class OnDemandPredictionView(APIView):
    """
    On-demand prediction without saving to database.
    POST /api/predictions/predict/
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        age = request.data.get('age')
        gender = request.data.get('gender') # M or F
        scheduling_interval = request.data.get('scheduling_interval')
        sms_received = request.data.get('sms_received', 0)
        attendance_score = request.data.get('attendance_score', 75.0)

        if any(v is None for v in [age, gender, scheduling_interval]):
            return Response({'error': 'age, gender, and scheduling_interval are required.'}, status=status.HTTP_400_BAD_REQUEST)

        sex_map = {'M': 0, 'F': 1}
        sex = sex_map.get(gender, 0)

        ml_service = MLService()
        try:
            label, prob, version = ml_service.predict(
                age=int(age),
                sex=sex,
                scheduling_interval=int(scheduling_interval),
                sms_received=int(sms_received),
                attendance_score=float(attendance_score)
            )
            return Response({
                'predicted_label': label,
                'predicted_probability': prob,
                'model_version': version
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ModelRetrainView(APIView):
    """
    Admin endpoint to trigger manual model retraining via Celery.
    POST /api/admin/predictions/retrain/
    """
    permission_classes = [IsAdmin]

    def post(self, request):
        task = train_model_task.delay()
        return Response({
            'message': 'Model retraining initiated in background.',
            'task_id': task.id
        }, status=status.HTTP_202_ACCEPTED)


class ModelStatusView(APIView):
    """
    Check current model version and status.
    GET /api/admin/predictions/status/
    """
    permission_classes = [IsAdmin]

    def get(self, request):
        ml_service = MLService()
        version = ml_service.get_current_version()
        trained = ml_service.load_model()
        
        return Response({
            'model_version': version,
            'is_trained': trained,
            'model_path': str(ml_service.model_path)
        }, status=status.HTTP_200_OK)
