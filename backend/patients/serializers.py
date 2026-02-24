from rest_framework import serializers
from .models import Patient

class PatientSerializer(serializers.Serializer):
    id = serializers.CharField()
    full_name = serializers.CharField()
    age = serializers.IntegerField()
    gender = serializers.ChoiceField(choices=["M", "F"])
    attendance_score = serializers.FloatField(read_only=True)
    doctor_id = serializers.CharField(source='doctor.id', read_only=True)
    created_at = serializers.DateTimeField(read_only=True)

    def create(self, validated_data):
        # doctor is passed in context or manually linked
        request = self.context.get('request')
        doctor = request.user
        return Patient(doctor=doctor, **validated_data).save()

    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        return instance.save()
