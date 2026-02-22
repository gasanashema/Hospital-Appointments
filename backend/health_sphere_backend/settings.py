"""
Django settings for health_sphere_backend project.
Health Sphere Backend — Innovation Center Production-style demo.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

# ─── Security ────────────────────────────────────────────────────────────────
SECRET_KEY = os.getenv("SECRET_KEY", "django-insecure-dev-key-change-in-production")
DEBUG = os.getenv("DEBUG", "True") == "True"
ALLOW_ALL_ORIGINS = DEBUG  # In prod, set specific origins
ALLOWED_HOSTS = ["*"]  # Restrict in production

# ─── Demo Auth Toggle ─────────────────────────────────────────────────────────
# Set ENABLE_AUTH=True in .env to require token authentication on all endpoints
ENABLE_AUTH = os.getenv("ENABLE_AUTH", "False") == "True"

# ─── Installed Apps ───────────────────────────────────────────────────────────
INSTALLED_APPS = [
    "django.contrib.contenttypes",
    "django.contrib.staticfiles",
    "rest_framework",
    "corsheaders",
    "core",
]

# ─── Middleware ───────────────────────────────────────────────────────────────
MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",  # Must be before CommonMiddleware
    "django.middleware.security.SecurityMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "health_sphere_backend.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
            ],
        },
    },
]

WSGI_APPLICATION = "health_sphere_backend.wsgi.application"

# ─── Database (MongoDB via MongoEngine) ──────────────────────────────────────
# We use MongoEngine, NOT Django ORM — so no DATABASES config needed for MongoDB.
# The connection is established in core/apps.py on startup.
DATABASES = {}  # Required to suppress Django's DB warnings

# ─── MongoDB Connection ───────────────────────────────────────────────────────
MONGO_URI = os.getenv(
    "MONGO_URI",
    "mongodb://localhost:27017/health_sphere"  # Default to local MongoDB
)

# ─── Django REST Framework ────────────────────────────────────────────────────
REST_FRAMEWORK = {
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
    "DEFAULT_PARSER_CLASSES": [
        "rest_framework.parsers.JSONParser",
    ],
    # Auth is optionally enabled via ENABLE_AUTH setting
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.TokenAuthentication",
    ] if ENABLE_AUTH else [],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ] if ENABLE_AUTH else [
        "rest_framework.permissions.AllowAny",
    ],
    # We don't use Django's auth system (using MongoEngine only), so disable
    # DRF's AnonymousUser which depends on django.contrib.auth
    "UNAUTHENTICATED_USER": None,
}

# ─── CORS ─────────────────────────────────────────────────────────────────────
# Allow the React frontend (Vite default port 5173) to call this backend
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
]
CORS_ALLOW_ALL_ORIGINS = ALLOW_ALL_ORIGINS  # Allow all in debug mode

# ─── Internationalization ─────────────────────────────────────────────────────
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# ─── Static Files ─────────────────────────────────────────────────────────────
STATIC_URL = "static/"

# ─── ML Model Path ────────────────────────────────────────────────────────────
MODEL_PATH = BASE_DIR / "model.pkl"
