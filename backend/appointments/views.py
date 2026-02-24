import datetime
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from .models import Appointment
from .serializers import AppointmentSerializer
from core.pagination import paginate_queryset
from users.permissions import IsAdmin, IsDoctor
import mongoengine.queryset.visitor as Q

class AppointmentListView(APIView):
    """
    List all appointments for the authenticated doctor, or create a new appointment.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role == 'ADMIN':
            appointments = Appointment.objects.all()
        else:
            appointments = Appointment.objects.filter(doctor=request.user)
            
        paginated_data = paginate_queryset(appointments, request)
        serializer = AppointmentSerializer(paginated_data['items'], many=True)
        
        return Response({
            'appointments': serializer.data,
            'total': paginated_data['total'],
            'page': paginated_data['page'],
            'total_pages': paginated_data['total_pages']
        })

    def post(self, request):
        serializer = AppointmentSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AppointmentSearchView(APIView):
    """
    Search appointments by patient name or ID.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        query = request.query_params.get('q', '')
        date_query = request.query_params.get('date')
        status_query = request.query_params.get('status')

        if request.user.role == 'ADMIN':
            base_qs = Appointment.objects.all()
        else:
            base_qs = Appointment.objects.filter(doctor=request.user)

        filters = Q.Q()
        
        if query:
            filters &= (Q.Q(patient__full_name__icontains=query) | Q.Q(patient__id__icontains=query))
        
        if status_query:
            filters &= Q.Q(status=status_query)
            
        if date_query:
            try:
                # Expecting YYYY-MM-DD
                dt = datetime.datetime.strptime(date_query, '%Y-%m-%d')
                # Filter for the whole day
                filters &= Q.Q(appointment_date__gte=dt.replace(hour=0, minute=0, second=0))
                filters &= Q.Q(appointment_date__lte=dt.replace(hour=23, minute=59, second=59))
            except ValueError:
                pass

        if not (query or date_query or status_query):
            return Response([])

        search_results = base_qs.filter(filters)
        serializer = AppointmentSerializer(search_results, many=True)
        return Response(serializer.data)


class AppointmentDetailView(APIView):
    """
    Retrieve or update appointment (e.g., mark as done).
    """
    permission_classes = [IsAuthenticated]

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
            
        # Outcomes: showedUp, wasLate
        showed_up = request.data.get('showedUp')
        was_late = request.data.get('wasLate', False)
        
        if showed_up is not None:
            appointment.mark_done(showed_up=showed_up, was_late=was_late)
            serializer = AppointmentSerializer(appointment)
            return Response(serializer.data)
            
        return Response({'error': 'showedUp field is required for outcome tracking.'}, status=status.HTTP_400_BAD_REQUEST)


class AppointmentCancelView(APIView):
    """
    Cancel a pending appointment.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, appointment_id):
        try:
            if request.user.role == 'ADMIN':
                appointment = Appointment.objects.get(id=appointment_id)
            else:
                appointment = Appointment.objects.get(id=appointment_id, doctor=request.user)
            
            appointment.cancel()
            return Response({'status': 'canceled'})
        except Appointment.DoesNotExist:
            return Response({'error': 'Appointment not found.'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
class DoctorAppointmentsView(APIView):
    """
    Admin endpoint to view all appointments for a specific doctor.
    """
    permission_classes = [IsAdmin]

    def get(self, request, doctor_id):
        try:
            doctor = User.objects.get(id=doctor_id, role='DOCTOR')
        except User.DoesNotExist:
            return Response({'error': 'Doctor not found.'}, status=status.HTTP_404_NOT_FOUND)

        appointments = Appointment.objects.filter(doctor=doctor)
        paginated_data = paginate_queryset(appointments, request)
        serializer = AppointmentSerializer(paginated_data['items'], many=True)
        
        return Response({
            'appointments': serializer.data,
            'total': paginated_data['total'],
            'page': paginated_data['page'],
            'total_pages': paginated_data['total_pages']
        })
