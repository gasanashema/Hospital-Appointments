from rest_framework_simplejwt.authentication import JWTAuthentication
from users.models import User
from rest_framework import exceptions

class MongoJWTAuthentication(JWTAuthentication):
    """
    Custom JWT Authentication for MongoEngine User models.
    """
    def get_user(self, validated_token):
        user_id = validated_token['user_id']
        try:
            # MongoEngine's .get() works with StringField IDs
            user = User.objects.get(id=user_id)
            if not user.is_active:
                raise exceptions.AuthenticationFailed('User is inactive', code='user_inactive')
            return user
        except User.DoesNotExist:
            raise exceptions.AuthenticationFailed('User not found', code='user_not_found')
        except Exception as e:
            raise exceptions.AuthenticationFailed(str(e))
