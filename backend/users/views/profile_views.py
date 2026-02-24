from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated


class ProfileView(APIView):
    """
    Get or update the current user's profile.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response({
            'id': str(user.id),
            'email': user.email,
            'full_name': user.full_name,
            'role': user.role,
            'created_at': user.created_at
        }, status=status.HTTP_200_OK)

    def patch(self, request):
        user = request.user
        full_name = request.data.get('full_name')
        
        if full_name:
            user.full_name = full_name
            user.save()
            return Response({'message': 'Profile updated successfully.'}, status=status.HTTP_200_OK)
        
        return Response({'error': 'No changes provided.'}, status=status.HTTP_400_BAD_REQUEST)


class ChangePasswordView(APIView):
    """
    Change the current user's password.
    Forces clearing the force_password_change flag.
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        user = request.user
        old_password = request.data.get('old_password')
        new_password = request.data.get('new_password')

        if not old_password or not new_password:
            return Response({'error': 'Old and new passwords are required.'}, status=status.HTTP_400_BAD_REQUEST)

        if not user.check_password(old_password):
            return Response({'error': 'Invalid old password.'}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.force_password_change = False
        user.save()

        return Response({'message': 'Password changed successfully.'}, status=status.HTTP_200_OK)
