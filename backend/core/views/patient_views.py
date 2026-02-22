"""
core/views/patient_views.py

REST API views for Patient CRUD operations.

Endpoints:
  GET    /api/users/         → list all patients
  POST   /api/users/         → create a patient
  PATCH  /api/users/{id}/    → update name/age
  DELETE /api/users/{id}/    → delete patient
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from core.models.patient import Patient
from core.serializers.patient_serializer import PatientSerializer, PatientCreateSerializer


class PatientListView(APIView):
    """
    GET  /api/users/ — list all patients
    POST /api/users/ — create a new patient
    """

    def get(self, request):
        patients = Patient.objects.all()
        data = PatientSerializer(patients, many=True).data
        return Response(data)

    def post(self, request):
        serializer = PatientCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        patient = serializer.save()
        return Response(
            PatientSerializer(patient).data,
            status=status.HTTP_201_CREATED
        )


class PatientDetailView(APIView):
    """
    PATCH  /api/users/{id}/ — update patient name/age
    DELETE /api/users/{id}/ — delete patient
    """

    def get_patient(self, patient_id):
        patient = Patient.objects(id=patient_id).first()
        if not patient:
            return None
        return patient

    def patch(self, request, patient_id):
        patient = self.get_patient(patient_id)
        if not patient:
            return Response(
                {"error": f"Patient '{patient_id}' not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = PatientSerializer(patient, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        updated = serializer.save()
        return Response(PatientSerializer(updated).data)

    def delete(self, request, patient_id):
        patient = self.get_patient(patient_id)
        if not patient:
            return Response(
                {"error": f"Patient '{patient_id}' not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        patient.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
