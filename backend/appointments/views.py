from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from .models import Appointment
from .serializers import AppointmentSerializer
from core.pagination import paginate_queryset
from users.permissions import IsAdmin, IsDoctor, RequirePasswordChange
import mongoengine.queryset.visitor as Q

class AppointmentListView(APIView):
    """
    List all appointments for the authenticated doctor, or create a new appointment.
    """
    permission_classes = [IsAuthenticated, RequirePasswordChange]

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
    permission_classes = [IsAuthenticated, RequirePasswordChange]

    def get(self, request):
        query = request.query_params.get('q', '')
        if not query:
            return Response([])

        if request.user.role == 'ADMIN':
            base_qs = Appointment.objects.all()
        else:
            base_qs = Appointment.objects.filter(doctor=request.user)

        # Partial match on patient name or ID
        search_results = base_qs.filter(
            Q.Q(patient__full_name__icontains=query) | Q.Q(patient__id__icontains=query)
        )
        
        serializer = AppointmentSerializer(search_results, many=True)
        return Response(serializer.data)


class AppointmentDetailView(APIView):
    """
    Retrieve or update appointment (e.g., mark as done).
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
    permission_classes = [IsAuthenticated, RequirePasswordChange]

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
