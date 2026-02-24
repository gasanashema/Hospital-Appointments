# Health Sphere System Documentation

Welcome to the comprehensive documentation for **Health Sphere**, an AI-powered appointment management platform designed to predict patient no-shows and optimize clinic efficiency.

---

## 🚀 System Architecture Overview

Health Sphere is a full-stack web application built with a modern, scalable architecture:

- **Frontend**: React (Vite, TypeScript, Tailwind CSS, Shadcn/UI, Framer Motion)
- **Backend**: Django REST Framework
- **Database**: MongoDB (via MongoEngine)
- **Task Queue**: Celery with Redis (for asynchronous ML training and background tasks)
- **ML Engine**: Scikit-Learn (Logistic Regression)

---

## 💎 Core Features

### 1. Interactive Dashboard (Admin & Doctor)

The primary hub for clinic operations, providing real-time insights:

- **Real-Time Analytics**: Visualizes total appointments, no-show rates, and prediction accuracy.
- **Trend Analysis**: Interactive Recharts displaying weekly arrival trends and prediction performance.
- **Quick Action Center**: Streamlined modals for adding patients, creating doctors (Admin only), and scheduling appointments.

### 2. Machine Learning Predictions

The core value of Health Sphere is its ability to forecast patient attendance:

- **Automatic Prediction**: Every time an appointment is created, the system generates a prediction (Show/No-Show) with a confidence percentage.
- **Embedded Intelligence**: Predictions are stored directly within the appointment record, ensuring traceability even after model updates.
- **"What-If" Analysis**: A "Quick Prediction" tool on the Dashboard allows users to test scenarios (e.g., "What if we send an SMS to this 45-year-old patient for next Tuesday?").

### 3. Patient management

A centralized system to manage patient records:

- **CRUD Operations**: Create, view, edit, and delete patient profiles.
- **Search & Filter**: Powerful search by Patient Name or ID.
- **Medical Context**: Stores demographic data used by the ML model (Age, Sex, etc.).

### 4. Doctor Management (Admin Only)

Secure administrative control over healthcare providers:

- **Provider Creation**: Admins can register new doctors.
- **Account Control**: Ability to deactivate/reactivate doctor accounts.
- **Appointment Visibility**: Admins can view appointments across the entire clinic or filter by specific doctors.

### 5. Appointment Lifecycle & Outcome Tracking

- **Unified Scheduling**: A streamlined form to book appointments for specific patients and doctors.
- **Outcome Verification**: Doctors mark appointments as "Done" and record whether the patient showed up or was late.
- **Data Feedback Loop**: These outcomes are recorded and used for subsequent model retraining.

---

## 🧠 Technical ML Documentation

Health Sphere uses a robust data pipeline to maintain a high-accuracy predictive model.

### 1. Model Specifications

- **Algorithm**: `LogisticRegression` (via Scikit-Learn).
- **Format**: Serialized as a `.pkl` (joblib) file for efficient loading.
- **Accuracy Target**: The system currently maintains a ~87% prediction accuracy during testing.

### 2. Feature Engineering

The model makes decisions based on five key features:

1.  **Age**: Influences arrival probability based on demographic trends.
2.  **Sex**: Categorized and normalized for model consumption.
3.  **Scheduling Interval**: The number of days between the date the appointment was booked and the actual appointment date.
4.  **SMS Received**: Whether a reminder was sent (a significant factor in reducing no-shows).
5.  **Attendance Score**: A proprietary feature calculating a patient's historical show-up percentage (initialized to a neutral 75.0 for new patients).

### 3. Data Dataset & Cleaning

- **Training Data Volume**: The model is trained on a massive dataset of approximately **111,000+ appointments** and **36,000+ patients**.
- **Cleaning Pipeline**:
  - **Normalization**: Mapping gender to binary values.
  - **Imputation**: Handling missing ages using median values.
  - **Leakage Prevention**: Attendance scores are calculated using _prior_ appointment data only to ensure the model doesn't "cheat" during training.
- **Data Splitting**: Uses an 80/20 train-test split to valid performance.

### 4. Training Cycle & Automation

- **Asynchronous Training**: Retraining a model on 100k+ records can be resource-intensive. Health Sphere uses **Celery** to run these tasks in the background.
- **Auto-Retraining Mechanism**:
  - The system is designed to trigger retraining when significant data changes occur or manually via the Admin panel.
  - **Task Tracking**: Admins can track the status of retraining tasks (Task ID, Accuracy, Version) directly from the system.
- **Versioning**: Each trained model is tagged with a version (e.g., `v1`, `v2`) to allow for performance drift monitoring.

---

## 🛠️ Developer Tooling

To work with the system's core logic:

- **Manual Retraining CLI**: Run `python retrain_model.py` in the backend directory.
- **Local Seeding**: Use `python seed_local.py` to populate the environment with demo data.
- **API Documentation**: The backend provides a RESTful interface for all operations (Auth, Predictions, Management).

---

_Created for King Faisal Hospital Rwanda Innovation Center._
