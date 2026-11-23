Set-Location (Split-Path $PSScriptRoot -Parent)
$o = @()
$o += (Get-Command az -ErrorAction SilentlyContinue | Out-String)
$o += (az version 2>&1 | Out-String)
$o += (az account show --query "{user:user.name,sub:name}" -o json 2>&1 | Out-String)
$o += (az extension list --query "[].name" -o tsv 2>&1 | Out-String)
$o += (git --version | Out-String)
$o | Out-File -Encoding utf8 report\tools_check.txt
