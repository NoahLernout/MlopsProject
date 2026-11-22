# Runs the pytest suite in a clean Python 3.11 container (no local Python needed).
docker run --rm -v "${PWD}:/w" -w /w python:3.11-slim sh -c "pip install -q --root-user-action=ignore -r tests/requirements.txt && pytest -q tests -p no:cacheprovider" *> report\pytest_output.txt
Get-Content report\pytest_output.txt -Tail 15
