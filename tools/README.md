# Tools

This directory contains modular phenotype recognition tools (models / agents) that expose a uniform HTTP API consumed by the Goldmine backend. Each tool runs in its own Docker container and conforms to the `ModelInterface` defined in `goldmine/toolkit/interface.py`.

Design:
- Each tool has its own dependency environment + container.
- Standard endpoints for introspection and use (`/status`, `/info`, `/load`, `/predict`, `/batch_predict`, `/unload`).
- Additionally, tools expose an INCEpTION-compatible endpoint: `/external-recommender/predict` (CAS/XMI) automatically added by `create_app()` for integration with annotation platforms supporting the External Recommender API.
- Backend reads `tools/compose.yml` to discover tool service names and ports.
- New tools can be added without modifying backend code (provided they implement the interface).

## Current Tools

| Service (compose) | Implementation | Purpose / Notes |
| ----------------- | -------------- | --------------- |
| `phenotagger` | Official PhenoTagger wrapper | Deep model with dictionary + neural tagging |
| `phenobert` | PhenoBERT pipeline | Complex multi-stage NER + ontology matching |
| `hpo-agent` | LLM + embedding agent | Multi-turn agent using Gemini + vector search |
| `example-model` | Simple keyword matcher | Reference / tutorial (commented out in compose) |
| `fast_hpo_cr` | Lightweight recogniser | Fast! |

(See individual subfolders for model-specific assets under `externals/`, weights, or vector DBs.)

## Directory Layout (Typical Tool)

```
tools/
  my-new-tool/
    tool.py          # Implements a ModelInterface subclass
    app.py           # Instantiates implementation + FastAPI app
    Dockerfile       # Builds runnable container
    pyproject.toml   # Python dependencies (managed with uv)
    uv.lock          # Lockfile (commit for reproducibility)
    externals/       # (Optional) Model weights, resources, ontologies
```

## Standard API (Provided by create_app)

Endpoint summary:
- GET `/status` -> ToolStatus (state machine: unloaded/loading/ready/busy/error)
- GET `/info` -> ToolInfo (name, version, description, author)
- POST `/load` -> LoadResponse (loads weights/resources into memory)
- POST `/predict` -> ToolResponse (single document: list of sentences)
- POST `/batch_predict` -> ToolBatchResponse (list of documents)
- POST `/unload` -> UnloadResponse (frees resources)
- POST `/external-recommender/predict` -> INCEpTION External Recommender API (CAS XMI in/out)

Input Models:
- ToolInput: `{ sentences: [str, ...] }`
- ToolBatchInput: `{ documents: [[str, ...], ...] }`
- External recommender: `ExternalRecommenderPredictRequest` (includes `typeSystem`, `metadata` (layer, feature), `document` (XMI))

Output Models:
- ToolOutput / ToolResponse: `results: List[List[PhenotypeMatch]]` (outer list matches input sentence order)
- PhenotypeMatch: `{ id: "HP:0001250", match_text: "seizures" }`
- External recommender: `ExternalRecommenderPredictResponse` containing updated XMI with annotations on the requested layer/feature

## Life Cycle and States

States (ToolState enum): UNLOADED -> LOADING -> READY -> (BUSY transient) -> UNLOADING -> UNLOADED. Any failure sets ERROR.
- You must call `/load` before `/predict` (backend or UI can orchestrate this).
- The external recommender endpoint will auto-load the model if not already loaded (lazy load behavior through `model_implementation.load()`).

## Adding a New Tool

1. Create directory: `tools/my-new-tool/`.
2. Add `pyproject.toml` (use existing ones as template). Run `uv sync` locally if needed.
3. Implement `tool.py`:
   ```python
   from goldmine.toolkit.interface import ModelInterface
   from goldmine.types import ToolInfo, ToolInput, ToolOutput, PhenotypeMatch

   class MyNewTool(ModelInterface):
       def __init__(self):
           super().__init__()
           self.model = None
       async def _load_model(self):
           # Load weights/resources
           self.model = {"keyword_map": {"ataxia": "HP:0001251"}}
       async def _unload_model(self):
           self.model = None
       async def _predict(self, input: ToolInput) -> ToolOutput:
           results = []
           for sent in input.sentences:
               matches = [PhenotypeMatch(id=hpo, match_text=kw) for kw, hpo in self.model["keyword_map"].items() if kw in sent.lower()]
               results.append(matches)
           return ToolOutput(results=results)
       def _get_model_info(self) -> ToolInfo:
           return ToolInfo(name="MyNewTool", version="0.1.0", description="Demo", author="Me")
   ```
4. Add `app.py`:
   ```python
   from tool import MyNewTool
   from goldmine.toolkit.api import create_app
   model_implementation = MyNewTool()
   app = create_app(model_implementation)
   ```
5. Create `Dockerfile` (example):
   ```Dockerfile
   FROM python:3.11-slim
   WORKDIR /app/tools/my-new-tool
   COPY tools/my-new-tool/pyproject.toml .
   RUN pip install --no-cache-dir uv
   RUN uv pip install --system -r pyproject.toml
   COPY tools/my-new-tool/ .
   EXPOSE 8000
   CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
   ```
6. Update `tools/compose.yml` with new service and unique external port.
7. (Optional) Mount volumes for large weights instead of copying into image.
8. Run stack: `docker compose up --build`.
9. Verify: `curl http://localhost:<port>/info` and `/load`, then `/predict`.
Alternatively, use the backend tool proxy: `curl http://localhost:8000/proxy/my-new-tool/info`
10. Commit new directory + compose change.

## External Recommender Annotations
The `/external-recommender/predict` route expects a CAS XMI plus its TypeSystem XML. The tool implementation (provided by `create_app`) will:
1. Ensure the model is loaded (lazy load).
2. Extract raw text from `_InitialView`.
3. Run standard `_predict` producing `PhenotypeMatch` objects.
4. For each match, locate exact text occurrences and create annotations in the specified layer; the target feature is populated with an HPO term URI, and optional score/score_explanation fields are added if defined.

If custom anchoring or offset logic is needed (e.g., token alignment, case-insensitive matching, overlapping spans), extend the API factory or override inside the tool before returning `app`.

## Environment Variables & Volumes
- Example: `hpo-agent` requires `GOOG_API` (Gemini key). Provided via `environment:` in compose (e.g. `GOOG_API=xxx docker compose up`).
- Large assets (weights, indexes) can be mounted as volumes to avoid rebuilding images when content changes.

## Performance Tips

- Keep container images small (use slim base, remove caches, use `--no-cache-dir`).
- Defer heavy initialisation to `_load_model()` and keep import-time code minimal,
  e.g. avoid loading large models in the constructor (memory is precious).
- Use GPU conditionally (check `torch.cuda.is_available()`) (not compatible with macOS).

## Versioning Tools

Return a stable, semver-like string from `_get_model_info().version`. Bump when model weights or logic changes so metrics tracking distinguishes runs.

## Error Handling

- Raise exceptions inside `_predict` to transition tool to ERROR (backend/UI will show message).
- Validate HPO IDs with regex `^HP:[0-9]+$` before constructing `PhenotypeMatch` if generating IDs.

## Removing / Disabling a Tool

- Comment out or remove its service from `tools/compose.yml`.
- Optionally delete directory (preserving via git history). Database predictions remain for reproducibility.

---
For more details see `goldmine/toolkit/interface.py`, `goldmine/toolkit/api.py`, and existing tool examples.
