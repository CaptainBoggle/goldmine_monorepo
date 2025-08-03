#!/usr/bin/env bash
export CUDA_VISIBLE_DEVICES=0
exec vf-vllm \
     --model willcb/Qwen3-0.6B \
     --host 0.0.0.0 \
     --port 8000 \
     --max-model-len 758 \
     --enforce-eager