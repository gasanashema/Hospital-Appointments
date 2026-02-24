import os
import django
import mongoengine
from django.conf import settings

# Set up Django environment
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "health_sphere_backend.settings")
django.setup()

from users.models import User

def seed():
    # Connection is already established during django.setup() 
    # via CoreConfig.ready() in core/apps.py
    
    email = "admin@healthsphere.com"
    if User.objects(email=email).count() == 0:
        admin = User(
            email=email,
            full_name="Admin User",
            role="ADMIN",
            is_active=True
        )
        admin.set_password("admin123")
        admin.save()
        print(f"✅ Created admin user: {email} / admin123")
    else:
        print(f"ℹ️ Admin user {email} already exists.")

if __name__ == "__main__":
    seed()
