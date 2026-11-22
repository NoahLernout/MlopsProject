"""Run inside an Azure ML notebook (SDK v2): registers environments, components, compute and submits the pipeline.
Equivalent CLI commands are in the GitHub workflow .github/workflows/train.yml"""
import os

from azure.ai.ml import MLClient, load_component, load_compute, load_environment, load_job
from azure.identity import DefaultAzureCredential

ml_client = MLClient(
    DefaultAzureCredential(),
    os.environ.get("SUBSCRIPTION_ID", "7c50f9c3-289b-4ae0-a075-08784b3b9042"),
    os.environ.get("RESOURCE_GROUP", "Noah_LERNOUT"),
    os.environ.get("WORKSPACE", "noah-lernout-ml"),
)
base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
p = lambda *x: os.path.join(base, *x)

for env in ["preprocessing.yaml", "training.yaml"]:
    e = ml_client.environments.create_or_update(load_environment(p("environments", env)))
    print("environment:", e.name, e.version)

ml_client.compute.begin_create_or_update(load_compute(p("computes", "compute-cluster.yaml"))).result()
print("compute cluster ready")

for comp in ["prep/prep.yaml", "train/train.yaml"]:
    c = ml_client.components.create_or_update(load_component(p("components", comp)))
    print("component:", c.name, c.version)

job = ml_client.jobs.create_or_update(load_job(p("pipelines", "ai-pipeline.yaml")))
print("submitted:", job.name)
print("studio url:", job.studio_url)
