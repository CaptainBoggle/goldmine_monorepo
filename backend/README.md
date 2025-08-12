# Backend

FastAPI service that orchestrates corpus ingestion, tool discovery, prediction storage, and evaluation.

## High-Level Responsibilities
- Expose REST API for corpora, tools, predictions, and metrics.
- Discover corpora on startup, version them, and persist in PostgreSQL.
- Discover tool containers from `tools/compose.yml` (no hard-coded registry).
- Proxy requests to tool containers (load, predict, unload) with consistent schemas.
- Store tool predictions and compute evaluation metrics (accuracy, precision, recall, F1, Jaccard) at sentence granularity.

## Startup Lifecycle
1. Container starts (see `backend/Dockerfile`).
2. `app.main:lifespan` executes:
   - Builds database URL from `DATABASE_URL` (defaults to `postgresql://postgres:password@database:5432/postgres`).
   - Initialises `DatabaseService`.
   - Creates tables (if absent) via SQLModel metadata.
   - Runs `CorpusIngestionService.ingest_all_corpora()` on `/app/corpora` (copied in image) – each subdirectory with `corpus.py` is parsed and added if version not already present.
3. Routers registered; service ready.

## Architecture Overview

Component layers:
- API Layer: FastAPI routers under `backend/app/routers/`.
- Services: `database.py`, `corpus_ingestion.py`, `tool_service.py` encapsulate infrastructure concerns.
- Domain Models: Pydantic/SQLModel classes in `goldmine/types.py`.
- External Tools: Separate containers implementing `ModelInterface` (see `tools/`).

Key modules:
- `main.py` – App assembly, global exception handling.
- `services/database.py` – Engine + session management + ingestion trigger.
- `services/corpus_ingestion.py` – Dynamic import of `parser` instances; version dedupe.
- `services/tool_service.py` – Parses `tools/compose.yml` once at import to build discovery registry.
- `dependencies.py` – Provides shared `ToolService` singleton for injection.
- Routers:
  - `tools.py` – Lists discovered tools.
  - `tool_proxy.py` – Proxies standard endpoints to specific tool containers.
  - `corpora.py` – CRUD + pagination + random selection for corpus documents.
  - `predictions.py` – Batch inference of a tool across a corpus; stores predictions.
  - `metrics.py` – Derives evaluation metrics from stored predictions.


## Corpus Ingestion Details
- A corpus directory must contain `corpus.py` defining a `parser: CorpusParser` instance.
- Parser provides deterministic `get_version()` (hash or semantic string). Version string `'latest'` is **reserved** and rejected during ingestion.
- Ingestion skips corpus/version pairs already present (allows coexistence of multiple versions for longitudinal evals).
- Retrieval shortcut: Endpoints accept the literal path segment `latest` (e.g. `/corpora/gold_corpus/latest/documents`) to resolve to the most recently ingested version (ordered by auto-increment id). This is a *lookup convenience* and does not correspond to any stored `corpus_version` value.

## Tool Discovery & Proxying
- `ToolService` reads `tools/compose.yml` **once at process start (module import time)**; each service becomes a `ToolDiscoveryInfo` with internal endpoint `http://<service_name>:<port>`.
- Updating `tools/compose.yml`:
  - If the file is baked into the image (current Dockerfile COPY), a rebuild + restart is required.
  - If you mount it as a volume for development, a simple backend restart reloads discovery (hot reload is not automatic without restart).
- `external_port` in `ToolDiscoveryInfo` is **informational** (useful for UI links). All backend-to-tool calls use the internal DNS name + internal port.
- The backend never imports tool code directly; it only performs HTTP calls.
- Proxy endpoints add timeout handling and translate tool unavailability into 4xx/5xx responses.

## Prediction Workflow
1. Client calls `POST /predictions/{tool}/{corpus}/{version}/predict`.
2. Backend checks tool `/status` is `ready`.
3. Aggregates all corpus sentences into batch payload: `{documents: [[sent,...], ...]}`.
4. Calls tool `/batch_predict`.
5. Stores each document’s returned result set as a `Prediction` row.

## Metrics Computation
- Client calls `POST /metrics/{tool}/{corpus}/{version}`.
- Backend flattens each sentence’s gold vs predicted HPO ID sets.
- Uses `evaluate` library + scikit-learn for: accuracy, micro F1, micro precision/recall, micro Jaccard.
- Accuracy here is **multilabel subset accuracy** (an exact match of the *entire* set of HPO IDs for a sentence). Partial overlap still contributes via other metrics (F1, Jaccard) but counts as incorrect for accuracy.
- Persists a `Metric` row (one per evaluation run; multiple rows can exist).

## Error Handling
- Global exception handler returns JSON `{detail, type}` and logs traceback.
- Validation errors (RequestValidationError) return 422 with field summaries.
- Tool proxy converts connection / HTTP status issues into 503 or upstream status.

## Local Development
```bash
# Rebuild backend after code changes (from repo root)
docker compose build backend
docker compose up backend

# Tail logs
docker logs -f backend
```

## Adding a New Router
1. Create file in `backend/app/routers/` with APIRouter instance.
2. Inject dependencies via `Depends` (e.g., DB session).
3. Register in `main.py` with `app.include_router(...)`.

## Database Layer
- Uses SQLModel (Pydantic + SQLAlchemy) for schema + validation.
- Relationships: `Corpus` 1..* `CorpusDocument`; `CorpusDocument` 1..* `Prediction`.
- JSON columns store nested structures (input/output) to avoid join explosion.
- Connection pooling configured to mitigate idle timeout (`pool_recycle=3600`, `pool_pre_ping=True`).

## OpenAPI Docs
Interactive docs: `GET /docs` (Swagger UI)


## Quick Endpoint Reference
- / (root), /health
- /tools/ – list discovered tool services
- /proxy/{tool}/(status|info|load|unload|predict|batch_predict)
- /corpora/ – list corpora
- /corpora/{name}/{version} – corpus metadata (use literal `latest` for newest)
- /corpora/{name}/{version}/documents – paginated docs
- /corpora/{name}/{version}/documents/random – random doc
- /corpora/{name}/{version}/document/{doc_name} – specific doc
- /predictions/{tool}/{corpus}/{version}/predict – run & persist predictions
- /predictions/{tool}/{corpus}/{version} – list stored predictions
- /metrics/{tool}/{corpus}/{version} (POST) – compute & store metrics
- /metrics/{tool}/{corpus}/{version} (GET) – list metric rows

## When to Rebuild
Rebuild backend image if:
- Backend code changes
- `goldmine/` types change
- New / modified corpora
- `tools/compose.yml` changes (to refresh discovery; restart only if volume-mounted)

