# One-off: rebuild history as a single commit authored only by the git user configured on this PC, then force-push.
Set-Location (Split-Path $PSScriptRoot -Parent)
git config user.name "Noah Lernout"
git config user.email "noah.lernout@student.howest.be"
git checkout --orphan clean-main
git add -A
git commit -m "Used-car price estimator: Azure ML pipeline, FastAPI API with web UI, Docker, Kubernetes, CI/CD, report"
git branch -M clean-main main
git push --force -u origin main
git log --format="%h %an <%ae> %s"
