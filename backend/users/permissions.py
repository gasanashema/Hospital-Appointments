from rest_framework.permissions import BasePermission

class IsAdmin(BasePermission):
    """
    Allows access only to users with the ADMIN role.
    """
    def has_permission(self, request, view):
        return bool(request.user and hasattr(request.user, 'role') and request.user.role == 'ADMIN')

class IsDoctor(BasePermission):
    """
    Allows access only to users with the DOCTOR role.
    """
    def has_permission(self, request, view):
        return bool(request.user and hasattr(request.user, 'role') and request.user.role == 'DOCTOR')

class RequirePasswordChange(BasePermission):
    """
    Blocks access to all endpoints (except profile password change) if the user
    is flagged for a forced password change (first-time login).
    """
    def has_permission(self, request, view):
        if not request.user:
            return False
        
        # Allow access to ChangePasswordView
        from users.views.profile_views import ChangePasswordView
        if isinstance(view, ChangePasswordView):
            return True
            
        return not getattr(request.user, 'force_password_change', False)
