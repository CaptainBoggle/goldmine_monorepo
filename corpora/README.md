# Corpora

This directory contains evaluation corpora used to benchmark phenotype (HPO) recognition tools in the Goldmine system.

Each subfolder defines ONE corpus and must expose a `corpus.py` file that instantiates a `parser` object implementing the `CorpusParser` interface (see `goldmine/corpus_base.py`). The backend auto-discovers and ingests corpora at startup.

## Existing Corpora

| Corpus | Purpose | Size |
| ------ | ------- | ---- |
| `gold_corpus` | Full gold-standard evaluation set | Large (~300 docs) |
| `gold_corpus_small` | Reduced subset for development/testing | Medium (~30 docs) |
| `tiny_corpus` | Minimal (very fast) test set | Tiny (~10 docs) |

All three share the same annotation format (BioC XML) placed under `externals/Annotations_BioC/<DOC_ID>/lwit.xml`.

## Folder Layout (Template)

```
corpora/
  my_new_corpus/
    corpus.py          # Implements parser + exposes `parser` instance
    externals/         # Raw source data (e.g. exported annotations)
      README.md        # (Optional) Provenance / license notes
      Annotations_BioC/
        <doc_1>/lwit.xml
        <doc_2>/lwit.xml
        ...
```

You can adapt the layout; just make sure `corpus.py` exists at the root and that `parse_corpus()` knows where to look.

## Parser Interface

A parser must subclass `CorpusParser` and implement:

- `get_hpo_version() -> str`  Return the HPO ontology release used when annotating.
- `get_description() -> str`  Human-readable corpus description.
- `get_version() -> str`      Corpus data + parser version (MUST be stable; do NOT return `latest`). Easily implemented as a content hash of relevant files.
- `parse_corpus(corpus_path: Path) -> List[CorpusDocument]`  Convert raw files into a list of `CorpusDocument` objects.

## Data Model (goldmine/types.py)

- `Corpus` contains metadata + list of `CorpusDocument` entries.
- `CorpusDocument` stores:
  - `name` (document id)
  - `annotator`
  - `input` (`ToolInput`): `sentences: List[str]`
  - `output` (`ToolOutput`): `results: List[List[PhenotypeMatch]]` (parallel to sentences)
- `PhenotypeMatch` has:
  - `id`: HPO CURIE (e.g. `HP:0001250`)
  - `match_text`: surface text (or combined text for relations)

The length of `results` must equal number of sentences.

## Versioning

Current corpora compute a SHA1 hash over all `lwit.xml` files:
```python
return get_hash_for_file_types_in_path(corpus_path, ["lwit.xml"])
```
Alternative (explicit semantic version) is acceptable if you manually bump on data changes.

## Ingestion Workflow

1. Backend service (`CorpusIngestionService`) scans `corpora/` for subdirectories containing `corpus.py`.
2. Dynamically imports the module and looks for a `parser` variable that is an instance of `CorpusParser`.
3. Calls `parser.get_version()`; if (name, version) not already present in DB, parses and inserts.
4. Skips if already ingested.

On application start (docker compose up), all corpora are attempted.

## Adding a New Corpus (Step-by-Step)

1. Choose a unique directory name under `corpora/` (e.g. `clinical_notes_v1`).
2. Place raw annotation files under a logical substructure (e.g. `externals/Annotations_BioC/...`).
3. Create `corpus.py` implementing your parser. Minimal example:
   ```python
   import pathlib, re, xml.etree.ElementTree as ET
   from pathlib import Path
   from typing import List
   from goldmine.corpus_base import CorpusParser
   from goldmine.types import CorpusDocument, ToolInput, ToolOutput, PhenotypeMatch

   class ClinicalNotesParser(CorpusParser):
       def get_hpo_version(self) -> str:
           return "2024-02-08"
       def get_description(self) -> str:
           return "Clinical notes corpus (anonymised)"
       def get_version(self) -> str:
           # Replace with hash helper or semantic version
           return "1.0.0"
       def parse_corpus(self, corpus_path: Path) -> List[CorpusDocument]:
           docs = []
           data_dir = corpus_path / "externals" / "Annotations_BioC"
           for doc_dir in data_dir.iterdir():
               if not doc_dir.is_dir():
                   continue
               xml_file = doc_dir / "lwit.xml"
               if not xml_file.exists():
                   continue
               tree = ET.parse(xml_file)
               root = tree.getroot()
               sentences, results = [], []
               # (Implement extraction similar to existing corpora.)
               # Ensure len(sentences) == len(results)
               docs.append(CorpusDocument(
                   name=doc_dir.name,
                   annotator="unknown",
                   input=ToolInput(sentences=sentences),
                   output=ToolOutput(results=results)
               ))
           return docs
   parser = ClinicalNotesParser()
   ```
4. (Optional) Add an `externals/README.md` documenting source, licensing, preprocessing.
5. Run backend to ingest:
   - If using Docker: `docker compose up --build` (from repo root). Watch logs for "Successfully ingested corpus".
6. Verify ingestion via API (e.g. GET `/corpora` if an endpoint exists) or database.
7. Commit the corpus. Large raw files may benefit from [Git LFS](https://git-lfs.github.com/).

## Updating a Corpus

If data or parser logic changes and you want a re-ingest:
- If hashing strategy: any file change auto-generates a new version hash.
- If semantic version: manually bump `get_version()` return value.
- Restart backend; new version ingests alongside old (enabling historical comparisons).
- Note that any changes without a version bump will be ignored!
---
For questions on parser implementation see `goldmine/corpus_base.py` and existing examples.
