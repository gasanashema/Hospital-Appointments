from datetime import datetime
from mongoengine import (
    Document,
    StringField,
    BooleanField,
    DateTimeField,
    ReferenceField,
    EmailField,
)
from django.contrib.auth.hashers import make_password, check_password

class User(Document):
    """
    Unified User model for Doctors and Admins.
    Stored in MongoDB via MongoEngine.
    """
    email = EmailField(unique=True, required=True)
    full_name = StringField(required=True, max_length=200)
    role = StringField(choices=["ADMIN", "DOCTOR"], default="DOCTOR")
    password = StringField(required=True)
    is_active = BooleanField(default=True)
    created_at = DateTimeField(default=datetime.utcnow)
    last_login = DateTimeField()
    # Force password change on first login for systems-created doctors (via Admin)
    force_password_change = BooleanField(default=False)

    meta = {
        "collection": "users",
        "indexes": ["email"],
    }

    def set_password(self, raw_password):
        self.password = make_password(raw_password)

    def check_password(self, raw_password):
        return check_password(raw_password, self.password)

    @property
    def is_authenticated(self):
        return True

    @property
    def is_anonymous(self):
        return False

    def __str__(self):
        return f"{self.full_name} ({self.role})"


class OTP(Document):
    """
    One-Time Password for doctor onboarding.
    """
    user = ReferenceField(User, required=True)
    otp_code = StringField(required=True)
    expires_at = DateTimeField(required=True)
    is_used = BooleanField(default=False)

    meta = {
        "collection": "otps",
        # Auto-delete expired OTPs after expires_at
        "indexes": [{"fields": ["expires_at"], "expireAfterSeconds": 0}],
    }
