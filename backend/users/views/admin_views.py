from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from users.models import User
from users.permissions import IsAdmin
from django.conf import settings

class CreateDoctorView(APIView):
    """
    Admin endpoint to create a new doctor and send an OTP password via email.
    """
    permission_classes = [IsAdmin]

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        full_name = request.data.get('full_name')
        password = request.data.get('password')

        if not email or not full_name or not password:
            return Response({'error': 'Email, full name, and password are required.'}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(email=email).first():
            return Response({'error': 'User with this email already exists.'}, status=status.HTTP_400_BAD_REQUEST)

        # Create user
        user = User(
            email=email,
            full_name=full_name,
            role='DOCTOR',
            is_active=True,
            force_password_change=False
        )
        user.set_password(password)
        user.save()

        return Response({
            'message': 'Doctor created successfully with manual password.',
            'user': {
                'id': str(user.id),
                'email': user.email,
                'full_name': user.full_name
            }
        }, status=status.HTTP_201_CREATED)


class ListDoctorsView(APIView):
    """
    Admin endpoint to view all doctors.
    """
    permission_classes = [IsAdmin]

    def get(self, request):
        doctors = User.objects.filter(role='DOCTOR')
        data = [{
            'id': str(d.id),
            'email': d.email,
            'full_name': d.full_name,
            'is_active': d.is_active,
            'created_at': d.created_at
        } for d in doctors]
        return Response(data, status=status.HTTP_200_OK)
class DoctorDetailView(APIView):
    """
    Admin endpoint to edit doctor details or toggle active status.
    """
    permission_classes = [IsAdmin]

    def patch(self, request, doctor_id):
        try:
            doctor = User.objects.get(id=doctor_id, role='DOCTOR')
        except User.DoesNotExist:
            return Response({'error': 'Doctor not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Update allowed fields
        if 'full_name' in request.data:
            doctor.full_name = request.data['full_name']
        if 'email' in request.data:
            new_email = request.data['email'].strip().lower()
            if User.objects.filter(email=new_email).exclude(id=doctor.id).first():
                return Response({'error': 'Email already in use.'}, status=status.HTTP_400_BAD_REQUEST)
            doctor.email = new_email
        if 'is_active' in request.data:
            doctor.is_active = bool(request.data['is_active'])

        doctor.save()
        return Response({
            'id': str(doctor.id),
            'email': doctor.email,
            'full_name': doctor.full_name,
            'is_active': doctor.is_active
        })
