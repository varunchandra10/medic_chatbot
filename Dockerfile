FROM python:3.10-slim

WORKDIR /app

# Install minimal runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# Install lightweight Python dependencies (no heavy PyTorch wheels)
RUN pip install --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PORT=8080
EXPOSE 8080

CMD ["python", "backend/app.py"]
