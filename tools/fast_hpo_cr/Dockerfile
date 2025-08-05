FROM ghcr.io/astral-sh/uv:python3.13-bookworm-slim

WORKDIR /app

COPY goldmine/ /app/goldmine/
COPY tools/fast_hpo_cr/pyproject.toml /app/tools/fast_hpo_cr/pyproject.toml
COPY tools/fast_hpo_cr/uv.lock /app/tools/fast_hpo_cr/uv.lock

# the tool source
WORKDIR /app/tools/fast_hpo_cr

RUN uv sync --frozen --package fast_hpo_cr

# Copy the index
COPY tools/fast_hpo_cr/index/ /app/tools/fast_hpo_cr/index/

# Copy the tool source
COPY tools/fast_hpo_cr/app.py /app/tools/fast_hpo_cr/app.py
COPY tools/fast_hpo_cr/tool.py /app/tools/fast_hpo_cr/tool.py

EXPOSE 8000

ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

CMD ["uv", "run", "uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]

