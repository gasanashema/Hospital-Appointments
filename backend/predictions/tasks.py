from celery import shared_task
from .services.ml_service import MLService
from django.core.mail import send_mail
from django.conf import settings

@shared_task
def train_model_task():
    """
    Async task to retrain the ML model.
    """
    ml_service = MLService()
    version, accuracy = ml_service.train_model()
    return f"Model trained: {version} with accuracy {accuracy:.2%}"

@shared_task
def send_otp_email_task(email, full_name, otp_code):
    """
    Async task to send OTP emails.
    """
    subject = 'Welcome to Health Sphere - Your Temporary Password'
    message = (
        f'Hello {full_name},\n\n'
        f'Your account has been created by an administrator. Your temporary password (OTP) is: {otp_code}\n\n'
        f'Please log in and change your password immediately.\n\n'
        f'Best regards,\n'
        f'Health Sphere Team'
    )
    
    send_mail(
        subject,
        message,
        settings.DEFAULT_FROM_EMAIL,
        [email],
        fail_silently=False,
    )
    return f"OTP sent to {email}"
