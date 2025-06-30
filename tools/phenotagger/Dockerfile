# syntax=docker.io/docker/dockerfile-upstream:1.14.0-labs
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    g++ \
    clang \
    make \
    openjdk-17-jdk

COPY tools/phenotagger/externals/ /app/tools/phenotagger/externals/

COPY goldmine/ /app/goldmine/
COPY tools/phenotagger/pyproject.toml /app/tools/phenotagger/pyproject.toml
COPY tools/phenotagger/uv.lock /app/tools/phenotagger/uv.lock

WORKDIR /app/tools/phenotagger

RUN pip install uv swig
RUN uv sync --frozen --package phenotagger
RUN uv run python -m nltk.downloader punkt averaged_perceptron_tagger wordnet

COPY --exclude=externals tools/phenotagger/ /app/tools/phenotagger/

EXPOSE 8000

ENV PYTHONPATH="/app:/app/tools/phenotagger/externals/PhenoTagger/src"
ENV FORCE_TF_AVAILABLE=1
CMD ["uv", "run", "uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]