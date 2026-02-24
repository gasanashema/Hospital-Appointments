from django.urls import path
from .views.admin_views import CreateDoctorView, ListDoctorsView, DoctorDetailView

urlpatterns = [
    path('doctors/', CreateDoctorView.as_view(), name='admin-create-doctor'),
    path('doctors/all/', ListDoctorsView.as_view(), name='admin-list-doctors'),
    path('doctors/<str:doctor_id>/', DoctorDetailView.as_view(), name='admin-doctor-detail'),
]
