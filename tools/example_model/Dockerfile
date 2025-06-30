FROM ghcr.io/astral-sh/uv:python3.13-bookworm

WORKDIR /app

COPY goldmine/ /app/goldmine/
COPY tools/example_model/pyproject.toml /app/tools/example_model/pyproject.toml
COPY tools/example_model/uv.lock /app/tools/example_model/uv.lock

# the tool source
WORKDIR /app/tools/example_model

RUN uv sync --frozen --package example-model

# Copy the tool source
COPY tools/example_model/app.py /app/tools/example_model/app.py
COPY tools/example_model/tool.py /app/tools/example_model/tool.py

EXPOSE 8000

ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

CMD ["uv", "run", "uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]

