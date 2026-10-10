# Stage 1: Build dependencies
FROM python:3.11-slim AS builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# Stage 2: Runtime
FROM python:3.11-slim AS runtime
WORKDIR /app

COPY --from=builder /install /usr/local
COPY app ./app

EXPOSE 8001

# NOTE: No GPU packages in requirements.txt — scikit-learn runs on CPU.
# Render free tier is CPU-only; this is intentional and correct.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
