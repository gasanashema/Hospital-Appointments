import os
import django
import sys

# Set up Django environment
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "health_sphere_backend.settings")
django.setup()

from django.conf import settings
from users.models import User

def create_admin():
    email = "admin@healthsphere.com"
    password = "admin123"
    
    try:
        user = User.objects(email=email).first()
        if not user:
            user = User(
                email=email,
                full_name="Admin User",
                role="ADMIN",
                is_active=True
            )
            user.set_password(password)
            user.save()
            print(f"✅ Admin user created: {email} / {password}")
        else:
            user.set_password(password)
            user.save()
            print(f"✅ Password reset for existing admin: {email} / {password}")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    create_admin()
