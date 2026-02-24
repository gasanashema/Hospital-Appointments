from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from users.models import User, OTP
from users.permissions import IsAdmin, RequirePasswordChange
from users.utils import generate_otp, get_otp_expiry
from predictions.tasks import send_otp_email_task
from django.conf import settings

class CreateDoctorView(APIView):
    """
    Admin endpoint to create a new doctor and send an OTP password via email.
    """
    permission_classes = [IsAdmin, RequirePasswordChange]

    def post(self, request):
        email = request.data.get('email')
        full_name = request.data.get('full_name')

        if not email or not full_name:
            return Response({'error': 'Email and full name are required.'}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(email=email).first():
            return Response({'error': 'User with this email already exists.'}, status=status.HTTP_400_BAD_REQUEST)

        # Generate OTP as initial password
        otp_code = generate_otp()
        
        # Create user
        user = User(
            email=email,
            full_name=full_name,
            role='DOCTOR',
            force_password_change=True
        )
        user.set_password(otp_code)
        user.save()

        # Save OTP record for auditing/onboarding tracking
        otp = OTP(
            user=user,
            otp_code=otp_code,
            expires_at=get_otp_expiry(minutes=60)
        )
        otp.save()

        # Send email asynchronously
        send_otp_email_task.delay(email, full_name, otp_code)

        return Response({
            'message': 'Doctor created successfully. OTP delivery initiated.',
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
    permission_classes = [IsAdmin, RequirePasswordChange]

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
