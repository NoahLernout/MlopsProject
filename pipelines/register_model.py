"""Register the model bundle of a finished pipeline job in the Azure ML model registry.

Usage: python pipelines/register_model.py [job_name]
(MLflow-based auto registration is not supported by this workspace, so we register from the job output.)
"""
import sys
from azure.ai.ml import MLClient
from azure.ai.ml.constants import AssetTypes
from azure.ai.ml.entities import Model
from azure.identity import DefaultAzureCredential

job = sys.argv[1] if len(sys.argv) > 1 else "used-car-price-pipeline"
client = MLClient(DefaultAzureCredential(), "7c50f9c3-289b-4ae0-a075-08784b3b9042", "Noah_LERNOUT", "noah-lernout-ml")
model = client.models.create_or_update(Model(
    name="used-car-price",
    path=f"azureml://jobs/{job}/outputs/model",
    type=AssetTypes.CUSTOM_MODEL,
    description="Random forest used-car price model (model.joblib + metadata.json), test R2 0.960, MAE 1154 GBP",
    tags={"algorithm": "random_forest", "r2": "0.960", "mae": "1154", "pipeline_job": job},
))
print("registered", model.name, "version", model.version)
