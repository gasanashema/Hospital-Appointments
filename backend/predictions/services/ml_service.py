import joblib
import os
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from django.conf import settings
from .data_service import DataCleaner

class MLService:
    """
    Handles training, saving, loading and prediction using Scikit-Learn.
    """
    def __init__(self, model_path=None):
        self.model_path = model_path or getattr(settings, 'MODEL_PATH', os.path.join(settings.BASE_DIR, 'model.pkl'))
        self.version_path = os.path.join(os.path.dirname(self.model_path), 'model_version.txt')
        self.model = None

    def train_model(self):
        """
        Train the model using data from CSV files and save it.
        """
        cleaner = DataCleaner()
        p_df, a_df = cleaner.load_data()
        df = cleaner.clean_and_merge(p_df, a_df)
        X, y = cleaner.get_features_and_target(df)

        # Split data
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

        # Train
        model = LogisticRegression(max_iter=1000)
        model.fit(X_train, y_train)

        # Determine version
        version = self.get_current_version()
        new_version = f"v{int(version[1:]) + 1}" if version.startswith('v') else "v1"
        
        # Save model
        joblib.dump(model, self.model_path)
        with open(self.version_path, 'w') as f:
            f.write(new_version)
        
        self.model = model
        
        accuracy = model.score(X_test, y_test)
        return new_version, accuracy

    def get_current_version(self):
        if os.path.exists(self.version_path):
            with open(self.version_path, 'r') as f:
                return f.read().strip()
        return "v0"

    def load_model(self):
        if os.path.exists(self.model_path):
            try:
                self.model = joblib.load(self.model_path)
                return True
            except:
                return False
        return False

    def predict(self, age, sex, scheduling_interval, sms_received, attendance_score):
        """
        Predict the outcome for a single appointment.
        sex: 0 for Male, 1 for Female
        """
        if not self.model and not self.load_model():
            raise Exception("Model not trained and not found.")

        # Features order must match cleaner.get_features_and_target
        features = [[age, sex, scheduling_interval, sms_received, attendance_score]]
        
        # Probability of class 1 (show)
        prob = self.model.predict_proba(features)[0][1]
        label = "show" if prob >= 0.5 else "no-show"

        return label, prob, self.get_current_version()
