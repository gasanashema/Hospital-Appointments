from rest_framework import serializers
from users.models import User
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.hashers import check_password

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        email = attrs.get('email', '').strip().lower()
        password = attrs.get('password')

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise serializers.ValidationError("Invalid email or password.")

        if not user.is_active:
            raise serializers.ValidationError("User account is disabled.")

        if not user.check_password(password):
            raise serializers.ValidationError("Invalid email or password.")

        return {
            'user': user
        }

    def get_tokens(self, user):
        refresh = RefreshToken()
        # Manually set the user identifier in the token payload.
        # SimpleJWT expects 'user_id' by default (as per settings).
        refresh['user_id'] = str(user.id)
        
        return {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }
