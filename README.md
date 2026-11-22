# Used car price estimator - MLOps home project

Predicts the price (GBP) of a used car from brand, model, year, mileage, fuel type, transmission, tax, mpg and engine size.

```
Kaggle data -> Azure ML data asset -> Azure ML pipeline (prep -> train/compare -> quality gate -> register)
            -> model.joblib + metadata.json -> FastAPI -> Docker image -> Kubernetes (2 pods + PostgreSQL)
```

| Folder | Content |
|---|---|
| `components/`, `environments/`, `computes/`, `pipelines/` | Azure ML infrastructure as code (YAML) + training code |
| `inference/` | FastAPI app, Dockerfile, requirements |
| `compose.yaml` | Local run of API + PostgreSQL |
| `k8s/` | Kubernetes manifests (namespace, API Deployment + Service, PostgreSQL + PVC, optional HPA) |
| `.github/workflows/` | CI/CD: tests + image build/push, Azure ML training via OIDC |
| `tests/` | API tests (pytest) |
| `report/` | The report with screenshots |

## Run locally
```
# put the trained model bundle (model.joblib + metadata.json) in inference/model/
docker compose up --build
# open http://localhost:8000/docs
```

## Deploy to Kubernetes (Docker Desktop)
```
docker build -t used-car-api:local ./inference
kubectl apply -f k8s/namespace.yaml -f k8s/postgres.yaml -f k8s/api.yaml
kubectl -n used-car get pods
# open http://localhost:30080/docs
```
