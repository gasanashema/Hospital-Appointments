from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from .models import Appointment
from .serializers import AppointmentSerializer
from core.pagination import paginate_queryset
from users.permissions import IsAdmin, IsDoctor, RequirePasswordChange
from datetime import datetime
import mongoengine.queryset.visitor as Q

class AppointmentListView(APIView):
    """
    List or create appointments.
    Enforces business rules on creation.
    Supports pagination.
    """
    permission_classes = [IsAuthenticated, RequirePasswordChange]

    def get(self, request):
        if request.user.role == 'ADMIN':
            appointments = Appointment.objects.all()
        else:
            appointments = Appointment.objects.filter(doctor=request.user)
        
        # Filter by patient if requested
        patient_id = request.query_params.get('patient_id')
        if patient_id:
            appointments = appointments.filter(patient=patient_id)

        paginated_data = paginate_queryset(appointments, request)
        serializer = AppointmentSerializer(paginated_data['items'], many=True)
        
        return Response({
            'appointments': serializer.data,
            'total': paginated_data['total'],
            'page': paginated_data['page'],
            'total_pages': paginated_data['total_pages']
        })

    def post(self, request):
        # Business Rule: Cannot create appointment in past
        appointment_date_str = request.data.get('appointment_date')
        if appointment_date_str:
            try:
                # Assuming ISO format from frontend
                appointment_date = datetime.fromisoformat(appointment_date_str.replace('Z', '+00:00'))
                if appointment_date.timestamp() < datetime.utcnow().timestamp():
                    return Response({'error': 'Cannot create appointment in the past.'}, status=status.HTTP_400_BAD_REQUEST)
            except ValueError:
                pass

        serializer = AppointmentSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AppointmentSearchView(APIView):
    """
    Search appointments by patient, date, or status.
    """
    permission_classes = [IsAuthenticated, RequirePasswordChange]

    def get(self, request):
        if request.user.role == 'ADMIN':
            base_qs = Appointment.objects.all()
        else:
            base_qs = Appointment.objects.filter(doctor=request.user)

        patient_id = request.query_params.get('patient_id')
        date_str = request.query_params.get('date')
        status_q = request.query_params.get('status')

        if patient_id:
            base_qs = base_qs.filter(patient=patient_id)
        
        if date_str:
            try:
                date_val = datetime.fromisoformat(date_str)
                # Filter by exact date or range if needed
                base_qs = base_qs.filter(appointment_date__gte=date_val)
            except ValueError:
                pass

        if status_q:
            base_qs = base_qs.filter(status=status_q)

        serializer = AppointmentSerializer(base_qs, many=True)
        return Response(serializer.data)


class AppointmentDetailView(APIView):
    """
    Update (mark done) or Retrieve an appointment.
    Enforces business rules on updates.
    """
    permission_classes = [IsAuthenticated, RequirePasswordChange]

    def get_object(self, appointment_id, user):
        try:
            if user.role == 'ADMIN':
                return Appointment.objects.get(id=appointment_id)
            return Appointment.objects.get(id=appointment_id, doctor=user)
        except Appointment.DoesNotExist:
            return None

    def get(self, request, appointment_id):
        appointment = self.get_object(appointment_id, request.user)
        if not appointment:
            return Response({'error': 'Appointment not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = AppointmentSerializer(appointment)
        return Response(serializer.data)

    def patch(self, request, appointment_id):
        appointment = self.get_object(appointment_id, request.user)
        if not appointment:
            return Response({'error': 'Appointment not found.'}, status=status.HTTP_404_NOT_FOUND)

        showed_up = request.data.get('showed_up')
        was_late = request.data.get('was_late', False)

        if showed_up is not None:
            try:
                appointment.mark_done(showed_up=showed_up, was_late=was_late)
                
                # Update patient attendance score
                patient = appointment.patient
                all_done_apps = Appointment.objects.filter(patient=patient, status='done')
                shows = all_done_apps.filter(showed_up=True).count()
                total = all_done_apps.count()
                if total > 0:
                    patient.attendance_score = (shows / total) * 100.0
                    patient.save()

                return Response({'message': 'Appointment marked as done.'})
            except Exception as e:
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({'error': 'showed_up field is required for this update.'}, status=status.HTTP_400_BAD_REQUEST)


class AppointmentCancelView(APIView):
    """
    Cancel an appointment.
    """
    permission_classes = [IsAuthenticated, RequirePasswordChange]

    def post(self, request, appointment_id):
        try:
            if request.user.role == 'ADMIN':
                appointment = Appointment.objects.get(id=appointment_id)
            else:
                appointment = Appointment.objects.get(id=appointment_id, doctor=request.user)
            
            appointment.cancel()
            return Response({'message': 'Appointment canceled successfully.'})
        except Appointment.DoesNotExist:
            return Response({'error': 'Appointment not found.'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
