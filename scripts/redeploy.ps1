# Rebuild the API image and roll it out on the local Kubernetes cluster.
docker build -t used-car-api:local --build-arg GIT_SHA=local --build-arg IMAGE_TAG=local ./inference
docker compose up -d --build
kubectl -n used-car rollout restart deployment/used-car-api
kubectl -n used-car rollout status deployment/used-car-api
