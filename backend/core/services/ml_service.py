"""
core/services/ml_service.py

Machine Learning service for appointment no-show prediction.

Model: Logistic Regression (scikit-learn)
  - Simple, interpretable, fast to train
  - Produces calibrated probability estimates via predict_proba()

Features:
  - age              (int): Patient age
  - attendance_score (float): Historical show-up rate, 0–100
  - sms_received     (int): Whether the patient received an SMS reminder (0 or 1)

Target:
  - showed_up (int): 1 = patient showed up, 0 = no-show

Model lifecycle:
  1. On server startup (CoreConfig.ready), load_or_train_model() is called
  2. If model.pkl exists → load it
  3. If model.pkl does NOT exist → train from CSV data and save to model.pkl
  4. Each time an appointment is marked done, schedule_retrain_if_needed() checks
     whether enough new labeled data has accumulated to trigger a background retrain
  5. Background retrain: merges CSV baseline + all MongoDB done appointments,
     retrains from scratch, bumps version, saves new model.pkl, reloads in memory
"""

import os
import threading
import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline

# ── Constants ─────────────────────────────────────────────────────────────────
MODEL_PATH = Path(__file__).resolve().parent.parent.parent / "model.pkl"
VERSION_PATH = Path(__file__).resolve().parent.parent.parent / "model_version.txt"

# How many newly completed appointments trigger a retrain
RETRAIN_EVERY_N = int(os.getenv("RETRAIN_EVERY_N", "10"))

# Thread-safe module-level model holder
_lock = threading.Lock()
_model: Pipeline | None = None
_model_version: str = "logistic_v1"

# Tracks how many completed appointments have been added since the last retrain
_new_outcomes_since_retrain: int = 0


# ── Version helpers ───────────────────────────────────────────────────────────

def _load_version() -> str:
    if VERSION_PATH.exists():
        return VERSION_PATH.read_text().strip()
    return "logistic_v1"


def _bump_version(current: str) -> str:
    """Increment the version number: logistic_v1 → logistic_v2"""
    try:
        prefix, num = current.rsplit("v", 1)
        return f"{prefix}v{int(num) + 1}"
    except Exception:
        return "logistic_v2"


def _save_version(version: str):
    VERSION_PATH.write_text(version)


# ── Model access ──────────────────────────────────────────────────────────────

def get_model() -> Pipeline:
    """Return the loaded model. Raises RuntimeError if not initialized."""
    global _model
    if _model is None:
        raise RuntimeError(
            "ML model is not loaded. Call load_or_train_model() first."
        )
    return _model


def get_model_version() -> str:
    return _model_version


def load_or_train_model(model_path: Path = MODEL_PATH) -> Pipeline:
    """
    Load the model from disk if it exists; otherwise train a new model,
    evaluate it, and save it.

    Called once at server startup from CoreConfig.ready().
    Thread-safe via module-level lock.
    """
    global _model, _model_version

    with _lock:
        if _model is not None:
            return _model

        _model_version = _load_version()

        if model_path.exists():
            print(f"📂 Loading ML model from {model_path}...")
            _model = joblib.load(model_path)
            print(f"✅ ML model loaded ({_model_version})")
        else:
            print("🏋️  No model.pkl found — training new model from CSV data...")
            _model = _train_and_save(model_path, version=_model_version)

    return _model


# ── Continuous learning ────────────────────────────────────────────────────────

def record_outcome():
    """
    Called every time an appointment is marked as done.
    Increments the outcome counter and triggers a background retrain
    if RETRAIN_EVERY_N new outcomes have accumulated.
    """
    global _new_outcomes_since_retrain

    with _lock:
        _new_outcomes_since_retrain += 1
        should_retrain = (_new_outcomes_since_retrain >= RETRAIN_EVERY_N)
        if should_retrain:
            _new_outcomes_since_retrain = 0

    if should_retrain:
        print(f"🔁 {RETRAIN_EVERY_N} new outcomes recorded — scheduling background retrain...")
        thread = threading.Thread(
            target=_background_retrain,
            daemon=True,
            name="ml-retrain"
        )
        thread.start()


def retrain_now() -> dict:
    """
    Manually trigger a full retrain synchronously.
    Used by the POST /api/admin/retrain/ endpoint.

    Returns a dict with the new version and accuracy.
    """
    return _do_retrain()


def _background_retrain():
    """Run retrain in a background thread — does not block request/response."""
    try:
        result = _do_retrain()
        print(
            f"✅ Background retrain complete — version: {result['version']}, "
            f"accuracy: {result['accuracy']:.1%}"
        )
    except Exception as e:
        print(f"❌ Background retrain failed: {e}")


def _do_retrain() -> dict:
    """
    Core retraining logic:
    1. Load CSV baseline dataset
    2. Fetch all done appointments from MongoDB and convert to DataFrame
    3. Merge both sources (MongoDB data takes precedence for deduplication)
    4. Retrain the model, bump version, replace in-memory model, save to disk

    Returns {"version": str, "accuracy": float, "total_samples": int}
    """
    global _model, _model_version

    from core.services.data_cleaning import build_training_dataset

    FEATURE_COLS = ["age", "attendance_score", "sms_received"]

    # ── Step 1: CSV baseline data ─────────────────────────────────────────────
    print("📦 Loading baseline CSV dataset for retrain...")
    df_csv = build_training_dataset()

    # ── Step 2: Fetch live outcomes from MongoDB ──────────────────────────────
    print("🗄️  Fetching live outcomes from MongoDB...")
    df_live = _fetch_mongodb_outcomes()

    # ── Step 3: Merge — live data appended on top of CSV baseline ────────────
    if df_live is not None and len(df_live) > 0:
        print(f"   CSV rows: {len(df_csv)}, Live rows: {len(df_live)}")
        df_combined = pd.concat([df_csv, df_live], ignore_index=True)
        # Shuffle so live data is mixed throughout, not biasing the tail
        df_combined = df_combined.sample(frac=1, random_state=42).reset_index(drop=True)
    else:
        print("   No MongoDB outcomes yet — using CSV data only")
        df_combined = df_csv

    print(f"   Total training rows: {len(df_combined)}")

    # ── Step 4: Retrain ───────────────────────────────────────────────────────
    X = df_combined[FEATURE_COLS].values
    y = df_combined["showed_up"].values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("classifier", LogisticRegression(
            max_iter=1000,
            random_state=42,
            class_weight="balanced",
            solver="lbfgs",
        )),
    ])
    pipeline.fit(X_train, y_train)

    y_pred = pipeline.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)

    # ── Step 5: Atomically replace in-memory model + save ─────────────────────
    new_version = _bump_version(_model_version)

    with _lock:
        _model = pipeline
        _model_version = new_version

    joblib.dump(pipeline, MODEL_PATH)
    _save_version(new_version)

    print(f"✅ Retrain complete — version: {new_version}, accuracy: {accuracy:.1%}")
    print(f"💾 Model saved (version={new_version})")

    return {
        "version": new_version,
        "accuracy": round(accuracy, 4),
        "total_samples": len(df_combined),
        "live_samples": len(df_live) if df_live is not None else 0,
    }


def _fetch_mongodb_outcomes() -> pd.DataFrame | None:
    """
    Query MongoDB for all done appointments that have a known showed_up outcome
    and convert them into a training DataFrame with the same columns as the
    CSV baseline: [age, attendance_score, sms_received, showed_up].

    Returns None if no done appointments exist yet.
    """
    try:
        from core.models.appointment import Appointment

        done_appointments = Appointment.objects(
            status="done",
            showed_up__ne=None,
        )

        rows = []
        for appt in done_appointments:
            try:
                patient = appt.patient
                rows.append({
                    "age": float(patient.age),
                    "attendance_score": float(patient.attendance_score),
                    "sms_received": int(appt.sms_received),
                    "showed_up": int(appt.showed_up),
                })
            except Exception:
                continue  # Skip malformed records

        if not rows:
            return None

        return pd.DataFrame(rows, columns=["age", "attendance_score", "sms_received", "showed_up"])

    except Exception as e:
        print(f"⚠️  Could not fetch MongoDB outcomes: {e}")
        return None


# ── Training from CSV only ────────────────────────────────────────────────────

def _train_and_save(model_path: Path = MODEL_PATH, version: str = "logistic_v1") -> Pipeline:
    """
    Train a LogisticRegression model from the CSV dataset only.
    Used for the very first startup when no model.pkl exists yet.
    """
    from core.services.data_cleaning import build_training_dataset

    df = build_training_dataset()
    FEATURE_COLS = ["age", "attendance_score", "sms_received"]
    X = df[FEATURE_COLS].values
    y = df["showed_up"].values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("classifier", LogisticRegression(
            max_iter=1000,
            random_state=42,
            class_weight="balanced",
            solver="lbfgs",
        )),
    ])
    pipeline.fit(X_train, y_train)

    y_pred = pipeline.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    print(f"✅ Model trained — Test Accuracy: {accuracy:.1%}")
    print(f"   Training samples: {len(X_train)}, Test samples: {len(X_test)}")

    joblib.dump(pipeline, model_path)
    _save_version(version)
    print(f"💾 Model saved to {model_path}")

    return pipeline


# ── Prediction API ────────────────────────────────────────────────────────────

def predict_appointment(age: int, attendance_score: float, sms_received: bool) -> dict:
    """
    Run the ML model on a single appointment's features and return a prediction.

    Returns a dict:
        {
            "predicted_label":       "show" | "no-show",
            "predicted_probability": float (0.0–1.0),
            "model_version":         str   (e.g. "logistic_v3")
        }
    """
    model = get_model()

    features = np.array([[age, attendance_score, int(sms_received)]])
    label_int = model.predict(features)[0]
    probabilities = model.predict_proba(features)[0]
    prob_show = float(probabilities[1])

    return {
        "predicted_label": "show" if label_int == 1 else "no-show",
        "predicted_probability": round(prob_show, 4),
        "model_version": get_model_version(),
    }
