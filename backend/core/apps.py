"""
core/apps.py — AppConfig for the core app.

On startup:
  1. Connects to MongoDB via MongoEngine using MONGO_URI from settings.
  2. Loads (or trains) the ML model so it's ready to serve predictions.
"""

import mongoengine
from django.apps import AppConfig
from django.conf import settings


class CoreConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "core"

    def ready(self):
        # ── 1. Connect to MongoDB ────────────────────────────────────────────
        try:
            mongoengine.connect(host=settings.MONGO_URI)
            print("✅ MongoEngine connected to MongoDB Atlas")
        except Exception as e:
            print(f"❌ MongoEngine connection failed: {e}")

        # ── 2. Load or train ML model ────────────────────────────────────────
        # Import here to avoid circular imports and ensure Django is fully loaded
        try:
            from core.services.ml_service import load_or_train_model
            load_or_train_model()
        except Exception as e:
            print(f"⚠️  ML model initialization skipped: {e}")
