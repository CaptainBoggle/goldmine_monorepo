FROM python:3.10-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    g++ \
    make \
    openjdk-17-jdk

COPY PhenoTagger/ ./PhenoTagger
RUN pip install --no-cache-dir -r PhenoTagger/requirements.txt
RUN python -m nltk.downloader punkt averaged_perceptron_tagger wordnet

# Copy any other files

WORKDIR /app
ENV PYTHONPATH="${PYTHONPATH}:/app/PhenoTagger/src"
CMD ["python", "PhenoTagger_tagging.py", "-i", "../example/input/", "-o", "../example/output"]