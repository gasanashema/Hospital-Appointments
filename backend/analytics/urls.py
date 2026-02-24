from django.urls import path
from .views import PredictionAnalyticsView

urlpatterns = [
    path('predictions/', PredictionAnalyticsView.as_view(), name='prediction-analytics'),
]
