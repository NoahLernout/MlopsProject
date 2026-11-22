git init -b main
git config user.name "Noah Lernout"
git config user.email "noreply@localhost"
git add -A
git commit -m "Initial commit: used-car price estimator (Azure ML pipeline, FastAPI, Docker, Kubernetes, CI/CD)"
git log --oneline *> report\git_log.txt
git ls-files *>> report\git_log.txt
