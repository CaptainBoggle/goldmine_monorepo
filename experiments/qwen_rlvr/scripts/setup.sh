#!/bin/bash

set -e

if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

uv sync
source .venv/bin/activate

uv pip install flash-attn --no-build-isolation

if [ -n "$WANDB_API_KEY" ]; then
  wandb login --relogin "$WANDB_API_KEY"
else
  echo "WANDB_API_KEY not set; skipping wandb login"
fi

if [ -n "$HF_TOKEN" ]; then
  huggingface-cli login --token "$HF_TOKEN"
else
  echo "HF_TOKEN not set; skipping HF login"
fi
