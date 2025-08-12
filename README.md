# Goldmine

Goldmine is a modular platform for benchmarking Human Phenotype Ontology (HPO) extraction models across versioned evaluation corpora.

## What It Does
- Ingests curated corpora (versioned) into a PostgreSQL database.
- Runs multiple phenotype extraction tools (each isolated in its own container) on those corpora.
- Stores predictions & computes sentence‑level multilabel metrics (accuracy, precision, recall, F1, Jaccard).
- Exposes data + operations via a FastAPI backend and a React frontend.

## Stack
| Component | Tech | Default URL |
|-----------|------|-------------|
| Frontend UI | React + Tailwind | http://localhost:3000 |
| Backend API | FastAPI | http://localhost:8000 |
| Database | PostgreSQL | localhost:5432 |
| Tools (models) | FastAPI microservices | 6001+ |

## Prerequisites
1. Git and Git LFS.
   - macOS: `brew install git git-lfs`
   - Enable LFS (once globally): `git lfs install`
2. Docker Desktop (latest stable). Confirm with `docker --version`.
3. Sufficient disk space (model weights + corpora can be several GB with LFS content pulled).
4. (Optional) `uv` for Python dependency workflows outside containers:
   - Install: `curl -LsSf https://astral.sh/uv/install.sh | sh`

## Cloning (With Submodules & LFS)
Recommended single command (fresh clone):
```bash
git clone --recurse-submodules https://github.com/unsw-cse-comp99-3900/capstone-project-3900-t18a-date.git
cd capstone-project-3900-t18a-date
# Ensure all nested submodules are initialised
git submodule update --init --recursive
# Fetch large files tracked by LFS
git lfs pull
```
If you already cloned without submodules:
```bash
git submodule update --init --recursive
git lfs pull
```
To update later (bring submodules + LFS current):
```bash
git pull --rebase
git submodule update --init --recursive
git lfs pull
```

## Adding a New Git Submodule
Use submodules only for external code such as tool sources or corpora that you want to track as part of the repository.
```bash
# Add (example: external lib into externals/my-lib)
git submodule add https://github.com/owner/repo.git externals/my-lib
# Commit the new .gitmodules entry and submodule reference
git add .gitmodules externals/my-lib
git commit -m "Add submodule externals/my-lib"
```
Update a submodule to latest upstream main:
```bash
cd externals/my-lib
git fetch origin
git checkout origin/main
cd ../../
git add externals/my-lib
git commit -m "Update submodule my-lib"
```
Remove a submodule:
```bash
git submodule deinit -f externals/my-lib
rm -rf .git/modules/externals/my-lib
rm -rf externals/my-lib
git add .gitmodules
git commit -m "Remove submodule my-lib"
```

## Tracking New Large Files with Git LFS
1. Decide what to track (model weights, large embeddings, > ~10MB).
2. Add pattern(s):
```bash
git lfs track "tools/phenobert/externals/*.bin"
git lfs track "corpora/*/externals/**/*.zip"
```
3. Commit the updated `.gitattributes`:
```bash
git add .gitattributes
git add path/to/large/file
git commit -m "Track large model weights with LFS"
```
4. Push as usual (`git push`). LFS pointers are stored in Git; binaries in LFS storage.

Verify LFS status:
```bash
git lfs ls-files
```
If you accidentally committed a large file without LFS, use `git lfs migrate import --include=path/to/file` (warning: this rewrites history).

## Quick Start (Docker)
Run the full stack (frontend + backend + database + tools):
```bash
docker compose up --build
```
Then visit:
- UI: http://localhost:3000
- API docs: http://localhost:3000/api/docs
- API root: http://localhost:8000 OR http://localhost:3000/api

Stop & remove containers (data persisted in `.data/`):
```bash
docker compose down
```
Rebuild after code changes:
```bash
docker compose build && docker compose up
```
Clean rebuild (ignore cache):
```bash
docker compose build --no-cache && docker compose up
```

## Repository Layout
```
backend/     FastAPI service (ingestion, proxy, metrics)
frontend/    React application
corpora/     Versioned evaluation corpora + parsers
tools/       Model/tool containers (discovered at backend startup)
experiments/ Research & prototype training scripts
goldmine/    Shared Python package (types, toolkit interfaces)
.data/       Persistent volume (Postgres data, cached predictions/metrics)
```

## Data Persistence
The `.data` directory (host-mounted) retains:
- PostgreSQL data (`.data/postgres_data/`)
- Cached predictions / metrics (where applicable)

Deleting `.data` forces a clean ingest + recomputation on next startup.

## Development Notes
Most work only needs `docker compose up`.
If you want to run backend code locally (outside Docker):
```bash
cd backend
uv sync --frozen --package goldmine-backend
export DATABASE_URL=postgresql://postgres:password@localhost:5432/postgres
uv run uvicorn app.main:app --reload --port 8000
```
(You still need PostgreSQL running; easiest is to keep `docker compose up database`.)

Formatting & linting (repo root):
```bash
uv sync --extra dev
uv run ruff format .
uv run ruff check .
```

## Troubleshooting
| Symptom | Check |
|---------|-------|
| Missing large files | Run `git lfs pull` |
| Port conflict | Another process using 3000/8000/5432—stop it or edit compose mapping |

## Updating
Pull latest + submodules + LFS:
```bash
git pull --rebase
git submodule update --init --recursive
git lfs pull
docker compose build --pull
```

## Experiments
Experimental training / RL / fine‑tuning lives under `experiments/` (isolated dependencies). 

## Support / Further Docs
See:
- `backend/README.md`
- `tools/README.md`
- `corpora/README.md`
- `experiments/README.md`

