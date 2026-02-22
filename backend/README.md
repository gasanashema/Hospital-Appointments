# Health Sphere Backend

> **Stack:** Django REST Framework · MongoEngine · MongoDB Atlas · scikit-learn  
> **Program:** Innovation Center — Production-style Demo Backend

---

## Quick Start

### 1. Clone & navigate

```bash
cd predict/backend
```

### 2. Create virtual environment & install dependencies

```bash
python3 -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Configure environment variables

```bash
cp .env.example .env
# Then edit .env with your MongoDB Atlas URI and a secret key
```

Your `.env` file:

```env
SECRET_KEY=your-secret-key-here
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<dbname>?retryWrites=true&w=majority
DEBUG=True
ENABLE_AUTH=False
```

### 4. Start the server

```bash
python manage.py runserver
```

On first startup, the server will:

1. Connect to MongoDB Atlas
2. Detect that `model.pkl` is missing
3. Automatically clean the CSV data and train the ML model
4. Save `model.pkl` to disk
5. Begin serving requests

The API is then available at: `http://localhost:8000/api/`

---

## MongoDB Atlas Connection

1. Go to [cloud.mongodb.com](https://cloud.mongodb.com)
2. Create a free M0 cluster
3. Under **Database Access** → Add a user with read/write access
4. Under **Network Access** → Allow your IP (or `0.0.0.0/0` for dev)
5. Click **Connect** → **Drivers** → copy the connection string
6. Replace `<password>` in the URI and paste into your `.env` as `MONGO_URI`

For **local MongoDB** (no Atlas needed in dev):

```env
MONGO_URI=mongodb://localhost:27017/health_sphere
```

---

## Dataset & Data Cleaning

Raw CSV files are located in `data/`:

- `patients.csv` — `patient_id, name, sex, dob, insurance`
- `appointments.csv` — `appointment_id, slot_id, scheduling_date, appointment_date, status, age, ...`
- `slots.csv` — `slot_id, appointment_date, appointment_time, is_available`

**Cleaning pipeline** (`core/services/data_cleaning.py`):

- Drops rows with missing `patient_id`, `age`, or `appointment_date`
- Removes duplicate appointments (keep first)
- Filters to only `attended` / `did not attend` statuses (excludes cancelled/unknown)
- Maps `attended` → `showed_up=1`, `did not attend` → `showed_up=0`
- Derives `sms_received` from `scheduling_interval` (≥3 days ahead → SMS assumed)
- Computes per-patient `attendance_score` as historical show-up rate (0–100)

---

## ML Model

**Algorithm:** Logistic Regression (scikit-learn)  
**Pipeline:** `StandardScaler` → `LogisticRegression(class_weight="balanced")`

**Features:**
| Feature | Source |
|---|---|
| `age` | Patient demographics |
| `attendance_score` | Historical show-up rate (0–100) |
| `sms_received` | Was SMS sent before appointment |

**Target:** `showed_up` (1 = show, 0 = no-show)

**Training:** 80/20 stratified split. Model saved as `model.pkl` via joblib.

To retrain from scratch:

```bash
rm model.pkl
python manage.py runserver  # Will retrain automatically on startup
```

---

## API Reference

All endpoints are under `http://localhost:8000/api/`.

### Patients

| Method   | Endpoint           | Description       |
| -------- | ------------------ | ----------------- |
| `GET`    | `/api/users/`      | List all patients |
| `POST`   | `/api/users/`      | Create patient    |
| `PATCH`  | `/api/users/{id}/` | Update patient    |
| `DELETE` | `/api/users/{id}/` | Delete patient    |

**Create patient:**

```bash
curl -X POST http://localhost:8000/api/users/ \
  -H "Content-Type: application/json" \
  -d '{"id": "P-001", "fullName": "Alice Smith", "age": 34}'
```

**Response:**

```json
{
  "id": "P-001",
  "fullName": "Alice Smith",
  "age": 34,
  "attendanceScore": 75.0,
  "createdAt": "2026-02-22T17:00:00Z"
}
```

---

### Appointments

| Method  | Endpoint                         | Description           |
| ------- | -------------------------------- | --------------------- |
| `GET`   | `/api/appointments/`             | List all              |
| `POST`  | `/api/appointments/`             | Create + auto-predict |
| `PATCH` | `/api/appointments/{id}/`        | Mark done             |
| `POST`  | `/api/appointments/{id}/cancel/` | Cancel                |

**Create appointment (auto-generates ML prediction):**

```bash
curl -X POST http://localhost:8000/api/appointments/ \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "P-001",
    "date": "2026-03-01",
    "time": "09:00",
    "smsReceived": true
  }'
```

**Response:**

```json
{
  "id": "6...",
  "patientId": "P-001",
  "patientName": "Alice Smith",
  "date": "2026-03-01",
  "time": "09:00",
  "smsReceived": true,
  "status": "pending",
  "showedUp": null,
  "wasLate": null,
  "prediction": {
    "label": "Show",
    "probability": 82
  }
}
```

**Mark appointment as done:**

```bash
curl -X PATCH http://localhost:8000/api/appointments/{id}/ \
  -H "Content-Type: application/json" \
  -d '{"showedUp": true, "wasLate": false}'
```

**Cancel appointment:**

```bash
curl -X POST http://localhost:8000/api/appointments/{id}/cancel/
```

---

### Stats

```bash
curl http://localhost:8000/api/stats/predictions/
```

**Response:**

```json
{
  "total": 42,
  "correct": 35,
  "incorrect": 7,
  "accuracy": 83
}
```

---

## Demo Authentication (Optional)

Authentication is **disabled by default**. To enable:

```env
ENABLE_AUTH=True
```

Then login to get a token:

```bash
curl -X POST http://localhost:8000/api/auth/login/ \
  -d '{"username": "admin", "password": "admin"}'
# Returns: {"token": "health-sphere-demo-token-12345"}
```

Pass the token in subsequent requests:

```
Authorization: Token health-sphere-demo-token-12345
```

> ⚠️ This is demo-only. Do not use in production.

---

## Project Structure

```
backend/
├── health_sphere_backend/   # Django project config
│   ├── settings.py
│   └── urls.py
├── core/
│   ├── models/
│   │   ├── patient.py       # Patient MongoEngine document
│   │   └── appointment.py   # Appointment + embedded Prediction
│   ├── serializers/
│   │   ├── patient_serializer.py
│   │   └── appointment_serializer.py
│   ├── views/
│   │   ├── patient_views.py
│   │   ├── appointment_views.py
│   │   ├── stats_views.py
│   │   └── auth_views.py
│   ├── services/
│   │   ├── data_cleaning.py  # pandas/numpy pipeline
│   │   └── ml_service.py     # sklearn model + joblib
│   ├── urls.py
│   └── apps.py               # MongoDB connect + model load on startup
├── data/
│   ├── patients.csv
│   ├── appointments.csv
│   └── slots.csv
├── model.pkl                 # Auto-generated on first run
├── requirements.txt
├── .env                      # Your secrets (never commit)
└── manage.py
```

---

## Frontend Integration

The frontend (React/Vite) is pre-configured to call this backend at:

```
http://localhost:8000/api
```

No frontend changes are required. Simply start both servers:

```bash
# Terminal 1 — Backend
cd predict/backend && source venv/bin/activate && python manage.py runserver

# Terminal 2 — Frontend
cd predict/frontend && npm run dev
```
