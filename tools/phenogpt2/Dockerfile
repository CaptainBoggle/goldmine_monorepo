FROM python:3.10-slim

WORKDIR /app

# Copy shared code
COPY goldmine/ /app/goldmine/

# Copy tool-specific code
COPY tools/phenogpt2/ /app/tools/phenogpt2/

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    g++ \
    make \
    curl \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Install uv
RUN pip install uv

# Sync dependencies for phenogpt2
WORKDIR /app/tools/phenogpt2/
RUN uv sync

# Set PYTHONPATH to include app modules
ENV PYTHONPATH="${PYTHONPATH}:/app:/app/tools/phenogpt2"

# Expose port for FastAPI
EXPOSE 8000

# Run FastAPI app
CMD ["uv", "run", "uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]

