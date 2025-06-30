FROM ghcr.io/astral-sh/uv:python3.13-bookworm

WORKDIR /app

COPY pyproject.toml uv.lock /app/
COPY goldmine/pyproject.toml /app/goldmine/pyproject.toml
COPY backend/pyproject.toml /app/backend/pyproject.toml

COPY goldmine/ /app/goldmine/

WORKDIR /app/backend

RUN uv sync --frozen --package goldmine-backend

COPY backend/app/ /app/backend/app/

# Copy the tools/compose.yml for tool discovery
COPY tools/compose.yml /app/tools/compose.yml

EXPOSE 8000

ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
