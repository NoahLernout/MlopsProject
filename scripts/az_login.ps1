Set-Location (Split-Path $PSScriptRoot -Parent)
az login --tenant 4ded4bb1-6bff-42b3-aed7-6a36a503bf7a --use-device-code --allow-no-subscriptions *> report\az_login.txt
az account set --subscription 7c50f9c3-289b-4ae0-a075-08784b3b9042
az account show --query "{sub:name,id:id}" -o json *>> report\az_login.txt
