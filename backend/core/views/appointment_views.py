"""
core/views/appointment_views.py

REST API views for Appointment management.

Endpoints:
  POST  /api/appointments/          → create appointment + auto-predict
  GET   /api/appointments/          → list all appointments
  PATCH /api/appointments/{id}/     → mark done (showedUp, wasLate)
  POST  /api/appointments/{id}/cancel/ → cancel if pending
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status as http_status
from mongoengine.errors import ValidationError as MEValidationError

from core.models.appointment import Appointment, Prediction
from core.models.patient import Patient
from core.serializers.appointment_serializer import (
    AppointmentOutputSerializer,
    AppointmentCreateSerializer,
    AppointmentUpdateSerializer,
)
from core.services.ml_service import predict_appointment, record_outcome


class AppointmentListView(APIView):
    """
    GET  /api/appointments/ — list all appointments (newest first)
    POST /api/appointments/ — create + auto-generate prediction
    """

    def get(self, request):
        appointments = Appointment.objects.order_by("-created_at").select_related()
        data = AppointmentOutputSerializer(appointments, many=True).data
        return Response(data)

    def post(self, request):
        # ── 1. Validate input ────────────────────────────────────────────────
        serializer = AppointmentCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=http_status.HTTP_400_BAD_REQUEST)

        validated = serializer.validated_data
        patient_id = validated["patientId"]
        appointment_dt = validated["appointment_dt"]
        sms_received = validated["smsReceived"]

        # ── 2. Load patient ──────────────────────────────────────────────────
        patient = Patient.objects(id=patient_id).first()
        if not patient:
            return Response(
                {"error": f"Patient '{patient_id}' not found."},
                status=http_status.HTTP_404_NOT_FOUND
            )

        # ── 3. Run ML prediction ─────────────────────────────────────────────
        try:
            prediction_result = predict_appointment(
                age=patient.age,
                attendance_score=patient.attendance_score,
                sms_received=sms_received,
            )
        except RuntimeError as e:
            # ML model not loaded — still create appointment without prediction
            prediction_result = {
                "predicted_label": "no-show",
                "predicted_probability": 0.5,
                "model_version": "unavailable",
            }

        # ── 4. Build embedded Prediction document ────────────────────────────
        embedded_prediction = Prediction(
            predicted_label=prediction_result["predicted_label"],
            predicted_probability=prediction_result["predicted_probability"],
            model_version=prediction_result["model_version"],
        )

        # ── 5. Create and save Appointment ───────────────────────────────────
        appointment = Appointment(
            patient=patient,
            appointment_date=appointment_dt,
            sms_received=sms_received,
            status="pending",
            prediction=embedded_prediction,
        )
        appointment.save()

        return Response(
            AppointmentOutputSerializer(appointment).data,
            status=http_status.HTTP_201_CREATED
        )


class AppointmentDetailView(APIView):
    """
    PATCH /api/appointments/{id}/ — mark as done with outcome data
    """

    def get_appointment(self, appointment_id):
        try:
            return Appointment.objects(id=appointment_id).first()
        except Exception:
            return None

    def patch(self, request, appointment_id):
        appointment = self.get_appointment(appointment_id)
        if not appointment:
            return Response(
                {"error": "Appointment not found."},
                status=http_status.HTTP_404_NOT_FOUND
            )

        # Validate update payload
        serializer = AppointmentUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=http_status.HTTP_400_BAD_REQUEST)

        validated = serializer.validated_data
        showed_up = validated["showed_up"]
        was_late = validated.get("was_late", False)

        # Business rule: only pending appointments can be marked done
        try:
            appointment.mark_done(showed_up=showed_up, was_late=was_late)
        except MEValidationError as e:
            return Response({"error": str(e)}, status=http_status.HTTP_400_BAD_REQUEST)

        # Update patient's attendance score after marking done
        _update_patient_attendance_score(appointment.patient)

        # ── Continuous learning: feed this outcome back to the model ──────────
        # Every RETRAIN_EVERY_N outcomes, a background retrain is triggered
        record_outcome()

        return Response(AppointmentOutputSerializer(appointment).data)


class AppointmentCancelView(APIView):
    """
    POST /api/appointments/{id}/cancel/ — cancel appointment (only if pending)
    """

    def post(self, request, appointment_id):
        try:
            appointment = Appointment.objects(id=appointment_id).first()
        except Exception:
            appointment = None

        if not appointment:
            return Response(
                {"error": "Appointment not found."},
                status=http_status.HTTP_404_NOT_FOUND
            )

        # Business rule: cannot cancel a done appointment
        try:
            appointment.cancel()
        except MEValidationError as e:
            return Response({"error": str(e)}, status=http_status.HTTP_400_BAD_REQUEST)

        return Response(AppointmentOutputSerializer(appointment).data)


# ── Helper ────────────────────────────────────────────────────────────────────

def _update_patient_attendance_score(patient: Patient):
    """
    Recompute and update a patient's attendance_score based on all their
    completed (done) appointments. Called after each appointment is marked done.

    attendance_score = (showed_up count / total done count) * 100
    """
    try:
        done_appointments = Appointment.objects(
            patient=patient,
            status="done"
        )
        total = done_appointments.count()
        if total == 0:
            return

        showed_count = done_appointments.filter(showed_up=True).count()
        new_score = round((showed_count / total) * 100, 1)
        patient.attendance_score = new_score
        patient.save()
    except Exception as e:
        # Non-critical — log and continue
        print(f"⚠️  Failed to update attendance score for {patient.id}: {e}")
