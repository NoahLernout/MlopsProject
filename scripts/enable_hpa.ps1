# Install metrics-server (patched for Docker Desktop) and apply the HorizontalPodAutoscaler
Set-Location (Split-Path $PSScriptRoot -Parent)
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
kubectl -n kube-system patch deployment metrics-server --type=json --patch-file k8s/metrics-server-patch.json
kubectl -n kube-system rollout status deployment/metrics-server --timeout=180s
kubectl apply -f k8s/hpa.yaml
Start-Sleep -Seconds 60
kubectl top pods -n used-car
kubectl -n used-car get hpa
