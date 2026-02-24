from django.urls import path, include

urlpatterns = [
    path("api/auth/", include("auth_service.urls")),
    path("api/admin/", include("users.urls_admin")),
    path("api/profile/", include("users.urls_profile")),
    path("api/patients/", include("patients.urls")),
    path("api/appointments/", include("appointments.urls")),
    path("api/predictions/", include("predictions.urls")),
    path("api/analytics/", include("analytics.urls")),
]
