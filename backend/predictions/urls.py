from django.urls import path
from .views import OnDemandPredictionView, ModelRetrainView, ModelStatusView

urlpatterns = [
    path('predict/', OnDemandPredictionView.as_view(), name='on-demand-predict'),
    path('admin/retrain/', ModelRetrainView.as_view(), name='admin-retrain'),
    path('admin/status/', ModelStatusView.as_view(), name='admin-model-status'),
]
