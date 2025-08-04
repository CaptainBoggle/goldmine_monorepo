FROM python:3.13-slim

# Set working directory
WORKDIR /app

# Copy shared code
COPY goldmine/ /app/goldmine/


# Copy tool-specific code, excluding hpo and hpo_vector_db (these are mounted as volumes)
COPY tools/hpo-agent/agent.py /app/tools/hpo-agent/agent.py
COPY tools/hpo-agent/app.py /app/tools/hpo-agent/app.py
COPY tools/hpo-agent/pyproject.toml /app/tools/hpo-agent/pyproject.toml
COPY tools/hpo-agent/tool.py /app/tools/hpo-agent/tool.py

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    g++ \
    curl \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Install uv
RUN pip install uv

# Set working directory to hpo-agent
WORKDIR /app/tools/hpo-agent/

# Sync Python dependencies using uv
RUN uv sync

# Set PYTHONPATH properly
ENV PYTHONPATH="/app:/app/tools/hpo-agent"

ENV HF_HOME="/app/huggingface"
# Expose FastAPI port
EXPOSE 8000

# Run FastAPI app
CMD ["uv", "run", "uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
