from django.urls import path
from .views import PatientListView, PatientSearchView, PatientDetailView

urlpatterns = [
    path('', PatientListView.as_view(), name='patient-list'),
    path('search/', PatientSearchView.as_view(), name='patient-search'),
    path('<str:patient_id>/', PatientDetailView.as_view(), name='patient-detail'),
]
