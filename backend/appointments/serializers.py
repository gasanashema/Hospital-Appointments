from rest_framework import serializers
from .models import Appointment, Prediction
from patients.models import Patient
import datetime

class PredictionSerializer(serializers.Serializer):
    label = serializers.SerializerMethodField()
    probability = serializers.SerializerMethodField()
    modelVersion = serializers.CharField(source='model_version', read_only=True)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)

    def get_label(self, obj):
        return obj.predicted_label.capitalize() if obj.predicted_label else "Unknown"

    def get_probability(self, obj):
        return round(obj.predicted_probability * 100) if obj.predicted_probability is not None else 0

class AppointmentSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    patientId = serializers.CharField(source='patient.id', required=False, read_only=True)
    patientIdInput = serializers.CharField(write_only=True, required=True)
    patientName = serializers.CharField(source='patient.full_name', read_only=True)
    appointmentDate = serializers.DateTimeField(source='appointment_date')
    date = serializers.SerializerMethodField()
    time = serializers.SerializerMethodField()
    smsReceived = serializers.BooleanField(source='sms_received', default=False)
    status = serializers.ChoiceField(choices=["pending", "done", "canceled"], default="pending")
    showedUp = serializers.BooleanField(source='showed_up', allow_null=True, required=False)
    wasLate = serializers.BooleanField(source='was_late', allow_null=True, required=False)
    prediction = PredictionSerializer(read_only=True)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)

    def get_date(self, obj):
        return obj.appointment_date.strftime("%Y-%m-%d")

    def get_time(self, obj):
        return obj.appointment_date.strftime("%H:%M")

    def validate_patientIdInput(self, value):
        try:
            return Patient.objects.get(id=value)
        except Patient.DoesNotExist:
            raise serializers.ValidationError("Patient not found.")

    def create(self, validated_data):
        request = self.context.get('request')
        doctor = request.user
        patient = validated_data.pop('patientIdInput')
        
        appointment = Appointment(
            doctor=doctor,
            patient=patient,
            **validated_data
        )
        
        # Trigger auto-prediction
        from predictions.services.ml_service import MLService
        ml_service = MLService()
        
        # Map sex: M -> 0, F -> 1
        sex_map = {'M': 0, 'F': 1}
        sex = sex_map.get(patient.gender, 0)
        
        # Scheduling interval
        now = datetime.datetime.utcnow()
        scheduling_interval = (appointment.appointment_date - now).days
        if scheduling_interval < 0:
            scheduling_interval = 0

        try:
            label, prob, version = ml_service.predict(
                age=patient.age,
                sex=sex,
                scheduling_interval=scheduling_interval,
                sms_received=int(appointment.sms_received),
                attendance_score=patient.attendance_score
            )
            
            appointment.prediction = Prediction(
                predicted_label=label,
                predicted_probability=prob,
                model_version=version
            )
        except Exception as e:
            print(f"Prediction failed: {e}")
            
        return appointment.save()
