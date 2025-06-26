FROM python:3.10-slim

WORKDIR /app

# shared code
COPY goldmine/ /app/goldmine/

# tool code
COPY tools/phenotagger/ /app/tools/phenotagger/

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    g++ \
    make \
    openjdk-17-jdk

RUN uv sync --frozen --package example-model
RUN python -m nltk.downloader punkt averaged_perceptron_tagger wordnet

EXPOSE 8000

ENV PYTHONPATH="${PYTHONPATH}:/app:/app/PhenoTagger/src"
CMD ["uv", "run", "uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
