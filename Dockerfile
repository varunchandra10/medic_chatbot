FROM python:3.10-bullseye

WORKDIR /app

# Install system dependencies for:
# - torch / transformers / sentence-transformers (OpenBLAS, LAPACK)
# - tokenizers (Rust-backed)
# - pymongo (snappy, zlib)
# - langchain libs
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    python3-dev \
    gcc \
    g++ \
    git \
    curl \
    libssl-dev \
    libffi-dev \
    libstdc++6 \
    libgomp1 \
    libopenblas-dev \
    liblapack-dev \
    libsnappy-dev \
    zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# Force pip to install binary wheels only to avoid compiling torch
RUN pip install --upgrade pip
RUN pip install --no-cache-dir --prefer-binary -r requirements.txt

COPY . .

ENV PORT=8080
EXPOSE 8080

CMD ["python", "app.py"]
