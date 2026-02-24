from django.urls import path
from .views.profile_views import ProfileView, ChangePasswordView

urlpatterns = [
    path('', ProfileView.as_view(), name='profile-detail'),
    path('password/', ChangePasswordView.as_view(), name='profile-password'),
]
