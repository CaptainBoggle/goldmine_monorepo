FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Copy shared code
COPY goldmine/ /app/goldmine/

# Copy tool-specific code
COPY tools/gpt2/ /app/tools/gpt2/

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    g++ \
    curl \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Install uv
RUN pip install uv

# Set working directory to gpt2
WORKDIR /app/tools/gpt2/

# Sync Python dependencies using uv, including extra index for PyTorch CPU
RUN uv sync --extra-index-url https://download.pytorch.org/whl/cpu

# Set PYTHONPATH properly
ENV PYTHONPATH="/app:/app/tools/gpt2"

# Expose FastAPI port
EXPOSE 8000

# Run FastAPI app
CMD ["uv", "run", "uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
