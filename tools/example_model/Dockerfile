FROM ghcr.io/astral-sh/uv:python3.13-bookworm

WORKDIR /app

# Copy the goldmine package
COPY goldmine/ /app/goldmine/

# Copy the example_model tool directory (includes its own uv.lock)
COPY tools/example_model/ /app/tools/example_model/

WORKDIR /app/tools/example_model

# Sync only the current package (example-model) dependencies
RUN uv sync --frozen --package example-model

EXPOSE 8000

ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

CMD ["uv", "run", "uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]

