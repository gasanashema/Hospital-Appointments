"""
core/serializers/appointment_serializer.py

Serializers for Appointment and its embedded Prediction.

Key mappings (MongoDB field → JSON response):
  - appointment_date  → date (date only, "YYYY-MM-DD") + time ("HH:MM")
  - sms_received      → smsReceived
  - showed_up         → showedUp
  - was_late          → wasLate
  - patient (ref)     → patientId + patientName (denormalized for frontend)

Prediction mapping:
  - predicted_label       → "Show" | "No-show" (capitalized to match frontend)
  - predicted_probability → probability (integer 0–100 %)
"""

from datetime import datetime, timezone
from rest_framework import serializers
from core.models.appointment import Appointment, Prediction
from core.models.patient import Patient


class PredictionOutputSerializer(serializers.Serializer):
    """
    Serializes the embedded Prediction for API responses.
    Maps internal lowercase labels to frontend-expected capitalized format.
    Converts probability float (0.0–1.0) to integer percentage (0–100).
    """
    label = serializers.SerializerMethodField()
    probability = serializers.SerializerMethodField()

    def get_label(self, obj):
        # Frontend expects "Show" or "No-show" (capital S, lowercase n-s)
        mapping = {"show": "Show", "no-show": "No-show"}
        return mapping.get(obj.predicted_label, obj.predicted_label)

    def get_probability(self, obj):
        # Convert 0.0–1.0 float to integer percentage
        return round(obj.predicted_probability * 100)


class AppointmentOutputSerializer(serializers.Serializer):
    """
    Full appointment serializer for API responses.
    Produces the exact JSON shape the frontend expects.
    """
    id = serializers.SerializerMethodField()
    patientId = serializers.SerializerMethodField()
    patientName = serializers.SerializerMethodField()
    date = serializers.SerializerMethodField()
    time = serializers.SerializerMethodField()
    smsReceived = serializers.BooleanField(source="sms_received")
    status = serializers.CharField()
    showedUp = serializers.SerializerMethodField()
    wasLate = serializers.SerializerMethodField()
    prediction = serializers.SerializerMethodField()

    def get_id(self, obj):
        return str(obj.id)

    def get_patientId(self, obj):
        # ReferenceField — obj.patient is the Patient document
        try:
            return obj.patient.id
        except Exception:
            return None

    def get_patientName(self, obj):
        try:
            return obj.patient.full_name
        except Exception:
            return "Unknown"

    def get_date(self, obj):
        # Return date portion as "YYYY-MM-DD"
        return obj.appointment_date.strftime("%Y-%m-%d")

    def get_time(self, obj):
        # Return time portion as "HH:MM"
        return obj.appointment_date.strftime("%H:%M")

    def get_showedUp(self, obj):
        # Return None (not false) for pending appointments
        return obj.showed_up

    def get_wasLate(self, obj):
        return obj.was_late

    def get_prediction(self, obj):
        if obj.prediction:
            return PredictionOutputSerializer(obj.prediction).data
        return None


class AppointmentCreateSerializer(serializers.Serializer):
    """
    Input serializer for creating a new appointment.
    Used by POST /api/appointments/.

    The frontend sends:
      { patientId, date, time, smsReceived }
    """
    patientId = serializers.CharField(required=True)
    date = serializers.DateField(required=True)   # "YYYY-MM-DD"
    time = serializers.CharField(required=True)   # "HH:MM"
    smsReceived = serializers.BooleanField(default=False)

    def validate_patientId(self, value):
        patient = Patient.objects(id=value).first()
        if not patient:
            raise serializers.ValidationError(f"Patient with ID '{value}' not found.")
        return value

    def validate(self, data):
        """Combine date + time into appointment_date and validate it's not in the past."""
        from datetime import datetime as dt, time as t
        try:
            time_parts = data["time"].split(":")
            hour, minute = int(time_parts[0]), int(time_parts[1])
            appointment_dt = dt(
                data["date"].year, data["date"].month, data["date"].day,
                hour, minute, 0
            )
        except (ValueError, IndexError, AttributeError):
            raise serializers.ValidationError("Invalid date or time format.")

        # Business rule: cannot create appointment in the past
        now = dt.utcnow()
        if appointment_dt < now:
            raise serializers.ValidationError(
                "Cannot create an appointment in the past."
            )

        data["appointment_dt"] = appointment_dt
        return data


class AppointmentUpdateSerializer(serializers.Serializer):
    """
    Input serializer for updating an appointment (PATCH).
    Allows setting showed_up, was_late, and transitioning status to 'done'.

    Used by PATCH /api/appointments/{id}/.
    """
    showedUp = serializers.BooleanField(required=True, source="showed_up")
    wasLate = serializers.BooleanField(required=False, default=False, source="was_late")
