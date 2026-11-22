# Demonstrates a rolling update and manual scaling of the API deployment.
kubectl -n used-car set env deployment/used-car-api IMAGE_TAG=v2
kubectl -n used-car rollout status deployment/used-car-api
kubectl -n used-car scale deployment/used-car-api --replicas=3
kubectl -n used-car rollout status deployment/used-car-api
kubectl -n used-car get pods
irm http://localhost:30080/version | ConvertTo-Json -Compress
kubectl -n used-car scale deployment/used-car-api --replicas=2
kubectl -n used-car rollout status deployment/used-car-api
