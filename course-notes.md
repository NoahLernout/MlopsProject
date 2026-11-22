# MLOps course notes (summary of Leho pages, used to follow course conventions)

## Home project requirements (Assignment — Home Project)
- Pick Kaggle/own project; train in Azure ML (cloud); serve with FastAPI; deploy with Docker (+ Kubernetes). Optional: database for predictions.
- Report (EN or NL): project/data/model/preprocessing; screenshots + explanation of Cloud AI services; FastAPI + integration story (fictional company); special Kubernetes things; extra: automation (GitHub Actions, pipeline controlling, version control).
- Hand-in: source code .zip + optional PDF report. Quiz in Leho (every question box + "What did you learn?" + 3 exam questions) = answered by the student. Deadline: Dec 16 hand-in (2 days before exams per page text).

## Azure conventions (0 - Azure Setup, 1.0)
- Prefer cheapest options. Resource group per project. Region West Europe.
- Azure ML workspace + Container Registry (Basic SKU, alphanumeric name). Compute instance cheapest e.g. Standard_A1_v2 / DS1_v2; auto idle shutdown.
- Data assets: uri_folder (images) / uri_file or mltable for tables; default workspaceblobstore.
- Use environment variables for WORKSPACE, SUBSCRIPTION_ID, RESOURCE_GROUP (reusability, Docker).

## SDK / CLI conventions (1.1, 1.2)
- Folder structure (plural names): components/, environments/, computes/, pipelines/ ; components/<name>/code + conda.yaml.
- Environment = conda.yaml + base image mcr.microsoft.com/azureml/openmpi5.0-ubuntu24.04:latest, pinned versions.
- Components: command component YAML ($schema commandComponent), semver version, is_deterministic, inputs/outputs uri_folder, code ./code, command with ${{inputs.x}}.
- Compute YAML: computeinstance, idle_time_before_shutdown_minutes, schedule stop cron. Save `az ml ... show --output yaml` into VCS (IaC).
- Pipeline YAML: type pipeline, jobs reference components, inputs, outputs (mode upload), settings.default_compute (serverless or named compute), experiment_name.
- Download model: `az ml job download` (job outputs) or `az ml model download` (registry); `az ml model list`.

## Deployment (1.3)
- Azure managed deployment only fits MLflow/sklearn models; course chooses custom FastAPI.
- inference/main.py with FastAPI, CORS allow-all (demo), load model, /docs for testing, pinned requirements.txt, Dockerfile + compose.yaml (think size/optimisation), optional Kubernetes Deployment+Service(NodePort), optional Azure Container App.
- Inference must match training preprocessing exactly (store contract with the model, smoke test).

## GitHub Actions (3.x)
- Workflow in .github/workflows/*.yml; triggers workflow_dispatch, push, pull_request; pin runner ubuntu-24.04; actions/checkout.
- Docker build/push action; tags with branch and commit-sha; push to GHCR/Docker Hub.
- Kubernetes deploy: kubectl apply, namespace if missing, immutable image tag (git sha) triggers rollout; `kubectl rollout status`; optional Helm `helm upgrade --install` with values override. No secrets in repo.
- Azure: OIDC federated login (azure/login@v2), no client secret; needs teacher/admin-provisioned identity.

## Pipeline controlling (4.1)
- Separate training from release. API-only change reuses model.
- Record lineage: data version/checksum, split, training commit, env/image digest, seed, run IDs. Release manifest with model version + checksums; /version endpoint.
- Identifiers: git commit vs model version vs image digest. Quality gate (metrics) before release; rollback by restoring previous image/model.

## Subscription note
- Course default sub is "MCT" (76f32639...). The student's own resource group: Noah_LERNOUT in subscription 7c50f9c3-289b-4ae0-a075-08784b3b9042, tenant hogeschool-wvl.be.
