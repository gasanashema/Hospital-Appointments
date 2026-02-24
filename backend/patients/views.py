from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from .models import Patient
from .serializers import PatientSerializer
from core.pagination import paginate_queryset
from users.permissions import IsAdmin, IsDoctor
import mongoengine.queryset.visitor as Q

class PatientListView(APIView):
    """
    List all patients for the authenticated doctor, or create a new patient.
    Supports pagination.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Doctors can see all patients as requested.
        patients = Patient.objects.all()
        
        paginated_data = paginate_queryset(patients, request)
        serializer = PatientSerializer(paginated_data['items'], many=True)
        
        return Response({
            'patients': serializer.data,
            'total': paginated_data['total'],
            'page': paginated_data['page'],
            'total_pages': paginated_data['total_pages']
        })

    def post(self, request):
        serializer = PatientSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PatientSearchView(APIView):
    """
    Search patients by ID or name (partial match).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        query = request.query_params.get('q', '')
        if not query:
            return Response([])

        # Doctors can search through all patients.
        base_qs = Patient.objects.all()

        # Search by ID or full_name
        search_results = base_qs.filter(
            Q.Q(id__icontains=query) | Q.Q(full_name__icontains=query)
        )
        
        serializer = PatientSerializer(search_results, many=True)
        return Response(serializer.data)


class PatientDetailView(APIView):
    """
    Retrieve, update or delete a patient.
    """
    permission_classes = [IsAuthenticated]

    def get_object(self, patient_id, user):
        try:
            # Doctors can retrieve any patient.
            return Patient.objects.get(id=patient_id)
        except Patient.DoesNotExist:
            return None

    def get(self, request, patient_id):
        patient = self.get_object(patient_id, request.user)
        if not patient:
            return Response({'error': 'Patient not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = PatientSerializer(patient)
        return Response(serializer.data)

    def patch(self, request, patient_id):
        patient = self.get_object(patient_id, request.user)
        if not patient:
            return Response({'error': 'Patient not found.'}, status=status.HTTP_404_NOT_FOUND)
            
        serializer = PatientSerializer(patient, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, patient_id):
        patient = self.get_object(patient_id, request.user)
        if not patient:
            return Response({'error': 'Patient not found.'}, status=status.HTTP_404_NOT_FOUND)
        patient.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
