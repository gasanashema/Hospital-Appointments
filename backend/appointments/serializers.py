from rest_framework import serializers
from .models import Appointment, Prediction
from patients.models import Patient

class PredictionSerializer(serializers.Serializer):
    predicted_label = serializers.CharField(read_only=True)
    predicted_probability = serializers.FloatField(read_only=True)
    model_version = serializers.CharField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)

class AppointmentSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    patient_id = serializers.CharField()
    appointment_date = serializers.DateTimeField()
    sms_received = serializers.BooleanField(default=False)
    status = serializers.ChoiceField(choices=["pending", "done", "canceled"], default="pending")
    showed_up = serializers.BooleanField(allow_null=True, required=False)
    was_late = serializers.BooleanField(allow_null=True, required=False)
    prediction = PredictionSerializer(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)

    def validate_patient_id(self, value):
        try:
            return Patient.objects.get(id=value)
        except Patient.DoesNotExist:
            raise serializers.ValidationError("Patient not found.")

    def create(self, validated_data):
        request = self.context.get('request')
        doctor = request.user
        patient = validated_data.pop('patient_id')
        
        appointment = Appointment(
            doctor=doctor,
            patient=patient,
            **validated_data
        )
        
        # Trigger auto-prediction
        from predictions.services.ml_service import MLService
        ml_service = MLService()
        
        # We need to map sex: M -> 0, F -> 1
        sex_map = {'M': 0, 'F': 1}
        sex = sex_map.get(patient.gender, 0)
        
        # Scheduling interval: appointment_date - today
        from datetime import datetime
        now = datetime.utcnow()
        if appointment.appointment_date < now:
             # Business rule: Cannot create appointment in past
             # But let's allow it for historical data ingestion if needed, 
             # though Phase 9 says "Cannot create appointment in past".
             # We'll enforce validation in the view.
             pass

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
            # Failed prediction shouldn't block appointment creation
            print(f"Prediction failed: {e}")
            
        return appointment.save()
