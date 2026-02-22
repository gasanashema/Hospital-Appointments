"""
core/urls.py

URL routing for the core app.
All routes are prefixed with /api/ from the root urls.py.

Patient endpoints (the frontend uses /users/ not /patients/):
  /api/users/          → GET list, POST create
  /api/users/{id}/     → PATCH update, DELETE remove

Appointment endpoints:
  /api/appointments/           → GET list, POST create+predict
  /api/appointments/{id}/      → PATCH mark done
  /api/appointments/{id}/cancel/ → POST cancel

Stats:
  /api/stats/predictions/      → GET accuracy stats

Auth (optional, disable via ENABLE_AUTH=False in .env):
  /api/auth/login/             → POST get demo token
"""

from django.urls import path
from core.views.patient_views import PatientListView, PatientDetailView
from core.views.appointment_views import (
    AppointmentListView,
    AppointmentDetailView,
    AppointmentCancelView,
)
from core.views.stats_views import PredictionStatsView
from core.views.admin_views import ManualRetrainView, ModelStatusView

urlpatterns = [
    # ── Patient (User) endpoints ─────────────────────────────────────────────
    path("users/", PatientListView.as_view(), name="patient-list"),
    path("users/<str:patient_id>/", PatientDetailView.as_view(), name="patient-detail"),

    # ── Appointment endpoints ─────────────────────────────────────────────────
    path("appointments/", AppointmentListView.as_view(), name="appointment-list"),
    path("appointments/<str:appointment_id>/", AppointmentDetailView.as_view(), name="appointment-detail"),
    path("appointments/<str:appointment_id>/cancel/", AppointmentCancelView.as_view(), name="appointment-cancel"),

    # ── Stats ─────────────────────────────────────────────────────────────────
    path("stats/predictions/", PredictionStatsView.as_view(), name="prediction-stats"),

    # ── Admin: model management ────────────────────────────────────────────
    path("admin/retrain/", ManualRetrainView.as_view(), name="admin-retrain"),
    path("admin/model-status/", ModelStatusView.as_view(), name="admin-model-status"),
]

# ── Demo Auth (append if ENABLE_AUTH is True) ─────────────────────────────────
from django.conf import settings
if getattr(settings, "ENABLE_AUTH", False):
    from core.views.auth_views import DemoLoginView
    urlpatterns += [
        path("auth/login/", DemoLoginView.as_view(), name="auth-login"),
    ]
