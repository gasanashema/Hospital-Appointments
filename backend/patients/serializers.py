from rest_framework import serializers
from .models import Patient

class PatientSerializer(serializers.Serializer):
    id = serializers.CharField()
    fullName = serializers.CharField(source='full_name')
    age = serializers.IntegerField()
    gender = serializers.ChoiceField(choices=["M", "F"])
    attendanceScore = serializers.FloatField(source='attendance_score', read_only=True)
    doctorId = serializers.CharField(source='doctor.id', read_only=True)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)

    def create(self, validated_data):
        request = self.context.get('request')
        doctor = request.user
        return Patient(doctor=doctor, **validated_data).save()

    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        return instance.save()
