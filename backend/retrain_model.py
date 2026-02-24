import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'health_sphere_backend.settings')
django.setup()

from predictions.services.ml_service import MLService

def retrain():
    print("Starting manual model retraining...")
    service = MLService()
    try:
        version, accuracy = service.train_model()
        print(f"✅ Retraining successful!")
        print(f"   Version: {version}")
        print(f"   Accuracy: {accuracy:.2%}")
    except Exception as e:
        print(f"❌ Retraining failed: {e}")

if __name__ == "__main__":
    retrain()
