"""
core/serializers/patient_serializer.py

Serializers for the Patient document.

Important: The frontend expects camelCase field names:
  - full_name → fullName
  - attendance_score → attendanceScore
  - created_at → createdAt

Since MongoEngine documents are not Django ORM models, we use
DRF's Serializer (not ModelSerializer) and handle field mapping manually.
"""

from rest_framework import serializers
from core.models.patient import Patient


class PatientSerializer(serializers.Serializer):
    """
    Full patient serializer — used for GET list/detail responses.
    Returns data in camelCase to match frontend expectations.
    """
    id = serializers.CharField(read_only=True)
    fullName = serializers.CharField(source="full_name")
    age = serializers.IntegerField(min_value=0, max_value=120)
    gender = serializers.CharField()
    attendanceScore = serializers.FloatField(source="attendance_score", read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)

    def validate_fullName(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Full name cannot be empty.")
        return value.strip()

    def validate_age(self, value):
        if value < 0 or value > 120:
            raise serializers.ValidationError("Age must be between 0 and 120.")
        return value

    def create(self, validated_data):
        patient = Patient(
            id=validated_data["id"],
            full_name=validated_data["full_name"],
            age=validated_data["age"],
            gender=validated_data.get("gender", "M"),
        )
        patient.save()
        return patient

    def update(self, instance, validated_data):
        instance.full_name = validated_data.get("full_name", instance.full_name)
        instance.age = validated_data.get("age", instance.age)
        instance.gender = validated_data.get("gender", instance.gender)
        instance.save()
        return instance


class PatientCreateSerializer(serializers.Serializer):
    """
    Input serializer for creating a patient.
    """
    id = serializers.CharField(required=True)
    fullName = serializers.CharField(source="full_name", required=True)
    age = serializers.IntegerField(min_value=0, max_value=120, required=True)
    gender = serializers.ChoiceField(choices=["M", "F"], required=True)

    def validate_id(self, value):
        if Patient.objects(id=value).first():
            raise serializers.ValidationError(f"A patient with ID '{value}' already exists.")
        return value

    def validate_fullName(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Full name cannot be empty.")
        return value.strip()

    def create(self, validated_data):
        patient = Patient(
            id=validated_data["id"],
            full_name=validated_data["full_name"],
            age=validated_data["age"],
            gender=validated_data["gender"],
        )
        patient.save()
        return patient
