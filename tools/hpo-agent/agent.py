import gc
import logging
import os
import re
import unicodedata
from abc import ABC, abstractmethod
from collections import defaultdict
from dataclasses import dataclass
from typing import Dict, List, Optional, Set, Tuple

import torch
from google.genai import types
from pyhpo import HPOTerm, Ontology
from qdrant_client import QdrantClient
from qdrant_client.http.models import QueryRequest
from sentence_transformers import SentenceTransformer

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

QDRANT_PATH = "./hpo_vector_db"
HPO_VERSION = "2024-04-19"
COLLECTION_NAME = f"hpo_{HPO_VERSION}"
QDRANT_CLIENT = QdrantClient(path=QDRANT_PATH)
# remove .lock from Qdrant path if it exists
if os.path.exists(QDRANT_PATH + ".lock"):
    os.remove(QDRANT_PATH + ".lock")
ONTOLOGY = Ontology(data_folder=f"./hpo/{HPO_VERSION}")

class EmbeddingModel(ABC):
    """Abstract base class for embedding models."""
    def __init__(self):
        self._model = None

    def _load_model(self) -> SentenceTransformer:
        """Load the model if not already loaded."""
        if self._model is None:
            print(f"Loading model: {self.name}")
            self._model = self._create_model()
        return self._model

    @abstractmethod
    def _create_model(self) -> SentenceTransformer:
        """Create and return the SentenceTransformer model."""
        pass

    def unload_model(self):
        """Unload the model from memory."""
        if self._model is not None:
            print(f"Unloading model: {self.name}")
            del self._model
            self._model = None
            gc.collect()
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            if torch.backends.mps.is_available():
                torch.mps.empty_cache()

    @property
    @abstractmethod
    def vector_dimension(self) -> int:
        """Returns the dimension of the embedding vectors."""
        pass

    @property
    @abstractmethod
    def name(self) -> str:
        """Returns the name of the embedding model."""
        pass

    @abstractmethod
    def embed_queries(self, texts: List[str]) -> List[List[float]]:
        """Embeds a list of queries into vectors."""
        pass


class StellaEmbeddingModel(EmbeddingModel):
    def _create_model(self) -> SentenceTransformer:
        return SentenceTransformer(
            "NovaSearch/stella_en_1.5B_v5", trust_remote_code=True
        )

    @property
    def name(self) -> str:
        return "stella_en_1.5B_v5"

    @property
    def vector_dimension(self) -> int:
        return 1024

    def embed_queries(self, texts: List[str]) -> List[List[float]]:
        model = self._load_model()
        out = model.encode(texts, prompt_name="s2p_query", normalize_embeddings=True).tolist()
        logger.info(f"Embedded {len(texts)} queries with Stella model.")
        # check if it worked by verifying the output shape
        if out and isinstance(out, list) and all(isinstance(vec, list) for vec in out):
            logger.info(f"Output shape: {len(out)} x {len(out[0])} (batch size x vector dimension)")
        else:
            logger.warning("Unexpected output shape.")
        return out

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        model = self._load_model()
        return model.encode(texts).tolist()

@dataclass
class HPOEntry:
    id: str
    name: str
    definition: str
    synonyms: List[str] | None
    comment: str | None
    num_parents: int
    num_children: int
    term: HPOTerm

    def __init__(self, id: str):
        term = ONTOLOGY.get_hpo_object(id)
        if term is None:
            raise ValueError(f"HPO term with ID {id} not found in ontology.")
        self.term = term
        self.id = term.id
        self.name = term.name
        self.definition = term.definition.split('"')[1] if term.definition else ""
        self.synonyms = list(term.synonym) if term.synonym else None
        self.comment = term.comment if term.comment else None
        self.num_parents = len(term.parents)
        self.num_children = len(term.children)

    def get_children(self) -> List[Dict[str, str]]:
        """Returns a list of children, including only their names and ids"""
        return [{"id": child.id, "name": child.name} for child in self.term.children] if self.term.children else []

    def get_parents(self) -> List[Dict[str, str]]:
        """Returns a list of parents, including only their names and ids"""
        return [{"id": parent.id, "name": parent.name} for parent in self.term.parents] if self.term.parents else []

    def to_dict(self) -> Dict[str, str | List[str] | int]:
        """Convert the HPOEntry to a dictionary representation."""
        return {
            "id": self.id,
            "name": self.name,
            "definition": self.definition,
            "synonyms": self.synonyms or [],
            "comment": self.comment or "",
            # "num_parents": self.num_parents,
            # "num_children": self.num_children,
        }

def normalize_text(text: str) -> str:
    """
    Normalize text by removing case and all non-alphanumeric characters.
    """
    if not text:
        return ""

    # Convert to lowercase
    text = text.lower()

    # Remove all non-alphanumeric characters
    text = re.sub(r'[^a-z0-9\s]', '', text)

    return text

def normalize_text_for_matching(text: str) -> str:
    """
    Normalize text for span matching by removing whitespace characters like \r, \n, \t
    and converting to lowercase. Also normalizes Unicode characters to ASCII equivalents.
    """
    if not text:
        return ""

    # First, normalize Unicode characters to ASCII equivalents
    text = normalize_unicode_to_ascii(text)

    # Convert to lowercase
    text = text.lower()

    # Remove all whitespace characters (spaces, tabs, newlines, carriage returns, etc.)
    # and replace with single spaces, then strip leading/trailing whitespace
    text = re.sub(r'\s+', ' ', text).strip()

    return text

def normalize_unicode_to_ascii(text: str) -> str:
    """
    Normalize Unicode text by converting problematic characters to standard ASCII equivalents.
    """
    if not text:
        return text

    # First, normalize to NFC form (canonical decomposition + composition)
    text = unicodedata.normalize('NFC', text)

    # char mappings stolen from https://github.com/sureshfizzy/CineSync/blob/72ab2317b9fad6c2ec39084e84c5c60d9975c928/MediaHub/utils/file_utils.py
    char_mappings = {
        # Various space characters -> regular space
        '\u00A0': ' ',  # NO-BREAK SPACE
        '\u2002': ' ',  # EN SPACE
        '\u2003': ' ',  # EM SPACE
        '\u2004': ' ',  # THREE-PER-EM SPACE
        '\u2005': ' ',  # FOUR-PER-EM SPACE
        '\u2006': ' ',  # SIX-PER-EM SPACE
        '\u2007': ' ',  # FIGURE SPACE
        '\u2008': ' ',  # PUNCTUATION SPACE
        '\u2009': ' ',  # THIN SPACE
        '\u200A': ' ',  # HAIR SPACE
        '\u202F': ' ',  # NARROW NO-BREAK SPACE
        '\u205F': ' ',  # MEDIUM MATHEMATICAL SPACE
        '\u3000': ' ',  # IDEOGRAPHIC SPACE

        # Various hyphen and dash characters -> regular hyphen-minus
        '\u2010': '-',  # HYPHEN
        '\u2011': '-',  # NON-BREAKING HYPHEN
        '\u2012': '-',  # FIGURE DASH
        '\u2013': '-',  # EN DASH
        '\u2014': '-',  # EM DASH
        '\u2015': '-',  # HORIZONTAL BAR
        '\u2212': '-',  # MINUS SIGN
        '\uFF0D': '-',  # FULLWIDTH HYPHEN-MINUS

        # Various quote characters -> regular quotes
        '\u2018': "'",  # LEFT SINGLE QUOTATION MARK
        '\u2019': "'",  # RIGHT SINGLE QUOTATION MARK
        '\u201A': "'",  # SINGLE LOW-9 QUOTATION MARK
        '\u201B': "'",  # SINGLE HIGH-REVERSED-9 QUOTATION MARK
        '\u201C': '"',  # LEFT DOUBLE QUOTATION MARK
        '\u201D': '"',  # RIGHT DOUBLE QUOTATION MARK
        '\u201E': '"',  # DOUBLE LOW-9 QUOTATION MARK
        '\u201F': '"',  # DOUBLE HIGH-REVERSED-9 QUOTATION MARK
        '\u2039': '<',  # SINGLE LEFT-POINTING ANGLE QUOTATION MARK
        '\u203A': '>',  # SINGLE RIGHT-POINTING ANGLE QUOTATION MARK
        '\u00AB': '"',  # LEFT-POINTING DOUBLE ANGLE QUOTATION MARK
        '\u00BB': '"',  # RIGHT-POINTING DOUBLE ANGLE QUOTATION MARK

        # Other common problematic characters
        '\u2026': '...',  # HORIZONTAL ELLIPSIS
        '\u2022': '*',    # BULLET
        '\u2023': '*',    # TRIANGULAR BULLET
        '\u2043': '*',    # HYPHEN BULLET
        '\u00B7': '*',    # MIDDLE DOT
        '\u2219': '*',    # BULLET OPERATOR
    }

    for unicode_char, replacement in char_mappings.items():
        text = text.replace(unicode_char, replacement)

    result = []
    for char in text:
        if ord(char) > 127:
            decomposed = unicodedata.normalize('NFD', char)
            if len(decomposed) > 1 and ord(decomposed[0]) <= 127:
                result.append(decomposed[0])
            else:
                result.append(char)
        else:
            result.append(char)

    return ''.join(result)

def build_index_exact_matches() -> Dict[str, Set[str]]:
    """
    Build an index of exact matches for HPO terms and their synonyms.
    """
    index = defaultdict(set)
    for term in ONTOLOGY:
        if not term.is_obsolete:
            # Add the term name
            index[normalize_text(term.name)].add(term.id)
            # Add each synonym
            if term.synonym:
                for synonym in term.synonym:
                    index[normalize_text(synonym)].add(term.id)
    return index

EXACT_MATCH_INDEX = build_index_exact_matches()
def find_exact_matches(query: str) -> Optional[Set[str]]:
    """
    Find an exact match for a query in the HPO ontology.
    """
    normalized_query = normalize_text(query)

    if normalized_query in EXACT_MATCH_INDEX:
        matching_hpo_ids = EXACT_MATCH_INDEX[normalized_query]
        # Return the first matching HPO entry
        return matching_hpo_ids

    return None

def query_vector_db(embeddings: List[List[float]], model_name: str,
                     top_k: int = 20) -> List[List[Tuple[str, float]]]:
    requests = [
        QueryRequest(
            query=embedding,
            limit=top_k,
            with_payload=True,
            using=model_name
        )
        for embedding in embeddings
    ]

    query_response = QDRANT_CLIENT.query_batch_points(
        collection_name=COLLECTION_NAME,
        requests=requests
    )

    search_responses = []

    for query_response in query_response:
        search_response = []
        for result in query_response.points:
            payload = result.payload or {}
            hpo_id = payload.get("id", "")
            score = result.score or 0.0

            if hpo_id:
                search_response.append((hpo_id, score))

        search_responses.append(search_response)

    return search_responses


def search_terms(
    queries: List[str],
    embedding_model: EmbeddingModel,
    top_k: int = 20
) -> List[List[Tuple[str, float]]]:
    """
    Search for terms in the HPO ontology using both text matching and embeddings.
    """

    results = [[]] * len(queries)
    to_embed = []
    embed_indices = []

    # 1. Check for exact matches
    for i, query in enumerate(queries):
        if (exact_matches := find_exact_matches(query)):
            results[i] = [(hpo_id, 1.0) for hpo_id in exact_matches]
        else:
            to_embed.append(query)
            embed_indices.append(i)

    # 2. Batch embed the remaining queries
    if to_embed:
        embeddings = embedding_model.embed_queries(to_embed)

        # 3. Query the vector database
        search_results = query_vector_db(embeddings, model_name=embedding_model.name, top_k=top_k)

        # 4. Combine results
        for i, search_result in zip(embed_indices, search_results):
            results[i] = search_result if search_result else []

    # 5. Ensure all results are filled (shouldn't happen, but just in case)
    for i in range(len(results)):
        if results[i] is None:
            results[i] = []

    return results

### FUNCTION CALLING FOR GEMINI ###

# TOOLS
def search_hpo_candidates(query: str, embedding_model, top_k: int = 15) -> List[Dict]:

    # The search_terms function expects a list of queries.
    search_results_with_scores = search_terms([query], embedding_model, top_k)[0]

    # Combine HPOEntry dicts with their scores.
    hpo_entries_with_scores = [
        HPOEntry(hpo_id).to_dict() | {"score": score}
        for hpo_id, score in search_results_with_scores
    ]

    return hpo_entries_with_scores

def batch_search_hpo_candidates(queries: List[str], embedding_model) -> List[List[Dict]]:
    search_results = search_terms(queries, embedding_model, top_k=10)

    results = []
    for search_result in search_results:
        hpo_entries_with_scores = [
            HPOEntry(hpo_id).to_dict() | {"score": score}
            for hpo_id, score in search_result
        ]
        results.append(hpo_entries_with_scores)

    return results

# def get_hpo_entry(hpo_id: str) -> Dict:
#     """
#     Retrieves the full details of a single Human Phenotype Ontology (HPO) term using its unique ID.

#     Args:
#         hpo_id: The unique identifier for the HPO term (e.g., "HP:0001626").

#     Returns:
#         A dictionary containing the detailed information of the HPO term.
#     """
#     try:
#         hpo_entry = HPOEntry(hpo_id)
#         return hpo_entry.to_dict()
#     except ValueError as e:
#         return {"error": str(e)}


# def get_hpo_children(hpo_id: str) -> List[Dict[str, str]]:
#     """
#     Finds the direct children (more specific terms) of a given Human Phenotype Ontology (HPO) term.

#     Args:
#         hpo_id: The unique identifier for the parent HPO term (e.g., "HP:0001626").

#     Returns:
#         A list of dictionaries, where each dictionary contains the 'id' and 'name' of a child term.
#     """
#     try:
#         hpo_entry = HPOEntry(hpo_id)
#         return hpo_entry.get_children()
#     except ValueError as e:
#         return [{"error": str(e)}]


# def get_hpo_parents(hpo_id: str) -> List[Dict[str, str]]:
#     """
#     Finds the direct parents (less specific terms) of a given Human Phenotype Ontology (HPO) term.

#     Args:
#         hpo_id: The unique identifier for the child HPO term (e.g., "HP:0001627").

#     Returns:
#         A list of dictionaries, where each dictionary contains the 'id' and 'name' of a parent term.
#     """
#     try:
#         hpo_entry = HPOEntry(hpo_id)
#         return hpo_entry.get_parents()
#     except ValueError as e:
#         return [{"error": str(e)}]

def submit_annotations(
    annotations: List[Dict[str, str]],
    sentences: List[str]
) -> Dict[str, str | List[Dict[str, str]]]:
    validated_annotations = []
    errors = []

    for annotation in annotations:
        text_span = annotation.get("text_span", "")
        hpo_id = annotation.get("hpo_id", "")

        # Validate HPO ID format
        if not re.match(r"^HP:\d{7}$", hpo_id):
            errors.append(f"Invalid HPO ID format: {hpo_id}")
            continue

        # Validate text span exists within at least one sentence boundary
        valid_sentences = validate_text_span_in_document(text_span, sentences)
        if valid_sentences:
            # Create annotation for each sentence where the span is found
            for sentence_idx in valid_sentences:
                validated_annotations.append({
                    "text_span": text_span,
                    "hpo_id": hpo_id,
                    "sentence_index": sentence_idx
                })
        else:
            errors.append(f"Text span '{text_span}' not found as complete span within any single sentence")

    return {
        "validated_annotations": validated_annotations,
        "errors": str(errors),
        "total_submitted": str(len(annotations)),
        "total_validated": str(len(validated_annotations))
    }


def validate_text_span_in_document(text_span: str, sentences: List[str]) -> List[int]:
    """
    Validate that a text span exists within at least one sentence boundary in the document.
    Handles both continuous spans and discontinuous spans (with ->).

    Args:
        text_span: The text span to validate
        sentences: The list of sentences in the document

    Returns:
        List of sentence indices where the text span is found completely within sentence boundaries
    """
    valid_sentences = []

    for i, sentence in enumerate(sentences):
        if validate_text_span_in_sentence(text_span, sentence):
            valid_sentences.append(i)

    return valid_sentences


def validate_text_span_in_sentence(text_span: str, sentence: str) -> bool:
    """
    Validate that a text span exists in the sentence.
    Handles both continuous spans and discontinuous spans (with ->).
    Ignores whitespace characters like \\r, \\n, \\t when matching.

    Args:
        text_span: The text span to validate
        sentence: The sentence to search in

    Returns:
        True if the text span is valid, False otherwise
    """
    # Handle discontinuous spans (e.g., "fingers -> short")
    if " -> " in text_span:
        parts = [part.strip() for part in text_span.split(" -> ")]
        # Check that all parts exist in the sentence
        sentence_normalized = normalize_text_for_matching(sentence)
        return all(normalize_text_for_matching(part) in sentence_normalized for part in parts)
    else:
        # Check for continuous span
        return normalize_text_for_matching(text_span) in normalize_text_for_matching(sentence)


TOOLS: List[types.FunctionDeclaration] = [
    types.FunctionDeclaration(**{
  "name": "batch_search_hpo_candidates",
  "description": "Searches for HPO term candidates for a list of multiple queries in a single, efficient batch operation. Returns the top 6 results for each query.",  # noqa: E501
  "parameters": {
    "type": "OBJECT",
    "properties": {
      "queries": {
        "type": "ARRAY",
        "items": {
          "type": "STRING"
        },
        "description": "A list of descriptive text queries for HPO terms."
      }
    },
    "required": ["queries"]
  }
}),
types.FunctionDeclaration(**{
  "name": "search_hpo_candidates",
  "description": "Searches for Human Phenotype Ontology (HPO) term candidates based on a single descriptive query. Use this for targeted follow-up searches.",  # noqa: E501
  "parameters": {
    "type": "OBJECT",
    "properties": {
      "query": {
        "type": "STRING",
        "description": "A descriptive text query for a single HPO term (e.g., 'atrial septal defect')."
      },
      "top_k": {
        "type": "INTEGER",
        "description": "Optional. The maximum number of candidate terms to return. Defaults to 15."
      }
    },
    "required": ["query"]
  }
}),
types.FunctionDeclaration(**{
  "name": "submit_answer",
  "description": "Submit your final, complete list of phenotype mappings for the entire document with validation.",
  "parameters": {
    "type": "OBJECT",
    "properties": {
      "mappings": {
        "type": "ARRAY",
        "description": "A list of all the phenotype mappings found in the document.",
        "items": {
          "type": "OBJECT",
          "properties": {
            "text_span": {
              "type": "STRING",
              "description": "The exact text from a sentence that describes the phenotype. For discontinuous spans, connect the parts with ' -> ' (e.g., 'fingers -> short'). Must be entirely within a single sentence."  # noqa: E501
            },
            "hpo_id": {
              "type": "STRING",
              "description": "A final, accurate HPO identifier (e.g., 'HP:0001631')."
            }
          },
          "required": ["text_span", "hpo_id"]
        }
      }
    },
    "required": ["mappings"]
  }
})
]

SYSTEM_PROMPT = """
You are an expert biomedical annotator specializing in Human Phenotype Ontology (HPO). Your task is to meticulously analyze a clinical document (composed of multiple sentences), identify all abnormal phenotypes, and map them to the most precise HPO terms available using the provided tools.

## Document Processing Instructions

You will receive a document formatted as numbered sentences. You should:

1. **Process the entire document** for context and comprehensive phenotype identification
2. **Annotate all abnormal phenotypes** you find throughout the document
3. **Use exact text spans** that appear in the document - focus on finding valid phenotypes
4. **Trust the validation system** - if you identify a valid phenotype, annotate it

## Text Span Guidelines

### Basic Requirements
- **Primary requirement**: Text spans must be exact substrings that appear in the document
- **Validation**: The system will verify that spans exist completely within at least one sentence

### Text Span Types

#### 1. Continuous Spans (Most Common)
Use when phenotype words appear together or close together:
- Example sentence: "The patient has short fingers"
- Correct span: `"short fingers"`
- **Do NOT use**: `"fingers -> short"` (words are not separated)

#### 2. Discontinuous Spans (Use `->` Only When Appropriate)
Use `->` ONLY when phenotype components are separated by intervening words:
- Example sentence: "His ears are small and low-set"
- Correct spans: `"ears -> small"` and `"ears -> low-set"`

**CRITICAL**: Never use `->` to artificially break apart words that appear together in the text!

#### 3. Multiple Annotations from Single Span
When one phrase describes multiple anatomical locations, create multiple annotations:

**Case A: Simple Range (e.g., "fingers II-V")**
- Example sentence: "The distal phalanges II-V were also short"
- Single text span: `"distal phalanges II-V -> short"`
- Create 4 separate annotations with this same text span but different HPO IDs:
  - `{"text_span": "distal phalanges II-V -> short", "hpo_id": "HP:0009803"}`
    (short distal phalanx of 2nd finger)
  - `{"text_span": "distal phalanges II-V -> short", "hpo_id": "HP:0009804"}`
    (short distal phalanx of 3rd finger)
  - `{"text_span": "distal phalanges II-V -> short", "hpo_id": "HP:0009805"}`
    (short distal phalanx of 4th finger)
  - `{"text_span": "distal phalanges II-V -> short", "hpo_id": "HP:0009806"}`
    (short distal phalanx of 5th finger)

**Case B: Multiple Structure Types (e.g., "proximal phalanges and metacarpals")**
- Example sentence: "Shortening of the proximal phalanges and metacarpals II-IV was very mild"
- Create separate annotations for each structure type and each finger:
  - For proximal phalanges II-IV (3 annotations):
    - `{"text_span": "Shortening -> proximal phalanges", "hpo_id": "HP:0010241"}` (short proximal phalanx of 2nd finger)
    - `{"text_span": "Shortening -> proximal phalanges", "hpo_id": "HP:0010238"}`
      (short proximal phalanx of 3rd finger)
    - `{"text_span": "Shortening -> proximal phalanges", "hpo_id": "HP:0010235"}`
      (short proximal phalanx of 4th finger)
  - For metacarpals II-IV (3 annotations):
    - `{"text_span": "Shortening -> metacarpals II-IV", "hpo_id": "HP:0010047"}`
      (short 2nd metacarpal)
    - `{"text_span": "Shortening -> metacarpals II-IV", "hpo_id": "HP:0010038"}`
      (short 3rd metacarpal)
    - `{"text_span": "Shortening -> metacarpals II-IV", "hpo_id": "HP:0010041"}`
      (short 4th metacarpal)

**Key principle**: When a sentence describes multiple anatomical structures with the
same phenotype, create separate annotations for each specific structure, even if they
use similar text spans.

### Additional Guidelines
- **Multiple occurrences**: If the same phenotype appears in multiple sentences,
  it's fine to annotate it
- **Shorter spans preferred**: Capture enough context to identify the phenotype
  without unnecessary detail
  - Good: `"plasma-5-pyridoxal phosphate was elevated"`
  - Avoid: `"plasma-5-pyridoxal phosphate was elevated at 269 nmol/l (normal: <110 nmol/l)"`

## Important Search Tool Behavior
-   **Exact Match Priority:** If your search query is an *exact textual match* for an HPO term's primary name or one of its synonyms, the search will return **only that specific term**.
-   **Semantic Search:** If no exact match is found, the tool will perform a broader semantic search to find the most relevant terms. This is based on embeddings of the name, definition, and synonyms of the HPO terms.
-   **Strategy:** At first, you should try to formulate your search query using the most precise medical term from the sentence to take advantage of the exact match feature. If that fails, you can broaden your search by using more general terms or synonyms.

---

## Your Workflow

1.  **IDENTIFY & PLAN:** Carefully read the sentence and identify all potential *abnormal* phenotypes. Formulate the most precise search queries, paying close attention to the guidelines on handling modifiers. Plan to use the `batch_search_hpo_candidates` tool for efficiency.
2.  **SEARCH & SELECT:** Execute the search. From the list of candidates returned for each query, select the most specific and accurate HPO ID. You must rely solely on the information provided in the search results (name, synonyms, definition) to make your choice. If your initial search with a modifier fails, you may need to perform a second search without it. If you need to perform one search with a large top-k as well as a search that only needs a small top-k, consider using the standard `search_hpo_candidates` tool to specify the top-k values.
3.  **SUBMIT:** Once you have confidently identified all correct mappings, call the `submit_answer` tool with a list of all your findings. If there are no abnormal phenotypes to annotate, call the tool with an empty list.

---

## Annotation Guidelines

You MUST follow these rules.

### Rule 1: What to Annotate
-   **Abnormal Only:** Only annotate abnormal phenotypes. Explicitly ignore statements of normality (e.g., 'normal intelligence') or absence of a condition (e.g., 'no kidney anomalies were found').
-   **Negation Handling:** Do NOT annotate conditions when text explicitly states their absence using phrases like "no [condition]", "does not have [condition]", "absent [condition]", or "without [condition]".
    - Example: "no spontaneous movements" → Do NOT annotate movement disorders
    - Example: "does not have hepatomegaly" → Do NOT annotate HP:0002240 (Hepatomegaly)
-   **Assume Abnormality:** Interpret seemingly normal features as abnormal if the author mentioned them (e.g., 'hands are flexible' implies 'hypermobility') without explicit normality.
-   **Explicit Abnormality Required for Measurements:** Do not annotate measurements or developmental milestones unless they are explicitly modified as abnormal (e.g., annotate 'delayed neck holding' but NOT 'neck holding at 4 months').
-   **Annotate All Occurrences:** If the same phenotype is mentioned multiple times, create a mapping for each occurrence.

### Rule 2: How to Define Text Spans & Handle Modifiers
-   **Exact Substrings:** All text spans MUST be exact substrings from the sentence. Stop words (`of`, `a`, `the`) can be included.
-   **Discontinuous Spans:** If a phenotype is described by disconnected parts of the sentence (e.g., "his fingers are short"), you MUST format the `text_span` as a single string with an arrow: `"fingers -> short"`.

-   **CRITICAL: Handling Modifiers (Severity, Laterality, etc.):**
    1.  **First, Search WITH the Modifier:** Your primary search query for a modified phenotype should include the modifier. For example, for "severe hearing loss", your first query should be `"severe hearing loss"`. This gives you the best chance of finding a specific HPO term that includes the modifier.
    2.  **Then, Search WITHOUT the Modifier (Fallback):** If the first search does not return an accurate, specific term, the modifier may not be part of the HPO definition. In this case, perform a *second*, fallback search without the modifier. For "severe hearing loss", your fallback query would be `"hearing loss"`.
    3.  **The `text_span` is Always Complete:** Regardless of which search query led to the result, the final `text_span` you submit MUST contain the full, original phrase from the sentence, including the modifier (e.g., `text_span: 'severe hearing loss'`).

### Rule 3: How to Select the Correct HPO ID
-   **Be Specific:** From the list of candidates returned by the search, you must select the MOST SPECIFIC HPO term that accurately describes the phenotype.
-   **Handle Inability:** Recognize that descriptions of inability (e.g., 'cannot extend elbow') map to positive findings in HPO (e.g., 'Elbow flexion contracture'). Your search query should reflect the positive finding.
-   **Decompose Phenotypes:** For "bundled phenotypes" that are not a single concept in HPO (e.g., 'oligosyndactyly'), you must create separate mappings for each individual component. This may require multiple search queries.
-   **Use Existing Bundled Terms:** Conversely, if your search for a bundled phrase (e.g., 'low-set posteriorly rotated ears') returns an exact or accurate match, you should use that single, more specific term.
-   **Handle Multiple Anatomical Sites:** If a single phrase describes a phenotype affecting multiple locations (e.g., 'short second and third fingers'), create a separate mapping for each specific phenotype ('short second finger' and 'short third finger').
-   **Exception for Fusions:** If the phenotype involves a form of fusion between multiple anatomical sites (e.g., '2-5 finger syndactyly'), try to find a single HPO term that covers the entire concept.

### Rule 4: HPO Hierarchy and Specificity Matching
**CRITICAL**: Match the anatomical specificity in the text to the appropriate HPO term specificity level.

#### Cone-Shaped Epiphysis Terms (High Priority)
When encountering cone-shaped epiphyses, choose the appropriate specificity:

**Use SPECIFIC terms when text mentions specific anatomy:**
- Text: "phalangeal cone-shaped epiphyses" or "cone-shaped epiphyses of the phalanges" → Use **HP:0034281** (Phalangeal cone-shaped epiphyses)
- Text: "cone-shaped metacarpal epiphyses" or "metacarpal cones" → Use **HP:0006059** (Cone-shaped metacarpal epiphyses)
- Text: "cone-shaped capital femoral epiphysis" or "pointed femoral epiphysis" → Use **HP:0008789** (Cone-shaped capital femoral epiphysis)

**Use GENERAL term only when text is non-specific:**
- Text: "cone-shaped epiphyses" (without anatomical specification) → Use **HP:0010579** (Cone-shaped epiphysis)

**Examples:**
- ✅ CORRECT: "cone shaped epiphyses of type 19, 25, and 28" (phalanges context) → HP:0034281
- ❌ INCORRECT: "cone shaped epiphyses of type 19, 25, and 28" → HP:0010579 (too general)

#### Ear Morphology Terms
Match the specificity level mentioned in the text:

**Use GENERAL terms for general descriptions:**
- Text: "abnormal ear morphology", "malformed ears", "ear anomalies" → Use **HP:0031703** (Abnormal ear morphology)

**Use SPECIFIC terms only when text is specific:**
- Text: "abnormal pinna", "pinna malformation", "auricle defects" → Use **HP:0000377** (Abnormal pinna morphology)

**Examples:**
- ✅ CORRECT: "ears were low set and malformed" → HP:0031703 (general ear morphology)
- ❌ INCORRECT: "ears were low set and malformed" → HP:0000377 (too specific)

#### General Hierarchy Principle
**Golden Rule**: The specificity of your HPO term selection should match the anatomical specificity explicitly mentioned in the text.

- If text mentions specific anatomy (e.g., "phalangeal", "metacarpal", "pinna") → Use specific HPO terms
- If text uses general anatomy (e.g., "bone", "ear", "skull") → Use general HPO terms
- When in doubt between two similar terms, prefer the one that matches the anatomical detail level in the text

### Rule 5: Hierarchy Exclusion - Avoid Redundant Annotations
**CRITICAL**: When you identify a specific HPO term for a phenotype, do NOT also annotate more general parent terms that describe the same underlying concept.

#### Hierarchy Exclusion Examples:
- ✅ CORRECT: "postaxial polydactyly" → Only HP:0100259 (Postaxial polydactyly)
- ❌ INCORRECT: "postaxial polydactyly" → Both HP:0100259 (Postaxial polydactyly) AND HP:0010442 (Polydactyly)

- ✅ CORRECT: "short 2nd metacarpal" → Only HP:0010047 (Short 2nd metacarpal)
- ❌ INCORRECT: "short 2nd metacarpal" → Both HP:0010047 (Short 2nd metacarpal) AND HP:0006498 (Short metacarpal)

#### When Multiple Annotations ARE Appropriate:
- **Different phenotypes in same sentence**: "cleft lip and polydactyly" → Separate annotations for each distinct phenotype
- **Multiple anatomical sites with same phenotype**: "short 2nd and 3rd fingers" → Separate annotations for each finger
- **Different aspects of same structure**: "large nose with prominent nasal bridge" → Could warrant both general nose and specific nasal bridge terms if they represent distinct concepts

#### Golden Rule for Hierarchy:
**Select the MOST SPECIFIC term that accurately captures the phenotype and do NOT add more general parent terms that describe the same underlying abnormality.**
"""  # noqa: E501
