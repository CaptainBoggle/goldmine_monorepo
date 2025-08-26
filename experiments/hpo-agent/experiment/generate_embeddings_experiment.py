from abc import ABC, abstractmethod
from math import e
from typing import List
import gc
import tracemalloc

import torch
from pyhpo import Ontology
from qdrant_client import QdrantClient
from qdrant_client.models import VectorParams, Distance, PointStruct, Direction, OrderBy
from sentence_transformers import SentenceTransformer
from tqdm import tqdm
import os
from google import genai
from google.genai import types
import json
HPO_VERSION = "2024-04-19"
QDRANT_PATH = "./hpo_vector_db"
ont = Ontology(data_folder=f"./hpo/{HPO_VERSION}")

def to_vector_list(v):
    """Safely convert a vector to a plain Python list."""
    if hasattr(v, 'tolist'):
        return v.tolist()
    elif isinstance(v, list):
        return v
    elif hasattr(v, '__array__'):
        return v.__array__().tolist()
    else:
        return list(v)

def hpo_to_passage(term):
    """
    Converts an HPO term to a passage for embedding.
    Includes term name, definition, and synonyms.
    """
    synonyms_str = ", ".join(term.synonym) if term.synonym else ""
    passage = f"{term.name}\n{term.definition}\n{synonyms_str}"
    return passage


class EmbeddingModel(ABC):
    def __init__(self):
        self._model = None
    
    def _load_model(self):
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

    @property
    @abstractmethod
    def batch_size(self) -> int:
        """Returns the optimal batch size for this model."""
        return 256


    @abstractmethod
    def embed_query(self, texts: List[str]) -> List[List[float]]:
        """Embeds a list of queries into vectors."""
        pass

    @abstractmethod
    def embed_document(self, texts: List[str]) -> List[List[float]]:
        """Embeds a list of documents into vectors."""
        pass


# gemini_client = genai.Client(api_key=os.getenv("GOOG_API"))
class GeminiEmbeddingModel(EmbeddingModel):
    def _create_model(self) -> SentenceTransformer:
        # dummy implementation
        return SentenceTransformer(        )
    
    @property
    def vector_dimension(self) -> int:
        return 3072
    
    @property
    def name(self) -> str:
        return "gemini-embedding-001"
    
    @property
    def batch_size(self) -> int:
        return 100
    
    def embed_query(self, texts: List[str]) -> List[List[float]]:
        """Embed queries using Gemini API."""
        print(f"Embedding {len(texts)} queries with Gemini...")
        response = gemini_client.models.embed_content(
            model="gemini-embedding-001",
            contents=list(texts),
            config=types.EmbedContentConfig(task_type="SEMANTIC_SIMILARITY")
        )

        if response:
            # Convert embeddings to list format
            if response.embeddings:
                result = [emb.values for emb in response.embeddings if emb.values is not None]

                return result
        raise ValueError("No embeddings returned from Gemini API")

    def embed_document(self, texts: List[str]) -> List[List[float]]:
        return self.embed_query(texts)  # Same method for documents in Gemini API
    

class GeminiEmbeddingModelRetrieval(EmbeddingModel):
    def _create_model(self) -> SentenceTransformer:
        # dummy implementation
        return SentenceTransformer(        )
    
    @property
    def vector_dimension(self) -> int:
        return 3072
    
    @property
    def name(self) -> str:
        return "gemini-embedding-001_retrieval"
    
    @property
    def batch_size(self) -> int:
        return 100
    
    def embed_query(self, texts: List[str]) -> List[List[float]]:
        """Embed queries using Gemini API."""
        print(f"Embedding {len(texts)} queries with Gemini...")
        response = gemini_client.models.embed_content(
            model="gemini-embedding-001",
            contents=list(texts),
            config=types.EmbedContentConfig(task_type="RETRIEVAL_QUERY")
        )

        if response:
            # Convert embeddings to list format
            if response.embeddings:
                result = [emb.values for emb in response.embeddings if emb.values is not None]

                return result
        raise ValueError("No embeddings returned from Gemini API")

    def embed_document(self, texts: List[str]) -> List[List[float]]:
        print(f"Embedding {len(texts)} queries with Gemini...")
        response = gemini_client.models.embed_content(
            model="gemini-embedding-001",
            contents=list(texts),
            config=types.EmbedContentConfig(task_type="RETRIEVAL_DOCUMENT")
        )

        if response:
            # Convert embeddings to list format
            if response.embeddings:
                result = [emb.values for emb in response.embeddings if emb.values is not None]

                return result
        raise ValueError("No embeddings returned from Gemini API")


class JinaEmbeddingModel(EmbeddingModel):
    def _create_model(self) -> SentenceTransformer:
        return SentenceTransformer(
            "jinaai/jina-embeddings-v3", trust_remote_code=True
        )

    @property
    def vector_dimension(self) -> int:
        return 1024

    @property
    def name(self) -> str:
        return "jina-embeddings-v3_retrieval"

    @property
    def batch_size(self) -> int:
        return 320  # Medium model - conservative batch size for 32GB RAM

    def embed_query(self, texts: List[str]) -> List[List[float]]:
        model = self._load_model()
        return model.encode(texts, task="retrieval.query").tolist()

    def embed_document(self, texts: List[str]) -> List[List[float]]:
        model = self._load_model()
        return model.encode(texts, task="retrieval.passage").tolist()
    

class JinaSTSEmbeddingModel(JinaEmbeddingModel):
    @property
    def name(self) -> str:
        return "jina-embeddings-v3_text-matching"

    @property
    def batch_size(self) -> int:
        return 320  # Medium model - conservative batch size for 32GB RAM

    def embed_query(self, texts: List[str]) -> List[List[float]]:
        model = self._load_model()
        return model.encode(texts, task="text-matching").tolist()

    def embed_document(self, texts: List[str]) -> List[List[float]]:
        model = self._load_model()
        return model.encode(texts, task="text-matching").tolist()


class NomicEmbeddingModel(EmbeddingModel):
    def _create_model(self) -> SentenceTransformer:
        return SentenceTransformer(
            "nomic-ai/nomic-embed-text-v1.5", trust_remote_code=True
        )

    @property
    def vector_dimension(self) -> int:
        return 768

    @property
    def name(self) -> str:
        return "nomic-embed-text-v1.5"

    @property
    def batch_size(self) -> int:
        return 512  # Small model - larger batch size allowed

    def embed_query(self, texts: List[str]) -> List[List[float]]:
        model = self._load_model()
        return model.encode([f"search_query: {text}" for text in texts]).tolist()

    def embed_document(self, texts: List[str]) -> List[List[float]]:
        model = self._load_model()
        return model.encode(
            [f"search_document: {text}" for text in texts]
        ).tolist()


class StellaEmbeddingModel(EmbeddingModel):
    def _create_model(self) -> SentenceTransformer:
        return SentenceTransformer(
            "NovaSearch/stella_en_1.5B_v5", trust_remote_code=True
        )

    @property
    def vector_dimension(self) -> int:
        return 1024

    @property
    def name(self) -> str:
        return "stella_en_1.5B_v5"

    @property
    def batch_size(self) -> int:
        return 64  # Largest model - smallest batch size

    def embed_query(self, texts: List[str]) -> List[List[float]]:
        model = self._load_model()
        return model.encode(texts, prompt_name="s2p_query").tolist()

    def embed_document(self, texts: List[str]) -> List[List[float]]:
        model = self._load_model()
        return model.encode(texts).tolist()


class JasperEmbeddingModel(EmbeddingModel):
    def _create_model(self) -> SentenceTransformer:
        return SentenceTransformer(
            "NovaSearch/jasper_en_vision_language_v1", trust_remote_code=True,
            model_kwargs={
            "torch_dtype": torch.bfloat16,
            "attn_implementation": "sdpa"
        },
        device="mps",
        config_kwargs={"is_text_encoder": True, "vector_dim": 1024},
        )

    @property
    def vector_dimension(self) -> int:
        return 1024

    @property
    def name(self) -> str:
        return "jasper_en_vision_language_v1"

    @property
    def batch_size(self) -> int:
        return 128  # Vision-language model - medium batch size

    def embed_query(self, texts: List[str]) -> List[List[float]]:
        model = self._load_model()
        return model.encode(texts).tolist()

    def embed_document(self, texts: List[str]) -> List[List[float]]:
        model = self._load_model()
        return model.encode(texts).tolist()

class BioLORDEmbeddingModel(EmbeddingModel):
    def _create_model(self) -> SentenceTransformer:
        return SentenceTransformer(
            "FremyCompany/BioLORD-2023", trust_remote_code=True
        )

    @property
    def vector_dimension(self) -> int:
        return 768

    @property
    def name(self) -> str:
        return "BioLORD-2023"

    @property
    def batch_size(self) -> int:
        return 1024  # Smallest model - largest batch size allowed

    def embed_query(self, texts: List[str]) -> List[List[float]]:
        model = self._load_model()
        return model.encode(texts).tolist()

    def embed_document(self, texts: List[str]) -> List[List[float]]:
        model = self._load_model()
        return model.encode(texts).tolist()


class QwenEmbeddingModel(EmbeddingModel):
    def _create_model(self) -> SentenceTransformer:
        return SentenceTransformer(
            "Qwen/Qwen3-Embedding-0.6B", trust_remote_code=True
        )

    @property
    def vector_dimension(self) -> int:
        return 1024

    @property
    def name(self) -> str:
        return "Qwen3-Embedding-0.6B"

    @property
    def batch_size(self) -> int:
        return 128  # Large model - conservative batch size

    def embed_query(self, texts: List[str]) -> List[List[float]]:
        model = self._load_model()
        return model.encode(
            texts,
            prompt=(
                "Given a medical phenotype description, retrieve passages that accurately "
                "describe the phenotype."
            ),
        ).tolist()

    def embed_document(self, texts: List[str]) -> List[List[float]]:
        model = self._load_model()
        # No special prompt needed for documents
        return model.encode(texts).tolist()


class QwenEmbeddingModelLarge(EmbeddingModel):
    def _create_model(self) -> SentenceTransformer:
        return SentenceTransformer(
            "Qwen/Qwen3-Embedding-4B",
            tokenizer_kwargs={"padding_side": "left"},
        )

    @property
    def vector_dimension(self) -> int:
        return 2560

    @property
    def name(self) -> str:
        return "Qwen3-Embedding-4B"

    @property
    def batch_size(self) -> int:
        return 64  # Very large model - smallest batch size

    def embed_query(self, texts: List[str]) -> List[List[float]]:
        model = self._load_model()
        return model.encode(
            texts,
            prompt=(
                "Given a medical phenotype description, retrieve passages that accurately "
                "describe the phenotype."
            ),
        ).tolist()

    def embed_document(self, texts: List[str]) -> List[List[float]]:
        model = self._load_model()
        # No special prompt needed for documents
        return model.encode(texts).tolist()

import requests

class MedEmbedModel(EmbeddingModel):
    def _create_model(self) -> SentenceTransformer:
        return SentenceTransformer(
            "abhinand/MedEmbed-large-v0.1", trust_remote_code=True
        )

    @property
    def vector_dimension(self) -> int:
        return 1024

    @property
    def name(self) -> str:
        return "MedEmbed-large-v0.1"

    @property
    def batch_size(self) -> int:
        return 128  # Medium model - conservative batch size

    def embed_query(self, texts: List[str]) -> List[List[float]]:
        model = self._load_model()
        return model.encode(texts).tolist()

    def embed_document(self, texts: List[str]) -> List[List[float]]:
        model = self._load_model()
        return model.encode(texts).tolist()

class JinaV4MatchingRemoteEmbeddingModel(EmbeddingModel):
    def _create_model(self) -> SentenceTransformer:
        return SentenceTransformer(
        )

    @property
    def vector_dimension(self) -> int:
        return 2048

    @property
    def name(self) -> str:
        return "jina-embeddings-v4-matching"

    @property
    def batch_size(self) -> int:
        return 1024
    
    def _load_model(self):
        self._requests_client = requests.Session()


    def embed_query(self, texts: List[str]) -> List[List[float]]:
        try: 
            if self._requests_client is None:
                self._load_model()
        except Exception as e:
            self._load_model()

        #         curl -X POST "http://127.0.0.1:8080/v1/embeddings" \
        # -H "Content-Type: application/json" \
        # -d '{
        #     "input": [
        #     "Query: A beautiful sunset over the beach"
        #     ]
        # }'

        processed_texts = [
            f"Query: {text}" for text in texts
        ]
        payload = {
            "input": processed_texts
        }

        response = self._requests_client.post(
            "http://127.0.0.1:8080/v1/embeddings",
            headers={"Content-Type": "application/json"},
            json=payload
        )
        response.raise_for_status()

        # {"model":"gpt-3.5-turbo","object":"list","usage":{"prompt_tokens":41,"total_tokens":41},"data":[{"embedding":[0.011549580842256546],"index":0}]}
        response_data = response.json()
        if "data" in response_data and isinstance(response_data["data"], list):
            embeddings = [item["embedding"] for item in response_data["data"] if "embedding" in item]
            if embeddings:
                return embeddings
        return []

    def embed_document(self, texts: List[str]) -> List[List[float]]:
        try: 
            if self._requests_client is None:
                self._load_model()
        except Exception as e:
            self._load_model()
        #         curl -X POST "http://127.0.0.1:8080/v1/embeddings" \
        # -H "Content-Type: application/json" \
        # -d '{
        #     "input": [
        #     "Query: A beautiful sunset over the beach"
        #     ]
        # }'

        processed_texts = [
            f"Query: {text}" for text in texts
        ]
        payload = {
            "input": processed_texts
        }

        response = self._requests_client.post(
            "http://127.0.0.1:8080/v1/embeddings",
            headers={"Content-Type": "application/json"},
            json=payload
        )
        response.raise_for_status()

        # {"model":"gpt-3.5-turbo","object":"list","usage":{"prompt_tokens":41,"total_tokens":41},"data":[{"embedding":[0.011549580842256546],"index":0}]}
        response_data = response.json()
        if "data" in response_data and isinstance(response_data["data"], list):
            embeddings = [item["embedding"] for item in response_data["data"] if "embedding" in item]
            if embeddings:
                return embeddings
        return []

class JinaV4RetrievalRemoteEmbeddingModel(JinaV4MatchingRemoteEmbeddingModel):
    @property
    def name(self) -> str:
        return "jina-embeddings-v4-retrieval"
    
    def embed_document(self, texts: List[str]) -> List[List[float]]:
        try: 
            if self._requests_client is None:
                self._load_model()
        except Exception as e:
            self._load_model()

        #         curl -X POST "http://127.0.0.1:8080/v1/embeddings" \
        # -H "Content-Type: application/json" \
        # -d '{
        #     "input": [
        #     "Query: A beautiful sunset over the beach"
        #     ]
        # }'

        processed_texts = [
            f"Passage: {text}" for text in texts
        ]
        payload = {
            "input": processed_texts
        }

        response = self._requests_client.post(
            "http://127.0.0.1:8080/v1/embeddings",
            headers={"Content-Type": "application/json"},
            json=payload
        )
        response.raise_for_status()

        # {"model":"gpt-3.5-turbo","object":"list","usage":{"prompt_tokens":41,"total_tokens":41},"data":[{"embedding":[0.011549580842256546],"index":0}]}
        response_data = response.json()
        if "data" in response_data and isinstance(response_data["data"], list):
            embeddings = [item["embedding"] for item in response_data["data"] if "embedding" in item]
            if embeddings:
                return embeddings
        return []
        


def get_hpo_term_metadata(term):
    """Extract metadata from an HPO term."""
    return {
        "id": term.id,
        "name": term.name,
        "definition": term.definition or "",
        "synonyms": list(term.synonym) if term.synonym else [],
        "comments": list(term.comment) if term.comment else [],
        "num_parents": len(term.parents),
        "num_children": len(term.children),
    }


def analyze_memory_growth(snapshot1, snapshot2, model_name: str, batch_info: str):
    """Analyze memory growth between two snapshots and print top differences."""
    if snapshot1 is None or snapshot2 is None:
        return
        
    top_stats = snapshot2.compare_to(snapshot1, 'lineno')
    
    print(f"\n=== Memory Analysis for {model_name} - {batch_info} ===")
    total_diff = sum(stat.size_diff for stat in top_stats) / 1024 / 1024
    print(f"Total memory difference: {total_diff:.2f} MB")
    
    print("\nTop 10 memory increases:")
    for index, stat in enumerate(top_stats[:10]):
        if stat.size_diff > 0:
            print(f"{index+1:2d}. {stat.traceback.format()[-1].strip()}")
            print(f"    Size diff: +{stat.size_diff / 1024 / 1024:.2f} MB")
            print(f"    Count diff: +{stat.count_diff}")
    
    print(f"\nTop allocation locations for {model_name}:")
    top_current = snapshot2.statistics('lineno')[:5]
    for stat in top_current:
        print(f"  {stat.traceback.format()[-1].strip()}: {stat.size / 1024 / 1024:.2f} MB")
    print("-" * 80)


def create_collection_with_named_vectors(
    client: QdrantClient, models: List[EmbeddingModel]
):
    """Create a single Qdrant collection with named vectors for all models."""
    collection_name = f"hpo_{HPO_VERSION}"

    # Check if collection already exists
    collection_exists = False
    existing_vectors = set()
    try:
        existing_collection = client.get_collection(collection_name)
        collection_exists = True
        # Get existing vector names from the collection info
        existing_vectors = set()
        if hasattr(existing_collection.config, 'params') and hasattr(existing_collection.config.params, 'vectors'):
            vectors_obj = existing_collection.config.params.vectors
            if isinstance(vectors_obj, dict):
                existing_vectors = set(vectors_obj.keys())
            elif isinstance(vectors_obj, VectorParams):
                # Unnamed vector, treat as single unnamed vector
                existing_vectors = set()
        print(f"Collection '{collection_name}' already exists with "
              f"{existing_collection.points_count} points")
        print(f"Existing vectors: {existing_vectors}")
    except Exception:
        # Collection doesn't exist, create it
        pass

    # Create vectors config with named vectors for each model
    vectors_config = {}
    for model in models:
        vectors_config[model.name] = VectorParams(
            size=model.vector_dimension, distance=Distance.COSINE
        )

    # If collection exists and all vector names are present, return as usual
    if collection_exists and all(name in existing_vectors for name in vectors_config.keys()):
        print("No new models to add to the collection")
        return collection_name

    # If collection exists but is missing some vector names, migrate
    if collection_exists:
        print("Migrating to new collection with additional vector names...")
        temp_collection_name = collection_name + "_migrating"
        # Create new collection with all vectors
        client.create_collection(
            collection_name=temp_collection_name,
            vectors_config=vectors_config,
        )
        print(f"Created new collection '{temp_collection_name}' for migration")

        # Migrate all points from old collection to new collection
        offset = None
        while True:
            points, next_offset = client.scroll(
                collection_name=collection_name,
                limit=1024,
                offset=offset,
                with_vectors=True,
                with_payload=True,
            )
            if not points:
                break
            # For each point, copy all existing vectors and payload
            new_points = []
            for point in points:
                # Handle both dict (named vectors) and list (unnamed vector) cases
                vectors_to_copy = {}
                if isinstance(point.vector, dict):
                    for k, v in (point.vector or {}).items():
                        if k in existing_vectors:
                            vectors_to_copy[k] = to_vector_list(v)
                elif isinstance(point.vector, list):
                    # Only one unnamed vector, assign to the first vector name
                    if len(vectors_config) == 1:
                        only_name = next(iter(vectors_config.keys()))
                        vectors_to_copy = {only_name: to_vector_list(point.vector)}
                new_points.append(
                    PointStruct(
                        id=point.id,
                        vector=vectors_to_copy,
                        payload=point.payload,
                    )
                )
            if new_points:
                client.upsert(collection_name=temp_collection_name, points=new_points)
            if next_offset is None:
                break
            offset = next_offset
        print(f"Migration to '{temp_collection_name}' complete.")

        # Delete old collection
        client.delete_collection(collection_name=collection_name)
        print(f"Deleted old collection '{collection_name}'")

        # Recreate original collection with all vectors
        client.create_collection(
            collection_name=collection_name,
            vectors_config=vectors_config,
        )
        print(f"Recreated collection '{collection_name}' with all vector names.")

        # Migrate data back from temp collection to original name
        offset = None
        while True:
            points, next_offset = client.scroll(
                collection_name=temp_collection_name,
                limit=1024,
                offset=offset,
                with_vectors=True,
                with_payload=True,
            )
            if not points:
                break
            new_points = []
            for point in points:
                # Handle both dict (named vectors) and list (unnamed vector) cases
                vectors_to_copy = {}
                if isinstance(point.vector, dict):
                    for k, v in (point.vector or {}).items():
                        vectors_to_copy[k] = to_vector_list(v)
                elif isinstance(point.vector, list):
                    if len(vectors_config) == 1:
                        only_name = next(iter(vectors_config.keys()))
                        vectors_to_copy = {only_name: to_vector_list(point.vector)}
                new_points.append(
                    PointStruct(
                        id=point.id,
                        vector=vectors_to_copy,
                        payload=point.payload,
                    )
                )
            if new_points:
                client.upsert(collection_name=collection_name, points=new_points)
            if next_offset is None:
                break
            offset = next_offset
        print(f"Migration back to '{collection_name}' complete.")

        # Delete temp collection
        client.delete_collection(collection_name=temp_collection_name)
        print(f"Deleted temporary migration collection '{temp_collection_name}'")
        return collection_name

    # If collection does not exist, create it as usual
    client.create_collection(
        collection_name=collection_name,
        vectors_config=vectors_config,
    )
    print(f"Created new collection '{collection_name}'")
    return collection_name

def check_model_embeddings_exist(
    client: QdrantClient, collection_name: str, model_name: str
) -> bool:
    """Check if embeddings for a specific model already exist in the collection."""
    try:
        # Sample a few points to check if this model's vectors exist
        points, _ = client.scroll(
            collection_name=collection_name,
            limit=100,
            with_vectors=[model_name],
        )

        # Check if any points have this model's vectors
        for point in points:
            if hasattr(point, 'vector') and point.vector:
                if isinstance(point.vector, dict):
                    print(point.vector.keys())
                    if model_name in point.vector:
                        vector_data = point.vector[model_name]
                        if vector_data is not None:
                            return True
        return False
    except Exception:
        return False


def generate_embeddings_with_named_vectors(
    models: List[EmbeddingModel], batch_size: int | None = None
):
    """Generate embeddings for all models using a single collection with named vectors."""
    print("Generating embeddings using named vectors approach...")

    # Create single collection with named vectors for all models
    collection_name = create_collection_with_named_vectors(client, models)

    # Get all non-obsolete terms
    non_obsolete_terms = [term for term in ont if not term.is_obsolete]
    #non_obsolete_terms = non_obsolete_terms[:512]
    print(f"Found {len(non_obsolete_terms)} non-obsolete HPO terms")

    # Process each model
    for model_idx, model in enumerate(tqdm(models, desc="Processing models")):
        # Check if this model already has embeddings
        if check_model_embeddings_exist(client, collection_name, model.name):
            print(f"\nSkipping model {model_idx + 1}/{len(models)}: {model.name} "
                  f"(embeddings already exist)")
            continue
        else:
            print(f"\nModel does not have embeddings: {model.name}")
        
        # Use model's own batch size, with optional override
        current_batch_size = batch_size or model.batch_size
        print(
            f"\nProcessing model {model_idx + 1}/{len(models)}: {model.name} "
            f"(batch_size={current_batch_size})"
        )

        # Process in batches and insert immediately to save memory
        batch_range = list(range(0, len(non_obsolete_terms), current_batch_size))
        
        for batch_idx, i in enumerate(
            tqdm(batch_range, desc=f"Processing {model.name} batches", leave=False)
        ):
            batch_terms = non_obsolete_terms[i : i + current_batch_size]

            # Create passages for embedding
            passages = [hpo_to_passage(term) for term in batch_terms]

            # Generate embeddings
            embeddings = model.embed_document(passages)

            # Create points for Qdrant with named vectors
            new_points = []
            update_points = []
            
            for j, (term, embedding) in enumerate(zip(batch_terms, embeddings)):
                # term id to int
                point_id = int(term.id.split(":")[1])

                # Check if this point already exists (has metadata)
                try:
                    existing_point = client.retrieve(
                        collection_name=collection_name,
                        ids=[point_id],
                        with_payload=True
                    )
                    point_exists = len(existing_point) > 0
                except Exception:
                    point_exists = False

                if not point_exists:
                    # Create the full point with metadata for first time
                    metadata = get_hpo_term_metadata(term)
                    metadata["passage"] = passages[j]

                    new_points.append(
                        PointStruct(
                            id=point_id,
                            vector={model.name: embedding},
                            payload=metadata,
                        )
                    )
                else:
                    # Point exists, only add the named vector.
                    update_points.append(
                        PointStruct(
                            id=point_id,
                            vector={model.name: embedding}
                        )
                    )

            # Insert new points if any
            if new_points:
                client.upsert(collection_name=collection_name, points=new_points)
            
            # Update existing points if any
            if update_points:
                client.update_vectors(collection_name=collection_name, points=update_points)

            # Clear batch points to free memory
            del new_points
            del update_points
            del passages
            del embeddings
            gc.collect()


        # Clean up model from memory
        model.unload_model()

    print(
        f"Completed embedding generation for all models in collection: {collection_name}"
    )
    return collection_name

def main():
    """Main function to generate embeddings using named vectors approach."""
    models = [
        JinaEmbeddingModel(),
        JinaSTSEmbeddingModel(),
        NomicEmbeddingModel(),
        StellaEmbeddingModel(),
        BioLORDEmbeddingModel(),
        QwenEmbeddingModel(),
        MedEmbedModel(),
        JasperEmbeddingModel(),
        GeminiEmbeddingModel(),
        GeminiEmbeddingModelRetrieval(),
        JinaV4MatchingRemoteEmbeddingModel(),
        JinaV4RetrievalRemoteEmbeddingModel(),
    ]

    collection_name = generate_embeddings_with_named_vectors(models)
    print(f"Successfully created collection with named vectors: {collection_name}")


if __name__ == "__main__":
    lock_file = os.path.join(QDRANT_PATH, ".lock")
    if os.path.exists(lock_file):
        os.remove(lock_file)

    client = QdrantClient(path=QDRANT_PATH)

    try:
        main()
    except KeyboardInterrupt:
        print("\nProcess interrupted by user.")
    finally:
        print("Cleaning up resources...")
        client.close()
        print("Done.")
