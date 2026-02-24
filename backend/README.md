# Health Sphere Backend

Enterprise-grade healthcare backend powered by Django, MongoEngine, and Scikit-learn.

## Features

- **JWT Authentication & RBAC**: Secure access with Admin and Doctor roles.
- **Doctor Onboarding**: Admin-led creation with async OTP delivery.
- **ML-Powered Predictions**: Logistic Regression model predicts appointment outcomes.
- **Async Processing**: Celery + Redis for model training and heavy tasks.
- **Scalable Search**: Indexed search for patients and appointments.
- **Analytics Dashboard**: Precision tracking and prediction accuracy metrics.
- **Performance Optimized**: Pagination and Redis caching implemented.

## Tech Stack

- **Backend**: Django & Django REST Framework
- **Database**: MongoDB (via MongoEngine)
- **ML**: Scikit-learn, Pandas, Joblib
- **Task Queue**: Celery & Redis
- **Deployment**: Render (Backend/Worker), MongoDB Atlas, Vercel (Frontend)

## Local Setup

1. **Clone the repository**
2. **Create a virtual environment**: `python -m venv venv`
3. **Install dependencies**: `pip install -r requirements.txt`
4. **Environment Variables**: Create a `.env` file in the `backend/` directory:
   ```env
   SECRET_KEY=your-secret-key
   MONGO_URI=mongodb://localhost:27017/health_sphere
   REDIS_URL=redis://localhost:6379/0
   DEBUG=True
   ENABLE_AUTH=True
   ```
5. **Run the server**: `python manage.py runserver`
6. **Start Celery worker**: `celery -A health_sphere_backend worker --loglevel=info`

## ML Lifecycle

- **Data Ingestion**: Processes raw CSVs in `/data`.
- **Cleaning**: Normalizes features and calculates historical attendance scores.
- **Training**: Executed via Celery task `train_model_task`.
- **Prediction**: Auto-triggered on appointment creation; results are immutable.

## API Documentation

### Auth

- `POST /api/auth/login/`: Get JWT tokens.
- `POST /api/auth/refresh/`: Refresh access token.
- `POST /api/auth/logout/`: Blacklist refresh token.

### Admin

- `POST /api/admin/doctors/`: Create doctor with OTP.
- `GET /api/admin/doctors/all/`: List all doctors.

### Patients

- `GET /api/patients/`: List patients (paginated).
- `GET /api/patients/search/?q=`: Search patients.
- `POST /api/patients/`: Add patient.

### Appointments

- `GET /api/appointments/`: List appointments.
- `POST /api/appointments/`: Create appointment (triggers ML prediction).
- `PATCH /api/appointments/{id}/`: Mark done (set outcome).

### Analytics

- `GET /api/analytics/predictions/`: Accuracy stats.

### Health

- `GET /health/health/`: System status and DB health.

## Deployment on Render

1. Create a **Web Service** for the Django API.
2. Create a **Background Worker** for the Celery worker.
3. Create a **Redis** instance.
4. Set up **MongoDB Atlas** and provide the `MONGO_URI`.
