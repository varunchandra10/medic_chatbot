# Stable Debian-based Python image (NOT slim)
FROM python:3.10-bullseye

# Set working directory
WORKDIR /app

# Install system-level dependencies required by HF, Pinecone, google-generativeai
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    python3-dev \
    gcc \
    g++ \
    git \
    curl \
    libssl-dev \
    libffi-dev \
    libstdc++6 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first (better caching)
COPY requirements.txt .

# Install Python deps
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the app
COPY . .

# Cloud Run uses PORT env
ENV PORT=8080

# Expose port
EXPOSE 8080

# Start Flask
CMD ["python", "app.py"]
