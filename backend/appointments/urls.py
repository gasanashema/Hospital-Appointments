from django.urls import path
from .views import AppointmentListView, AppointmentSearchView, AppointmentDetailView, AppointmentCancelView, DoctorAppointmentsView

urlpatterns = [
    path('', AppointmentListView.as_view(), name='appointment-list'),
    path('search/', AppointmentSearchView.as_view(), name='appointment-search'),
    path('doctor/<str:doctor_id>/', DoctorAppointmentsView.as_view(), name='doctor-appointments'),
    path('<str:appointment_id>/', AppointmentDetailView.as_view(), name='appointment-detail'),
    path('<str:appointment_id>/cancel/', AppointmentCancelView.as_view(), name='appointment-cancel'),
]
