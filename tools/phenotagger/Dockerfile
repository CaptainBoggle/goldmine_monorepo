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

# Copy any other files

ENV PYTHONPATH="${PYTHONPATH}:/app:/app/PhenoTagger/src"
CMD ["python", "PhenoTagger_tagging.py", "-i", "../example/input/", "-o", "../example/output"]