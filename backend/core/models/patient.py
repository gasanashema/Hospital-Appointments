"""
core/models/patient.py

Patient MongoEngine document.
Stores basic patient demographics and attendance score.

The attendance_score is a computed metric (0-100) based on the patient's
historical show-up rate. It is updated by the backend after each appointment
is marked as done. New patients start with a neutral score of 75.0.
"""

from datetime import datetime
from mongoengine import Document, StringField, IntField, FloatField, DateTimeField


class Patient(Document):
    """
    MongoDB document representing a patient in the system.

    Note: 'id' is a custom StringField primary key (e.g., "P-001")
    rather than a MongoDB ObjectId, to match the frontend's data model.
    """
    # Custom string primary key (e.g., "P-001")
    id = StringField(primary_key=True, required=True)

    # Patient demographics
    full_name = StringField(required=True, max_length=200)
    age = IntField(required=True, min_value=0, max_value=120)

    # Computed attendance score (0–100); new patients get 75 as a neutral baseline
    # Updated after each completed appointment
    attendance_score = FloatField(default=75.0, min_value=0.0, max_value=100.0)

    created_at = DateTimeField(default=datetime.utcnow)

    meta = {
        "collection": "patients",
        "ordering": ["-created_at"],
        "indexes": ["full_name"],
    }

    def __str__(self):
        return f"{self.full_name} ({self.id})"
