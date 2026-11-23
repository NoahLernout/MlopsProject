<#
 Release the newest registered model to the local Kubernetes cluster, fully automatic:
   1. find the newest version of the registered model in Azure ML (or use -ModelVersion)
   2. download it into inference/model
   3. build an immutable image tagged m<model-version>-<git-sha>
   4. roll it out to Kubernetes (rolling update, zero downtime) and wait until it is ready
   5. check /version: the running API must report the new image tag and the model it was built from
 Version control chain: git commit -> Azure ML run/model version -> image tag -> running pod (/version).
 Usage:  .\scripts\release.ps1                  (newest model)
         .\scripts\release.ps1 -ModelVersion 2  (a specific version)
#>
param(
  [string]$ModelVersion = "",
  [string]$ResourceGroup = "Noah_LERNOUT",
  [string]$Workspace = "noah-lernout-ml",
  [string]$ModelName = "used-car-price",
  [string]$Namespace = "used-car",
  [string]$Subscription = "7c50f9c3-289b-4ae0-a075-08784b3b9042"
)
$ErrorActionPreference = "Continue"   # az prints harmless warnings on stderr; failures are checked explicitly
Set-Location (Split-Path $PSScriptRoot -Parent)
function Step($m) { Write-Host "`n== $m" -ForegroundColor Cyan }

Step "1. Find the model version in Azure ML"
az account set --subscription $Subscription --only-show-errors
if (-not $ModelVersion) {
  $ModelVersion = (az ml model show --name $ModelName --label latest -g $ResourceGroup -w $Workspace --query version -o tsv --only-show-errors)
}
if (-not $ModelVersion) { throw "No registered model '$ModelName' found" }
$ModelVersion = $ModelVersion.Trim()
Write-Host "model $ModelName version $ModelVersion"

Step "2. Download the model bundle"
$dl = "build\model_dl"
if (Test-Path $dl) { Remove-Item $dl -Recurse -Force }
az ml model download --name $ModelName --version $ModelVersion --download-path $dl -g $ResourceGroup -w $Workspace --only-show-errors | Out-Null
$joblib = Get-ChildItem $dl -Recurse -Filter model.joblib | Select-Object -First 1
$meta   = Get-ChildItem $dl -Recurse -Filter metadata.json | Select-Object -First 1
if (-not $joblib -or -not $meta) { throw "model.joblib / metadata.json not found in the download" }
New-Item -ItemType Directory inference\model -Force | Out-Null
Copy-Item $joblib.FullName inference\model\model.joblib -Force
Copy-Item $meta.FullName   inference\model\metadata.json -Force
$m = Get-Content inference\model\metadata.json -Raw | ConvertFrom-Json
Write-Host ("downloaded: {0}  R2={1}  MAE={2}" -f $m.algorithm, $m.metrics.r2, $m.metrics.mae)

Step "3. Build the image"
$sha = (git rev-parse --short HEAD).Trim()
$tag = "m$ModelVersion-$sha"
docker build -t "used-car-api:$tag" -t used-car-api:local --build-arg GIT_SHA=$sha --build-arg IMAGE_TAG=$tag ./inference
if ($LASTEXITCODE -ne 0) { throw "docker build failed" }

Step "4. Roll out to Kubernetes"
kubectl -n $Namespace set env deployment/used-car-api IMAGE_TAG=$tag GIT_SHA=$sha | Out-Null   # same values as the image build args
kubectl -n $Namespace set image deployment/used-car-api api="used-car-api:$tag"
if ($LASTEXITCODE -ne 0) { throw "kubectl set image failed" }
kubectl -n $Namespace annotate deployment/used-car-api kubernetes.io/change-cause="model $ModelName v$ModelVersion, git $sha" --overwrite
kubectl -n $Namespace rollout status deployment/used-car-api --timeout=180s
if ($LASTEXITCODE -ne 0) { throw "rollout failed" }

Step "5. Verify the running API"
Start-Sleep -Seconds 3
$v = Invoke-RestMethod http://localhost:30080/version
$h = Invoke-RestMethod http://localhost:30080/health
$p = Invoke-RestMethod http://localhost:30080/predict -Method Post -ContentType "application/json" -Body '{"brand":"audi","model":"A3","year":2017,"transmission":"Manual","mileage":35000,"fuel_type":"Petrol","tax":145,"mpg":55.4,"engine_size":1.4}'
Write-Host ("running image tag : {0}" -f $v.image_tag)
Write-Host ("git commit        : {0}" -f $v.git_sha)
Write-Host ("model             : {0} ({1}) R2={2}" -f $v.model_name, $v.algorithm, $v.metrics.r2)
Write-Host ("health            : {0}, model_loaded={1}" -f $h.status, $h.model_loaded)
Write-Host ("test prediction   : {0} {1}" -f $p.estimated_price, $p.currency)
if ($v.image_tag -ne $tag) { throw "the running pods do not report the new image tag" }
Write-Host "`nRELEASE OK: $tag" -ForegroundColor Green
