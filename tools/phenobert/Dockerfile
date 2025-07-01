FROM ghcr.io/astral-sh/uv:python3.11-bookworm-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    g++ \
    wget \
    && rm -rf /var/lib/apt/lists/*

COPY tools/phenobert/externals/PhenoBERT/ /app/tools/phenobert/externals/PhenoBERT/

COPY tools/phenobert/externals/PhenoBERT_data/embeddings/fasttext_pubmed.bin /app/tools/phenobert/externals/PhenoBERT/phenobert/embeddings/fasttext_pubmed.bin
COPY tools/phenobert/externals/PhenoBERT_data/embeddings/biobert_v1.1_pubmed/ /app/tools/phenobert/externals/PhenoBERT/phenobert/embeddings/biobert_v1.1_pubmed/
COPY tools/phenobert/externals/PhenoBERT_data/models/bert_model_max_triple.pkl /app/tools/phenobert/externals/PhenoBERT/phenobert/models/bert_model_max_triple.pkl
COPY tools/phenobert/externals/PhenoBERT_data/models/HPOModel_H/ /app/tools/phenobert/externals/PhenoBERT/phenobert/models/HPOModel_H/

COPY goldmine/ /app/goldmine/

COPY tools/phenobert/pyproject.toml /app/tools/phenobert/pyproject.toml
COPY tools/phenobert/uv.lock /app/tools/phenobert/uv.lock

# Set working directory to phenobert
WORKDIR /app/tools/phenobert

RUN uv sync --frozen --package phenobert

RUN uv run python -c "import nltk; nltk.download('punkt'); nltk.download('averaged_perceptron_tagger'); nltk.download('wordnet'); nltk.download('stopwords')"
RUN uv run python -c "import stanza; stanza.download('en', package='mimic', processors={'ner': 'i2b2'})"

# This isn't in the original setup.py but is required for the code to run
RUN uv run python -c "import nltk; nltk.download('averaged_perceptron_tagger_eng')"

# The code expects ../models/ and ../data/ from the working directory
# since we can't nicely modify the paths in the code, we create symlinks
RUN ln -s /app/tools/phenobert/externals/PhenoBERT/phenobert/models /app/tools/models
RUN ln -s /app/tools/phenobert/externals/PhenoBERT/phenobert/data /app/tools/data
RUN ln -s /app/tools/phenobert/externals/PhenoBERT/phenobert/embeddings /app/tools/embeddings

COPY tools/phenobert/app.py /app/tools/phenobert/app.py
COPY tools/phenobert/tool.py /app/tools/phenobert/tool.py

EXPOSE 8000

# Set environment variables
ENV PYTHONPATH="/app:/app/tools/phenobert/externals/PhenoBERT/phenobert/utils:/app/tools/phenobert/externals/PhenoBERT/phenobert/utils/fastNLP"
ENV PYTHONUNBUFFERED=1

CMD ["uv", "run", "uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]