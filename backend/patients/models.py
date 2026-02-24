from datetime import datetime
from mongoengine import Document, StringField, IntField, FloatField, DateTimeField, ReferenceField
from users.models import User

class Patient(Document):
    """
    MongoDB document representing a patient in the system.
    Linked to a specific doctor.
    """
    # Custom string primary key (e.g., "P-001")
    id = StringField(primary_key=True, required=True)
    
    # Linked doctor (ADMINs can also manage if needed, but usually DOCTORs)
    doctor = ReferenceField(User, required=True)

    # Patient demographics
    full_name = StringField(required=True, max_length=200)
    age = IntField(required=True, min_value=0, max_value=120)
    gender = StringField(required=True, choices=["M", "F"], default="M")

    # Computed attendance score (0–100); new patients get 75 as a neutral baseline
    attendance_score = FloatField(default=75.0, min_value=0.0, max_value=100.0)

    created_at = DateTimeField(default=datetime.utcnow)

    meta = {
        "collection": "patients",
        "ordering": ["-created_at"],
        "indexes": ["full_name", "doctor"],
    }

    def __str__(self):
        return f"{self.full_name} ({self.id})"
