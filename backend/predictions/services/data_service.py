import pandas as pd
import numpy as np
from django.conf import settings
import os

class DataCleaner:
    """
    Handles loading and cleaning of raw CSV data for the ML pipeline.
    """
    def __init__(self, data_dir=None):
        self.data_dir = data_dir or os.path.join(settings.BASE_DIR, 'data')

    def load_data(self):
        patients_df = pd.read_csv(os.path.join(self.data_dir, 'patients.csv'))
        appointments_df = pd.read_csv(os.path.join(self.data_dir, 'appointments.csv'))
        return patients_df, appointments_df

    def clean_and_merge(self, patients_df, appointments_df):
        # 1. Normalize Sex/Gender
        # patients.csv has 'sex' (Female/Male)
        # appointments.csv has 'sex' (Female/Male)
        # We'll use 0 for Male, 1 for Female
        gender_map = {'Male': 0, 'Female': 1}
        
        # 2. Merge data on patient_id
        # patients_df columns: patient_id, name, sex, dob, insurance
        # appointments_df columns: appointment_id, ..., status (attended/did not attend), patient_id, sex, age
        
        # Merge to get patient details and appointment history
        df = appointments_df.copy()
        
        # 3. Clean status to target variable
        # Target: showed_up (1 if attended, 0 if did not attend)
        df['showed_up'] = (df['status'] == 'attended').astype(int)
        
        # 4. Map Gender
        df['sex'] = df['sex'].map(gender_map).fillna(0).astype(int)
        
        # 5. Handle age
        # age is already in appointments.csv, but we should ensure it's numeric
        df['age'] = pd.to_numeric(df['age'], errors='coerce').fillna(df['age'].median())
        
        # 6. Scheduling interval (already numeric)
        df['scheduling_interval'] = pd.to_numeric(df['scheduling_interval'], errors='coerce').fillna(0)
        
        # 7. SMS received (if exists in data, otherwise assume 0 for now)
        # Check if 'sms_received' or similar exists. Based on head, it's not there.
        # However, the requirement says "Whether the patient received an SMS reminder"
        # Since it's missing from CSV, we might initialize it or feature engineer it if possible.
        df['sms_received'] = 0 # Placeholder if not in source
        
        # 8. Feature Engineering: Historical Attendance Score
        # We want to calculate the attendance score for each appointment BASED ON PAST APPOINTMENTS ONLY
        # to avoid data leakage.
        df = df.sort_values(['patient_id', 'appointment_date'])
        df['prev_show_count'] = df.groupby('patient_id')['showed_up'].shift(1).fillna(0).cumsum()
        df['prev_app_count'] = df.groupby('patient_id').cumcount()
        
        # Neutral baseline 75.0 for new patients
        df['attendance_score'] = 75.0
        mask = df['prev_app_count'] > 0
        df.loc[mask, 'attendance_score'] = (df.loc[mask, 'prev_show_count'] / df.loc[mask, 'prev_app_count']) * 100.0
        
        return df

    def get_features_and_target(self, df):
        features = ['age', 'sex', 'scheduling_interval', 'sms_received', 'attendance_score']
        target = 'showed_up'
        
        X = df[features]
        y = df[target]
        
        return X, y
