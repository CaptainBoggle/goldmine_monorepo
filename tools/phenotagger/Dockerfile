FROM python:3.11-slim

WORKDIR /app

COPY goldmine/ /app/goldmine/
COPY tools/phenotagger/pyproject.toml /app/tools/phenotagger/pyproject.toml
COPY tools/phenotagger/uv.lock /app/tools/phenotagger/uv.lock

WORKDIR /app/tools/phenotagger

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    g++ \
    clang \
    make \
    openjdk-17-jdk

RUN pip install uv swig
RUN uv sync --frozen --package phenotagger
RUN uv run python -m nltk.downloader punkt averaged_perceptron_tagger wordnet

COPY tools/phenotagger/ /app/tools/phenotagger/

EXPOSE 8000

ENV PYTHONPATH="/app:/app/tools/phenotagger/externals/PhenoTagger/src"
CMD ["uv", "run", "uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
