FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 MODEL_DIR=/app/model

WORKDIR /app

# Dependencies first: this layer is cached as long as requirements.txt does not change
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .
COPY static/ ./static/
COPY model/ ./model/

# Build metadata for the /version endpoint (traceability)
ARG GIT_SHA=dev
ARG IMAGE_TAG=dev
ENV GIT_SHA=$GIT_SHA IMAGE_TAG=$IMAGE_TAG

# Do not run as root
RUN useradd --create-home appuser && chown -R appuser /app
USER appuser

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
