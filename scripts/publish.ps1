# Commit everything and push to GitHub (origin = NoahLernout/MlopsProject)
param([string]$Message = "Update project")
Set-Location (Split-Path $PSScriptRoot -Parent)
git add -A
git commit -m $Message
git push -u origin main
