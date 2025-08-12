# Experiments

This directory contains research / prototyping code that is intentionally isolated from the production backend + tools. Outputs here inform model/tool improvements but are not directly deployed.

Current subprojects:
- `qwen_rlvr`: Reinforcement Learning from Verifiers (GRPO) experiment fine‑tuning a small Qwen (0.6B) model on HPO phrase extraction.

## Philosophy
- Keep experimental dependencies separate (own virtual env / uv project).
- Prefer small, reproducible subsets of data.
- Log all training hyperparameters in code or script (avoid hidden state).
- Commit lightweight artefacts (config, scripts, small weights). Large checkpoints: use Git LFS or external storage.

## Extending with a New Experiment
1. Create subfolder: `experiments/my_experiment/`.
2. Add `pyproject.toml` + `uv.lock` with only required deps.
3. Place code under `src/`; use scripts for repeatable commands.
4. Avoid importing production code unless necessary (decouple failures).
