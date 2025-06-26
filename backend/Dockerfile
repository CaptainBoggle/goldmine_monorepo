FROM ghcr.io/astral-sh/uv:python3.13-bookworm

WORKDIR /app

# Copy the workspace pyproject.toml and lock file
COPY pyproject.toml uv.lock /app/

# Copy the goldmine package
COPY goldmine/ /app/goldmine/

# Copy the backend directory
COPY backend/ /app/backend/

# Copy the tools/compose.yml for tool discovery
COPY tools/compose.yml /app/tools/compose.yml

WORKDIR /app/backend

# Sync only the backend dependencies
RUN uv sync --frozen --package goldmine-backend

EXPOSE 8000

ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
