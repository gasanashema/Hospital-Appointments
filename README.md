![Health Sphere Banner](./assets/banner.jpeg)

# Health Sphere 🏥

> **Intelligent Appointment Management & No-Show Prediction**

Health Sphere is a modern, full-stack healthcare platform designed to optimize clinic operations through AI-driven insights. By predicting the likelihood of patient no-shows, clinics can manage their schedules effectively, reduce revenue loss, and improve patient care.

---

## ✨ Key Features

- 🤖 **ML-Powered Predictions**: Uses a Logistic Regression model to calculate the probability of a patient showing up based on historical behavior and demographics.
- 🔄 **Continuous Learning**: The model automatically retrains itself as new appointment outcomes are recorded, ensuring accuracy stays high.
- 📊 **Real-time Analytics**: High-performance dashboard showing clinic stats, predicted probabilities, and model performance.
- 📋 **Patient Management**: Complete CRUD system for managing patient records and historical attendance data.
- 🔐 **Secure & Modern**: Built with JWT authentication, shadcn/ui for a premium feel, and MongoDB for flexible data storage.

---

## 🛠️ Tech Stack

### Backend

![Python](https://img.shields.io/badge/python-3670A0?style=for-the-badge&logo=python&logoColor=ffdd54)
![Django](https://img.shields.io/badge/django-%23092e20.svg?style=for-the-badge&logo=django&logoColor=white)
![DjangoREST](https://img.shields.io/badge/DJANGO-REST-ff1709?style=for-the-badge&logo=django&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-%234ea94b.svg?style=for-the-badge&logo=mongodb&logoColor=white)
![Scikit-Learn](https://img.shields.io/badge/scikit--learn-%23F7931E.svg?style=for-the-badge&logo=scikit-learn&logoColor=white)

### Frontend

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![TypeScript](https://img.shields.io/badge/typescript-%23007acc.svg?style=for-the-badge&logo=typescript&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Radix UI](https://img.shields.io/badge/radix%20ui-161618.svg?style=for-the-badge&logo=radix-ui&logoColor=white)

---

## 🚀 Getting Started

### 1. Cloning the Project

First, clone the repository to your local machine:

```bash
git clone https://github.com/gasanashema/hospital-appointments.git
cd hospital-appointments
```

### 2. Prerequisites

- Python 3.10+
- Node.js 18+
- MongoDB (Local or Atlas)

### 3. Running the Project (Recommended)

#### Option 1: Easy One-Command Setup ⚡ (RECOMMENDED)

The fastest way to install all dependencies and set up the environment for **Windows**, **Linux**, or **macOS**. This command automatically detects your OS and runs the appropriate setup script (`setup.sh` or `setup.bat`).

```bash
npm run setup
```

#### Option 2: Granular Setup

If you prefer setting up components individually:

1. **Setup Backend**:
   ```bash
   npm run setup:backend
   ```
2. **Setup Frontend**:
   ```bash
   npm run setup:frontend
   ```

#### Run the Project

Once everything is set up, run both servers simultaneously:

```bash
npm run dev
```

---

### 🔧 Individual Component Setup

#### Backend Setup

1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate # Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure environment variables (create a `.env` file based on `.env.example`):
   ```ini
   SECRET_KEY=your-secret-key
   MONGO_URI=your-mongodb-uri
   DEBUG=True
   ```
5. Run the server independently (optional):
   ```bash
   python manage.py runserver
   ```

#### Frontend Setup

1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server independently (optional):
   ```bash
   npm run dev
   ```

---

## 🧠 Machine Learning Logic

### The Model

We use a **Logistic Regression** classifier (via scikit-learn) due to its interpretability and calibrated probability outputs.

#### Features Used:

- `age`: Patient demographic profile.
- `attendance_score`: Historical show-up rate (0–100%).
- `sms_received`: Binary indicator of reminder delivery.

### Continuous Learning Loop

Health Sphere implements an **Active Learning** strategy:

1. **Initial Training**: On the first startup, if no model exists, the system trains on a baseline CSV dataset.
2. **Outcome Tracking**: Every time a doctor/admin marks an appointment as "Done", the outcome is saved to MongoDB.
3. **Automated Retraining**: Once the system accumulates **10 new outcomes** (configurable via `RETRAIN_EVERY_N`), a background thread:
   - Merges baseline data with new live data.
   - Retrains the pipeline (Scaler + Classifier).
   - Verifies accuracy.
   - Atomically swaps the in-memory model.

---

## 📂 Project Structure

```text
predict/
├── backend/            # Django REST Framework API
│   ├── core/           # Business logic & ML Services
│   ├── data/           # Baseline datasets
│   └── model.pkl       # Serialized ML model
├── frontend/           # React + Vite application
│   ├── src/
│   │   ├── components/ # UI Components (shadcn/ui)
│   │   ├── hooks/      # Performance & Data hooks
│   │   └── pages/      # Dashboard, Patients, Analytics
├── package.json
├── setup.sh            # Setup script for Linux/macOS
└── setup.bat           # Setup script for Windows
```

---

_Built with ❤️ by the Health Sphere Team_
