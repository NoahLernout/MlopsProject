# Build the Lovable React UI (bun project) in a container and install the static result into inference/static
Set-Location (Split-Path $PSScriptRoot -Parent)
docker run --rm -v "${PWD}/lovable-ui:/app" -w /app oven/bun:1 sh -c "bun install && bun run build"
if (Test-Path lovable-ui\.output\public) {
  if (Test-Path inference\static) { Remove-Item inference\static -Recurse -Force }
  New-Item -ItemType Directory inference\static | Out-Null
  Copy-Item lovable-ui\.output\public\* inference\static -Recurse
  # the SPA shell becomes index.html; make asset URLs point below /ui/
  $html = (Get-Content inference\static\_shell.html -Raw -Encoding UTF8) -replace '/\./assets/', '/ui/assets/'
  [System.IO.File]::WriteAllText("$PWD\inference\static\index.html", $html, (New-Object System.Text.UTF8Encoding($false)))
  Remove-Item inference\static\_shell.html
  Get-ChildItem inference\static
}
