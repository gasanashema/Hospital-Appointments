import random
import string
from datetime import timedelta
from django.utils import timezone

def generate_otp(length=6):
    """
    Generate a random numeric OTP.
    """
    return ''.join(random.choices(string.digits, k=length))

def get_otp_expiry(minutes=15):
    """
    Get the expiry datetime for an OTP.
    """
    return timezone.now() + timedelta(minutes=minutes)
