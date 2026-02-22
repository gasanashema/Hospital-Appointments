"""
core/services/data_cleaning.py

Data ingestion and cleaning pipeline for the Health Sphere ML training dataset.

Source files (raw, uncleaned):
  - data/patients.csv     → patient_id, name, sex, dob, insurance
  - data/appointments.csv → appointment_id, slot_id, scheduling_date,
                            appointment_date, appointment_time, scheduling_interval,
                            status, check_in_time, appointment_duration,
                            start_time, end_time, waiting_time,
                            patient_id, sex, age, age_group
  - data/slots.csv        → slot_id, appointment_date, appointment_time, is_available

Target output: a cleaned DataFrame with these columns ready for ML training:
  [age, attendance_score, sms_received, showed_up]

Assumptions (clearly documented):
  - "attended" → showed_up = 1 (patient showed up)
  - "did not attend" → showed_up = 0 (no-show)
  - "cancelled" and "unknown" statuses are EXCLUDED from training
    (they don't represent a show/no-show outcome)
  - sms_received column does not exist in raw data; we simulate it
    using scheduling_interval (the gap between scheduling and appointment):
    if scheduled >= 3 days in advance, we assume an SMS was sent (sms_received=1)
  - attendance_score per patient = historical show-up rate (0–100)
    computed across all completed appointments BEFORE the current one
  - Rows with missing age, patient_id, or appointment_date are dropped
  - Duplicate appointment_ids are removed (keep first)
"""

import os
from pathlib import Path
import pandas as pd
import numpy as np

# Default data directory (backend/data/)
DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"


def load_raw_data(data_dir: Path = DATA_DIR):
    """
    Load all three raw CSV files. Returns (patients_df, appointments_df, slots_df).
    Raises FileNotFoundError if any file is missing.
    """
    patients_path = data_dir / "patients.csv"
    appointments_path = data_dir / "appointments.csv"
    slots_path = data_dir / "slots.csv"

    for path in [patients_path, appointments_path, slots_path]:
        if not path.exists():
            raise FileNotFoundError(f"Required data file not found: {path}")

    patients_df = pd.read_csv(patients_path)
    appointments_df = pd.read_csv(appointments_path)
    slots_df = pd.read_csv(slots_path)

    return patients_df, appointments_df, slots_df


def clean_patients(df: pd.DataFrame) -> pd.DataFrame:
    """
    Clean the patients DataFrame.

    Issues handled:
    - Strip whitespace from string columns
    - Drop rows with null patient_id or name
    - Deduplicate on patient_id (keep first occurrence)
    """
    df = df.copy()

    # Normalize column names
    df.columns = df.columns.str.strip().str.lower()

    # Strip whitespace from string columns
    for col in ["name", "sex", "insurance"]:
        if col in df.columns:
            df[col] = df[col].astype(str).str.strip()

    # Drop rows missing critical fields
    df = df.dropna(subset=["patient_id", "name"])

    # Cast patient_id to int for consistent joining
    df["patient_id"] = pd.to_numeric(df["patient_id"], errors="coerce")
    df = df.dropna(subset=["patient_id"])
    df["patient_id"] = df["patient_id"].astype(int)

    # Deduplicate
    df = df.drop_duplicates(subset=["patient_id"], keep="first")

    return df.reset_index(drop=True)


def clean_appointments(df: pd.DataFrame) -> pd.DataFrame:
    """
    Clean the appointments DataFrame.

    Issues handled:
    - Normalize column names
    - Parse dates (scheduling_date, appointment_date)
    - Drop rows with missing critical columns (patient_id, age, appointment_date, status)
    - Deduplicate on appointment_id
    - Keep only 'attended' and 'did not attend' statuses (exclude cancelled/unknown)
    - Map status → binary showed_up (1/0)
    - Derive sms_received from scheduling_interval (proxy: 3+ days ahead → SMS assumed)
    - Cast age to int, clamp to [0, 120]
    """
    df = df.copy()

    # Normalize column names
    df.columns = df.columns.str.strip().str.lower()

    # Parse date columns
    date_cols = ["scheduling_date", "appointment_date"]
    for col in date_cols:
        if col in df.columns:
            df[col] = pd.to_datetime(df[col], errors="coerce")

    # Drop rows missing critical fields
    required_cols = ["patient_id", "age", "appointment_date", "status"]
    df = df.dropna(subset=[c for c in required_cols if c in df.columns])

    # Cast patient_id to int
    df["patient_id"] = pd.to_numeric(df["patient_id"], errors="coerce")
    df = df.dropna(subset=["patient_id"])
    df["patient_id"] = df["patient_id"].astype(int)

    # Deduplicate appointments
    if "appointment_id" in df.columns:
        df = df.drop_duplicates(subset=["appointment_id"], keep="first")

    # Normalize status values
    df["status"] = df["status"].astype(str).str.strip().str.lower()

    # Keep only outcomes that represent a clear show/no-show decision
    valid_statuses = {"attended", "did not attend"}
    df = df[df["status"].isin(valid_statuses)]

    # Map to binary target: 1 = showed up, 0 = no-show
    df["showed_up"] = df["status"].map({"attended": 1, "did not attend": 0})

    # ── Derive sms_received (proxy) ──────────────────────────────────────────
    # Assumption: if appointment was scheduled >= 3 days before the appointment date,
    # we assume an SMS reminder was sent. This is an approximation because the
    # raw data doesn't have an explicit SMS column.
    if "scheduling_interval" in df.columns:
        # scheduling_interval may be stored as a number of days (int/float)
        df["scheduling_interval"] = pd.to_numeric(df["scheduling_interval"], errors="coerce").fillna(0)
        df["sms_received"] = (df["scheduling_interval"] >= 3).astype(int)
    elif "scheduling_date" in df.columns:
        # Fallback: compute interval from dates directly
        df["scheduling_interval"] = (
            df["appointment_date"] - df["scheduling_date"]
        ).dt.days.fillna(0)
        df["sms_received"] = (df["scheduling_interval"] >= 3).astype(int)
    else:
        # No scheduling info available — default to 0
        df["sms_received"] = 0

    # ── Clean age ────────────────────────────────────────────────────────────
    df["age"] = pd.to_numeric(df["age"], errors="coerce")
    df = df.dropna(subset=["age"])
    df["age"] = df["age"].astype(int).clip(0, 120)

    return df.reset_index(drop=True)


def compute_attendance_scores(appointments_df: pd.DataFrame) -> dict:
    """
    Compute historical attendance score (0–100) for each patient.

    Method: attendance_score = (n_showed_up / n_total_completed) * 100
    Only completed appointments (attended/did not attend) are counted.

    Returns a dict: {patient_id (int): attendance_score (float)}
    New patients (no history) get a neutral score of 75.0.
    """
    scores = {}

    grouped = appointments_df.groupby("patient_id")["showed_up"]
    for patient_id, outcomes in grouped:
        if len(outcomes) == 0:
            scores[int(patient_id)] = 75.0
        else:
            score = round(outcomes.mean() * 100, 1)
            scores[int(patient_id)] = score

    return scores


def build_training_dataset(data_dir: Path = DATA_DIR) -> pd.DataFrame:
    """
    Full pipeline: load → clean → merge → feature engineer → return training DataFrame.

    Returns a DataFrame with columns:
      - age              (int)
      - attendance_score (float, 0–100)
      - sms_received     (int, 0 or 1)
      - showed_up        (int, 0 or 1)  ← target variable

    This is the final dataset used to train the ML model.
    """
    print("📦 Loading raw CSV data...")
    patients_df, appointments_df, slots_df = load_raw_data(data_dir)

    print(f"   Raw records: {len(patients_df)} patients, {len(appointments_df)} appointments")

    print("🧹 Cleaning patients data...")
    patients_clean = clean_patients(patients_df)

    print("🧹 Cleaning appointments data...")
    appointments_clean = clean_appointments(appointments_df)

    print(f"   After cleaning: {len(appointments_clean)} appointments with valid show/no-show outcomes")

    # ── Compute attendance scores ─────────────────────────────────────────────
    print("📊 Computing historical attendance scores per patient...")
    attendance_scores = compute_attendance_scores(appointments_clean)

    # Map attendance score onto the appointments DataFrame
    appointments_clean["attendance_score"] = (
        appointments_clean["patient_id"]
        .map(attendance_scores)
        .fillna(75.0)  # Neutral score for patients without prior history
    )

    # ── Select final feature columns ──────────────────────────────────────────
    feature_cols = ["age", "attendance_score", "sms_received", "showed_up"]
    final_df = appointments_clean[feature_cols].copy()

    # Final validation: drop any remaining NaN rows
    final_df = final_df.dropna()
    final_df = final_df.astype({
        "age": int,
        "attendance_score": float,
        "sms_received": int,
        "showed_up": int,
    })

    print(f"✅ Training dataset ready: {len(final_df)} rows")
    print(f"   Show-up rate: {final_df['showed_up'].mean():.1%}")
    print(f"   Features: {feature_cols[:-1]}")

    return final_df
