#!/usr/bin/env bash
export CUDA_VISIBLE_DEVICES=1
export VLLM_URL=http://localhost:8000

exec accelerate launch \
     --num_processes 1 \
     src/train.py