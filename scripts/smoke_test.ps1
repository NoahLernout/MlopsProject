# Smoke test for the used-car API. Usage: .\scripts\smoke_test.ps1 [-Base http://localhost:8000]
param([string]$Base = "http://localhost:8000", [string]$Out = "report\api_test.txt")
$body = '{"brand":"vw","model":"Golf","year":2018,"mileage":25000,"transmission":"Manual","fuel_type":"Petrol","tax":145,"mpg":55.4,"engine_size":1.4}'
$bad  = '{"brand":"tesla","model":"X","year":2018,"mileage":25000,"transmission":"Manual","fuel_type":"Petrol","tax":145,"mpg":55.4,"engine_size":1.4}'
$o = @()
$o += "GET /health   -> " + (irm "$Base/health" | ConvertTo-Json -Compress)
$o += "POST /predict -> " + (irm -Method Post "$Base/predict" -ContentType 'application/json' -Body $body | ConvertTo-Json -Compress)
try { irm -Method Post "$Base/predict" -ContentType 'application/json' -Body $bad | Out-Null; $o += "POST /predict (invalid brand) -> unexpectedly accepted" }
catch { $o += "POST /predict (invalid brand) -> rejected with HTTP " + [int]$_.Exception.Response.StatusCode }
$o += "GET /predictions -> " + (irm "$Base/predictions?limit=3" | ConvertTo-Json -Compress -Depth 4)
$o | Out-File -Encoding utf8 $Out
$o
