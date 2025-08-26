#!/usr/bin/env python3
"""
Evaluate the quality of HPO embeddings using the gold corpus data.

This script:
1. Fetches gold corpus data from the backend API
2. Extracts PhenotypeMatch instances with match_text and correct HPO IDs
3. Queries the embeddings database for each match_text
4. Evaluates how well the embeddings rank the correct HPO ID
"""

import gc
import json
import statistics
from dataclasses import asdict, dataclass
from typing import List, Optional, Tuple
from itertools import combinations

import requests
import torch
from qdrant_client import QdrantClient
from sentence_transformers import SentenceTransformer
from tqdm import tqdm
import numpy as np
import math
from datetime import datetime

# Configuration
BACKEND_URL = "http://localhost:8000"  # Backend API URL
QDRANT_PATH = "./hpo_vector_db"
HPO_VERSION = "2024-04-19"
COLLECTION_NAME = f"hpo_{HPO_VERSION}"

# Models to evaluate
MODELS_TO_EVALUATE = [
    "jina-embeddings-v3_retrieval",
    "jina-embeddings-v3_text-matching",
    "nomic-embed-text-v1.5",
    "stella_en_1.5B_v5",
    "BioLORD-2023",
    "Qwen3-Embedding-0.6B",
    "MedEmbed-large-v0.1",
]

@dataclass
class EvaluationMetrics:
    """Enhanced metrics for evaluating embedding quality."""
    model_name: str
    total_queries: int
    top_1_hits: int
    top_5_hits: int
    top_10_hits: int
    top_20_hits: int
    mean_rank: float
    median_rank: float
    mean_reciprocal_rank: float
    failed_queries: int
    # New advanced metrics
    precision_at_5: float = 0.0
    precision_at_10: float = 0.0
    ndcg_at_10: float = 0.0  # Normalised Discounted Cumulative Gain
    hit_rate: float = 0.0  # Percentage of queries with at least one correct result in top-k
    average_precision: float = 0.0  # Mean Average Precision
    
    @property
    def top_1_accuracy(self) -> float:
        return self.top_1_hits / max(1, self.total_queries) if self.total_queries > 0 else 0.0
    
    @property 
    def top_5_accuracy(self) -> float:
        return self.top_5_hits / max(1, self.total_queries) if self.total_queries > 0 else 0.0
    
    @property
    def top_10_accuracy(self) -> float:
        return self.top_10_hits / max(1, self.total_queries) if self.total_queries > 0 else 0.0
    
    @property
    def top_20_accuracy(self) -> float:
        return self.top_20_hits / max(1, self.total_queries) if self.total_queries > 0 else 0.0
    
@dataclass
class QueryResult:
    """Enhanced result of a single query evaluation."""
    match_text: str
    correct_hpo_id: str
    found_rank: Optional[int]
    top_results: List[Tuple[str, str, float]]  # (hpo_id, hpo_name, score)
    query_type: str = "standard"  # standard, instructed, rephrased
    instruction_prompt: Optional[str] = None
    original_query: Optional[str] = None  # For rephrased queries


@dataclass
class SampleCases:
    """Collection of sample evaluation cases for analysis."""
    excellent_cases: List[QueryResult]  # Rank 1
    good_cases: List[QueryResult]  # Rank 2-5
    fair_cases: List[QueryResult]  # Rank 6-20
    poor_cases: List[QueryResult]  # Rank 21-100
    failed_cases: List[QueryResult]  # Not found in top 100
    
    def add_result(self, result: QueryResult):
        """Categorise and add a query result to appropriate sample list."""
        if result.found_rank is None:
            self.failed_cases.append(result)
        elif result.found_rank == 1:
            self.excellent_cases.append(result)
        elif result.found_rank <= 5:
            self.good_cases.append(result)
        elif result.found_rank <= 20:
            self.fair_cases.append(result)
        else:
            self.poor_cases.append(result)


# Qwen instruction prompts for evaluation
QWEN_INSTRUCTION_PROMPTS = [
    None,  # Standard embedding without instruction
    # "Represent this medical phenotype for retrieval:",
    # "Generate an embedding for this clinical finding:",
    # "Encode this symptom description for medical search:",
    # "Create a vector representation of this phenotype:",
    # "Transform this medical text into a searchable embedding:",
]

# Query rephrasing templates
QUERY_REPHRASE_TEMPLATES = [
    "{match_text}",  # Original
    "Which phenotype is {match_text}?",
    # "What medical condition presents as {match_text}?",
    # "Identify the phenotype: {match_text}",
    # "Clinical finding of {match_text}",
    "Medical term for {match_text}",
    # "Phenotype characterised by {match_text}",
]


class EmbeddingModel:
    """Enhanced wrapper for embedding models with instruction and rephrasing support."""
    
    def __init__(self, model_name: str):
        self.model_name = model_name
        self._model = None
    
    def _load_model(self) -> SentenceTransformer:
        """Load the appropriate model based on name."""
        if self._model is not None:
            return self._model
            
        print(f"Loading model: {self.model_name}")
        
        if self.model_name == "jina-embeddings-v3_retrieval":
            self._model = SentenceTransformer(
                "jinaai/jina-embeddings-v3", trust_remote_code=True
            )
        elif self.model_name == "jina-embeddings-v3_text-matching":
            self._model = SentenceTransformer(
                "jinaai/jina-embeddings-v3", trust_remote_code=True
            )
        elif self.model_name == "nomic-embed-text-v1.5":
            self._model = SentenceTransformer(
                "nomic-ai/nomic-embed-text-v1.5", trust_remote_code=True
            )
        elif self.model_name == "stella_en_1.5B_v5":
            self._model = SentenceTransformer(
                "NovaSearch/stella_en_1.5B_v5", trust_remote_code=True
            )
        elif self.model_name == "BioLORD-2023":
            self._model = SentenceTransformer(
                "FremyCompany/BioLORD-2023", trust_remote_code=True
            )
        elif self.model_name == "Qwen3-Embedding-0.6B":
            self._model = SentenceTransformer(
                "Qwen/Qwen3-Embedding-0.6B", trust_remote_code=True
            )
        elif self.model_name == "MedEmbed-large-v0.1":
            self._model = SentenceTransformer(
                "abhinand/MedEmbed-large-v0.1", trust_remote_code=True
            )
        else:
            raise ValueError(f"Unknown model: {self.model_name}")
        
        return self._model
    
    def encode(self, texts, instruction_prompt=None, task=None, **kwargs):
        """
        Enhanced encode method supporting instructions and task types.
        
        Args:
            texts: Text(s) to encode
            instruction_prompt: Optional instruction for Qwen models
            task: Task type for jina models ('retrieval' or 'text-matching')
            **kwargs: Additional arguments passed to the model
        """
        model = self._load_model()
        
        # Handle Qwen instruction prompts
        if self.model_name == "Qwen3-Embedding-0.6B":
            if instruction_prompt:
                kwargs["prompt"] = instruction_prompt
            else:
                kwargs["prompt_name"] = "query"
        
        # Handle jina task types
        if self.model_name.startswith("jina-embeddings-v3"):
            if task == "retrieval":
                kwargs["task"] = "retrieval.query" if "query" in str(texts).lower() else "retrieval.passage"
            elif task == "text-matching":
                kwargs["task"] = "text-matching"
            else:
                # Default task based on model name
                if "retrieval" in self.model_name:
                    kwargs["task"] = "retrieval.query"
                elif "text-matching" in self.model_name:
                    kwargs["task"] = "text-matching"
        
        return model.encode(texts, **kwargs)
    
    def encode_batch(self, texts_list, instruction_prompt=None, task=None, **kwargs):
        """Batch encoding with instruction and task support."""
        return self.encode(texts_list, instruction_prompt=instruction_prompt, task=task, **kwargs)
    
    def unload_model(self):
        """Unload the model to free memory."""
        if self._model is not None:
            del self._model
            self._model = None
            
            # Force garbage collection and clear GPU cache
            gc.collect()
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            if torch.backends.mps.is_available():
                torch.mps.empty_cache()
            
            # Force garbage collection
            gc.collect()
            
            # Clear GPU caches if available
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            if torch.backends.mps.is_available():
                torch.mps.empty_cache()
    
    def embed_query(self, texts: List[str]) -> List[List[float]]:
        """Embed query texts using the appropriate method for each model."""
        model = self._load_model()
        
        if self.model_name == "jina-embeddings-v3_retrieval":
            return model.encode(texts, task="retrieval.query").tolist()
        elif self.model_name == "jina-embeddings-v3_text-matching":
            return model.encode(texts, task="text-matching").tolist()
        elif self.model_name == "nomic-embed-text-v1.5":
            return model.encode([f"search_query: {text}" for text in texts]).tolist()
        elif self.model_name == "stella_en_1.5B_v5":
            return model.encode(texts, prompt_name="s2p_query").tolist()
        elif self.model_name == "Qwen3-Embedding-0.6B":
            return model.encode(
                texts,
                prompt_name="query",
            ).tolist()
        else:
            # For BioLORD and MedEmbed, no special query processing
            return model.encode(texts).tolist()


def calculate_advanced_metrics(query_results: List[QueryResult]) -> dict:
    """Calculate advanced evaluation metrics from query results."""
    if not query_results:
        return {
            "precision_at_5": 0.0,
            "precision_at_10": 0.0,
            "ndcg_at_10": 0.0,
            "hit_rate": 0.0,
            "average_precision": 0.0
        }
    
    precision_5_scores = []
    precision_10_scores = []
    ndcg_10_scores = []
    hit_scores = []
    ap_scores = []
    
    for result in query_results:
        if result.found_rank is None:
            # Query failed
            precision_5_scores.append(0.0)
            precision_10_scores.append(0.0)
            ndcg_10_scores.append(0.0)
            hit_scores.append(0.0)
            ap_scores.append(0.0)
        else:
            # Precision at K
            precision_5_scores.append(1.0 if result.found_rank <= 5 else 0.0)
            precision_10_scores.append(1.0 if result.found_rank <= 10 else 0.0)
            
            # NDCG at 10 (simplified for single correct answer)
            if result.found_rank <= 10:
                ndcg_10_scores.append(1.0 / math.log2(result.found_rank + 1))
            else:
                ndcg_10_scores.append(0.0)
            
            # Hit rate (found in any position)
            hit_scores.append(1.0)
            
            # Average Precision (simplified for single correct answer)
            ap_scores.append(1.0 / result.found_rank)
    
    return {
        "precision_at_5": sum(precision_5_scores) / len(precision_5_scores),
        "precision_at_10": sum(precision_10_scores) / len(precision_10_scores),
        "ndcg_at_10": sum(ndcg_10_scores) / len(ndcg_10_scores),
        "hit_rate": sum(hit_scores) / len(hit_scores),
        "average_precision": sum(ap_scores) / len(ap_scores)
    }


def generate_query_variants(match_text: str, templates: List[str]) -> List[Tuple[str, str]]:
    """Generate query variants using different templates."""
    variants = []
    for template in templates:
        try:
            variant = template.format(match_text=match_text)
            template_name = template.replace("{match_text}", "X")
            variants.append((variant, template_name))
        except (KeyError, ValueError):
            # Skip invalid templates
            continue
    return variants


def get_optimal_batch_size(model_name: str) -> int:
    """Get optimal batch size based on model size and available memory."""
    # Conservative batch sizes for 32GB RAM - same as generate_embeddings.py
    model_batch_sizes = {
        "BioLORD-2023": 1024,  # Smallest model
        "nomic-embed-text-v1.5": 512,  # Small model
        "jina-embeddings-v3_text-matching": 256 + 64,  # Medium model
        "jina-embeddings-v3_retrieval": 256 + 64,  # Medium model
        "MedEmbed-large-v0.1": 128,  # Medium model
        "Qwen3-Embedding-0.6B": 128,  # Large model
        "stella_en_1.5B_v5": 64,  # Largest model
    }
    return model_batch_sizes.get(model_name, 128)  # Default fallback


def fetch_gold_corpus_data() -> List[Tuple[str, str]]:
    """
    Fetch all PhenotypeMatch data from the gold corpus via the backend API.
    Returns a list of (match_text, correct_hpo_id) tuples.
    """
    print("Fetching gold corpus data from backend API...")
    
    # First, get the available corpora to check if gold_corpus exists
    response = requests.get(f"{BACKEND_URL}/corpora/")
    response.raise_for_status()
    corpora = response.json()
    
    # Find gold_corpus
    gold_corpus = None
    for corpus in corpora:
        if corpus["name"] == "gold_corpus":
            gold_corpus = corpus
            break
    
    if not gold_corpus:
        raise ValueError("gold_corpus not found in available corpora")
    
    print(f"Found gold_corpus (version: {gold_corpus.get('corpus_version', 'unknown')}) "
          f"with {gold_corpus.get('document_count', 'unknown')} documents")
    
    # Fetch all documents from the gold corpus using pagination
    phenotype_matches = []
    skip = 0
    limit = 100  # Process in batches
    
    while True:
        print(f"Fetching documents {skip} to {skip + limit}...")
        response = requests.get(
            f"{BACKEND_URL}/corpora/gold_corpus/latest/documents",
            params={"skip": skip, "limit": limit}
        )
        response.raise_for_status()
        data = response.json()
        
        documents = data["documents"]
        if not documents:
            break
        
        # Extract PhenotypeMatch instances from each document
        for doc in documents:
            doc_name = doc.get("name", "unknown")
            
            # The output field contains the ToolOutput with results
            if "output" not in doc:
                print(f"Warning: Document '{doc_name}' has no output field")
                continue
                
            output = doc["output"]
            if "results" not in output:
                print(f"Warning: Document '{doc_name}' output has no results field")
                continue
            
            # results is a list of lists of PhenotypeMatch objects
            results = output["results"]
            
            for sentence_idx, sentence_matches in enumerate(results):
                for match_idx, match in enumerate(sentence_matches):
                    # Each match should be a PhenotypeMatch dict
                    match_text = match.get("match_text", "").strip()
                    hpo_id = match.get("id", "").strip()
                    
                    if match_text and hpo_id and hpo_id.startswith("HP:"):
                        phenotype_matches.append((match_text, hpo_id))
                    elif match_text or hpo_id:
                        # Log cases where we have partial data
                        print(f"Warning: Incomplete match in {doc_name} "
                              f"sentence {sentence_idx} match {match_idx}: "
                              f"text='{match_text}' id='{hpo_id}'")
        
        skip += limit
        if not data["has_more"]:
            break
    
    print(f"Extracted {len(phenotype_matches)} phenotype matches from gold corpus")
    return phenotype_matches


def search_embeddings(
    client: QdrantClient,
    model_name: str,
    query_text: str,
    embedding_model: EmbeddingModel,
    top_k: int = 50
) -> List[Tuple[str, str, float]]:
    """
    Search for similar HPO terms using embeddings.
    Returns list of (hpo_id, hpo_name, score) tuples.
    """
    try:
        # Generate query embedding
        query_embedding = embedding_model.embed_query([query_text])[0]
        
        # Query the vector database using query_points
        search_results = client.query_points(
            collection_name=COLLECTION_NAME,
            query=query_embedding,
            using=model_name,
            limit=top_k,
            with_payload=True
        )
        
        results = []
        for result in search_results.points:
            payload = result.payload or {}
            hpo_id = payload.get("id", "")
            hpo_name = payload.get("name", "")
            score = result.score
            results.append((hpo_id, hpo_name, score))
        
        return results
        
    except Exception as e:
        print(f"Error searching for '{query_text}': {e}")
        return []


def process_query_batch_enhanced(
    client: QdrantClient,
    model_name: str,
    embedding_model: EmbeddingModel,
    batch_queries: List[Tuple[str, str]],
    instruction_prompt: Optional[str] = None,
    query_type: str = "standard",
    sample_cases: Optional[SampleCases] = None
) -> Tuple[List[int], List[float], int, int, int, int, int, List[QueryResult]]:
    """
    Enhanced batch processing with instruction prompts and sample case collection.
    """
    ranks = []
    reciprocal_ranks = []
    top_1_hits = 0
    top_5_hits = 0
    top_10_hits = 0
    top_20_hits = 0
    failed_queries = 0
    query_results = []
    
    # Extract query texts and use the optimal batch size for this model
    query_texts = [match_text for match_text, _ in batch_queries]
    embed_batch_size = get_optimal_batch_size(model_name)
    
    # Process embeddings in sub-batches to optimise encoding
    all_embeddings = []
    for i in range(0, len(query_texts), embed_batch_size):
        batch_texts = query_texts[i:i + embed_batch_size]
        try:
            if instruction_prompt and model_name == "Qwen3-Embedding-0.6B":
                batch_embeddings = embedding_model.encode(
                    batch_texts,
                    instruction_prompt=instruction_prompt,
                    convert_to_tensor=False,
                    normalise_embeddings=True
                )
            else:
                batch_embeddings = embedding_model.encode(
                    batch_texts,
                    convert_to_tensor=False,
                    normalise_embeddings=True
                )
            all_embeddings.extend(batch_embeddings)
        except Exception as e:
            print(f"Error encoding batch {i//embed_batch_size}: {e}")
            # Add dummy embeddings for failed batch
            dummy_embedding = np.zeros(768)
            all_embeddings.extend([dummy_embedding for _ in batch_texts])
    
    # Now process each query with its pre-computed embedding
    for i, (match_text, correct_hpo_id) in enumerate(batch_queries):
        try:
            query_embedding = all_embeddings[i]
            
            # Search the vector database using pre-computed embedding
            search_results = client.query_points(
                collection_name=COLLECTION_NAME,
                query=query_embedding,
                using=model_name,
                limit=100,
                with_payload=True
            )
            
            if not search_results.points:
                failed_queries += 1
                continue
            
            # Find the rank of the correct HPO ID and collect top results
            found_rank = None
            top_results = []
            
            for rank, result in enumerate(search_results.points, 1):
                payload = result.payload or {}
                hpo_id = payload.get("id", "")
                hpo_name = payload.get("name", "")
                score = result.score
                
                if rank <= 20:  # Store top 20 for analysis
                    top_results.append((hpo_id, hpo_name, score))
                
                if hpo_id == correct_hpo_id:
                    found_rank = rank
                    break
            
            # Create query result
            query_result = QueryResult(
                match_text=match_text,
                correct_hpo_id=correct_hpo_id,
                found_rank=found_rank,
                top_results=top_results,
                query_type=query_type,
                instruction_prompt=instruction_prompt
            )
            query_results.append(query_result)
            
            # Add to sample cases if provided
            if sample_cases:
                sample_cases.add_result(query_result)
            
            if found_rank is not None:
                ranks.append(found_rank)
                reciprocal_ranks.append(1.0 / found_rank)
                
                if found_rank == 1:
                    top_1_hits += 1
                if found_rank <= 5:
                    top_5_hits += 1
                if found_rank <= 10:
                    top_10_hits += 1
                if found_rank <= 20:
                    top_20_hits += 1
            else:
                failed_queries += 1
                
        except Exception as e:
            print(f"Error processing query '{match_text}': {e}")
            failed_queries += 1
            
            # Create failed query result
            query_result = QueryResult(
                match_text=match_text,
                correct_hpo_id=correct_hpo_id,
                found_rank=None,
                top_results=[],
                query_type=query_type,
                instruction_prompt=instruction_prompt
            )
            query_results.append(query_result)
            
            if sample_cases:
                sample_cases.add_result(query_result)
    
    return (ranks, reciprocal_ranks, top_1_hits, top_5_hits, 
            top_10_hits, top_20_hits, failed_queries, query_results)


def process_query_batch(
    client: QdrantClient,
    model_name: str,
    embedding_model: EmbeddingModel,
    batch_queries: List[Tuple[str, str]],
) -> Tuple[List[int], List[float], int, int, int, int, int, int]:
    """
    Process a batch of queries and return enhanced metrics.
    Returns: ranks, reciprocal_ranks, top_1_hits, top_5_hits, top_10_hits, 
             top_20_hits, failed_queries, total_processed
    """
    ranks = []
    reciprocal_ranks = []
    top_1_hits = 0
    top_5_hits = 0
    top_10_hits = 0
    top_20_hits = 0
    failed_queries = 0
    
    # Extract query texts and use the optimal batch size for this model
    query_texts = [match_text for match_text, _ in batch_queries]
    embed_batch_size = get_optimal_batch_size(model_name)
    
    # Process embeddings in sub-batches to optimise encoding
    all_embeddings = []
    for i in range(0, len(query_texts), embed_batch_size):
        batch_texts = query_texts[i:i + embed_batch_size]
        try:
            batch_embeddings = embedding_model.encode(
                batch_texts,
                convert_to_tensor=False,
                normalise_embeddings=True
            )
            all_embeddings.extend(batch_embeddings)
        except Exception as e:
            print(f"Error encoding batch {i//embed_batch_size}: {e}")
            # Add dummy embeddings for failed batch
            dummy_embedding = np.zeros(768)
            all_embeddings.extend([dummy_embedding for _ in batch_texts])
    
    # Now process each query with its pre-computed embedding
    for i, (match_text, correct_hpo_id) in enumerate(batch_queries):
        try:
            query_embedding = all_embeddings[i]
            
            # Search the vector database using pre-computed embedding
            search_results = client.query_points(
                collection_name=COLLECTION_NAME,
                query=query_embedding,
                using=model_name,
                limit=20,
                with_payload=True
            )
            
            if not search_results.points:
                failed_queries += 1
                continue
            
            # Find the rank of the correct HPO ID
            found_rank = None
            for rank, result in enumerate(search_results.points, 1):
                payload = result.payload or {}
                hpo_id = payload.get("id", "")
                if hpo_id == correct_hpo_id:
                    found_rank = rank
                    break
            
            if found_rank is not None:
                ranks.append(found_rank)
                reciprocal_ranks.append(1.0 / found_rank)
                
                if found_rank == 1:
                    top_1_hits += 1
                if found_rank <= 5:
                    top_5_hits += 1
                if found_rank <= 10:
                    top_10_hits += 1
                if found_rank <= 20:
                    top_20_hits += 1
            else:
                # Not found in top 20
                failed_queries += 1
                
        except Exception as e:
            print(f"Error processing query '{match_text}': {e}")
            failed_queries += 1
    
    return (ranks, reciprocal_ranks, top_1_hits, top_5_hits, 
            top_10_hits, top_20_hits, failed_queries, len(batch_queries))


@dataclass
class CrossModelQueryResult:
    """Results for a single query across all models."""
    match_text: str
    correct_hpo_id: str
    ranks: dict[str, Optional[int]]  # model_name -> rank
    scores: dict[str, Optional[float]] # model_name -> score
    top_results: dict[str, List[Tuple[str, str, float]]] # model_name -> top results


def analyse_cross_model_performance(
    all_model_results: dict[str, List[QueryResult]],
    phenotype_matches: List[Tuple[str, str]]
) -> List[CrossModelQueryResult]:
    """Analyse query performance across all evaluated models."""
    cross_model_results = []
    
    # Create a map from (match_text, hpo_id) to query results for each model
    results_map = {}
    for model_name, query_results in all_model_results.items():
        for qr in query_results:
            key = (qr.match_text, qr.correct_hpo_id)
            if key not in results_map:
                results_map[key] = {}
            results_map[key][model_name] = qr
            
    for match_text, correct_hpo_id in phenotype_matches:
        key = (match_text, correct_hpo_id)
        model_data = results_map.get(key, {})
        
        ranks = {model: data.found_rank for model, data in model_data.items()}
        scores = {}
        top_results = {model: data.top_results for model, data in model_data.items()}

        # Extract score for the correct HPO ID if found
        for model, data in model_data.items():
            if data.found_rank is not None:
                # Find the score from top_results
                found_score = None
                for hpo_id, _, score in data.top_results:
                    if hpo_id == correct_hpo_id:
                        found_score = score
                        break
                scores[model] = found_score
            else:
                scores[model] = None

        cross_model_results.append(CrossModelQueryResult(
            match_text=match_text,
            correct_hpo_id=correct_hpo_id,
            ranks=ranks,
            scores=scores,
            top_results=top_results
        ))
        
    return cross_model_results


@dataclass
class CombinationResult:
    """Results for a model combination evaluation."""
    models: List[str]
    combination_name: str
    total_queries: int
    top_k_hits: int
    top_k_accuracy: float
    mean_rank: float
    median_rank: float
    mean_reciprocal_rank: float
    failed_queries: int
    sample_queries: List[dict]  # Sample results for analysis


def combine_model_results(
    model_results: dict[str, List[QueryResult]],
    models_to_combine: List[str],
    top_k_total: int = 6,
    score_aggregation: str = "weighted_sum"
) -> List[QueryResult]:
    """
    Combine results from multiple models for each query.
    
    Args:
        model_results: Dictionary mapping model names to their query results
        models_to_combine: List of model names to combine
        top_k_total: Total number of results to return (e.g., 6)
        score_aggregation: Method to combine scores ("weighted_sum", "max", "mean")
    
    Returns:
        List of combined query results
    """
    combined_results = []
    
    # Get all unique queries (assuming all models have the same queries)
    all_queries = {}
    for model_name in models_to_combine:
        if model_name in model_results:
            for qr in model_results[model_name]:
                key = (qr.match_text, qr.correct_hpo_id)
                if key not in all_queries:
                    all_queries[key] = qr.match_text, qr.correct_hpo_id
    
    # Calculate how many results to take from each model
    results_per_model = top_k_total // len(models_to_combine)
    remaining_slots = top_k_total % len(models_to_combine)
    
    for (match_text, correct_hpo_id) in all_queries.values():
        # Collect all results for this query from all models
        all_model_results = {}
        
        for model_name in models_to_combine:
            if model_name in model_results:
                for qr in model_results[model_name]:
                    if qr.match_text == match_text and qr.correct_hpo_id == correct_hpo_id:
                        all_model_results[model_name] = qr
                        break
        
        # Skip if we don't have results from all models
        if len(all_model_results) != len(models_to_combine):
            continue
        
        # Combine the top results from each model
        combined_top_results = []
        hpo_id_scores = {}  # Track best score for each HPO ID
        
        for i, model_name in enumerate(models_to_combine):
            qr = all_model_results[model_name]
            
            # Determine how many results to take from this model
            take_count = results_per_model
            if i < remaining_slots:
                take_count += 1
            
            # Take top results from this model
            for j, (hpo_id, hpo_name, score) in enumerate(qr.top_results[:take_count]):
                if hpo_id not in hpo_id_scores:
                    hpo_id_scores[hpo_id] = []
                
                # Store score with model weight (could be model-specific)
                model_weight = 1.0  # Equal weights for now
                hpo_id_scores[hpo_id].append((score, model_weight, model_name))
        
        # Aggregate scores for each HPO ID
        final_scores = {}
        for hpo_id, score_data in hpo_id_scores.items():
            if score_aggregation == "weighted_sum":
                final_score = sum(score * weight for score, weight, _ in score_data)
            elif score_aggregation == "max":
                final_score = max(score for score, _, _ in score_data)
            elif score_aggregation == "mean":
                final_score = sum(score for score, _, _ in score_data) / len(score_data)
            else:
                final_score = sum(score * weight for score, weight, _ in score_data)
            
            final_scores[hpo_id] = final_score
        
        # Sort by combined score and create final top results
        sorted_results = sorted(final_scores.items(), key=lambda x: x[1], reverse=True)
        
        # Get HPO names from the first model's results
        hpo_names = {}
        for model_name in models_to_combine:
            qr = all_model_results[model_name]
            for hpo_id, hpo_name, _ in qr.top_results:
                if hpo_id not in hpo_names:
                    hpo_names[hpo_id] = hpo_name
        
        # Create combined top results
        combined_top_results = []
        for hpo_id, final_score in sorted_results[:top_k_total]:
            hpo_name = hpo_names.get(hpo_id, "Unknown")
            combined_top_results.append((hpo_id, hpo_name, final_score))
        
        # Find rank of correct answer in combined results
        found_rank = None
        for rank, (hpo_id, _, _) in enumerate(combined_top_results, 1):
            if hpo_id == correct_hpo_id:
                found_rank = rank
                break
        
        # Create combined query result
        combined_qr = QueryResult(
            match_text=match_text,
            correct_hpo_id=correct_hpo_id,
            found_rank=found_rank,
            top_results=combined_top_results,
            query_type="combination",
            instruction_prompt=None,
            original_query=None
        )
        
        combined_results.append(combined_qr)
    
    return combined_results


def evaluate_model_combinations(
    all_model_results: dict[str, List[QueryResult]],
    top_k_total: int = 6,
    max_combination_size: int = 4
) -> List[CombinationResult]:
    """
    Evaluate all possible combinations of models up to max_combination_size.
    
    Args:
        all_model_results: Dictionary mapping model names to their query results
        top_k_total: Total top-k to evaluate (e.g., 6)
        max_combination_size: Maximum number of models to combine
    
    Returns:
        List of combination results sorted by performance
    """
    
    available_models = list(all_model_results.keys())
    print(f"\nEvaluating model combinations for top-{top_k_total}")
    print(f"Available models: {len(available_models)}")
    print(f"Maximum combination size: {max_combination_size}")
    
    combination_results = []
    
    # Test combinations of different sizes
    for combination_size in range(1, min(max_combination_size + 1, len(available_models) + 1)):
        print(f"\nTesting combinations of {combination_size} model(s)...")
        
        for model_combo in combinations(available_models, combination_size):
            print(f"  Evaluating: {' + '.join(model_combo)}")
            
            # Combine results from these models
            combined_results = combine_model_results(
                all_model_results,
                list(model_combo),
                top_k_total=top_k_total
            )
            
            if not combined_results:
                continue
            
            # Calculate metrics for this combination
            total_queries = len(combined_results)
            top_k_hits = 0
            ranks = []
            reciprocal_ranks = []
            failed_queries = 0
            sample_queries = []
            
            for qr in combined_results:
                if qr.found_rank is not None:
                    ranks.append(qr.found_rank)
                    reciprocal_ranks.append(1.0 / qr.found_rank)
                    
                    if qr.found_rank <= top_k_total:
                        top_k_hits += 1
                    
                    # Collect samples for analysis
                    if len(sample_queries) < 5:
                        sample_queries.append({
                            "match_text": qr.match_text,
                            "correct_hpo_id": qr.correct_hpo_id,
                            "found_rank": qr.found_rank,
                            "top_results": qr.top_results[:3]  # Top 3 for brevity
                        })
                else:
                    failed_queries += 1
            
            successful_queries = total_queries - failed_queries
            top_k_accuracy = top_k_hits / max(1, successful_queries) if successful_queries > 0 else 0.0
            mean_rank = statistics.mean(ranks) if ranks else float('inf')
            median_rank = statistics.median(ranks) if ranks else float('inf')
            mean_reciprocal_rank = statistics.mean(reciprocal_ranks) if reciprocal_ranks else 0.0
            
            # Create combination result
            combination_name = " + ".join(model_combo)
            if combination_size > 1:
                results_per_model = top_k_total // combination_size
                remainder = top_k_total % combination_size
                combination_name += f" (top-{results_per_model}"
                if remainder > 0:
                    combination_name += f"+{remainder}"
                combination_name += " each)"
            else:
                combination_name += f" (top-{top_k_total})"
            
            combo_result = CombinationResult(
                models=list(model_combo),
                combination_name=combination_name,
                total_queries=successful_queries,
                top_k_hits=top_k_hits,
                top_k_accuracy=top_k_accuracy,
                mean_rank=mean_rank,
                median_rank=median_rank,
                mean_reciprocal_rank=mean_reciprocal_rank,
                failed_queries=failed_queries,
                sample_queries=sample_queries
            )
            
            combination_results.append(combo_result)
    
    # Sort by top-k accuracy
    combination_results.sort(key=lambda x: x.top_k_accuracy, reverse=True)
    
    return combination_results


def print_combination_results(
    combination_results: List[CombinationResult],
    top_k_total: int = 6,
    show_top_n: int = 15
):
    """Print formatted combination evaluation results."""
    print(f"\n{'='*100}")
    print(f"MODEL COMBINATION EVALUATION RESULTS (TOP-{top_k_total})")
    print(f"{'='*100}")
    
    if not combination_results:
        print("No combination results to display.")
        return
    
    # Print header
    print(f"{'Rank':<4} {'Combination':<50} {'Accuracy':<10} {'MRR':<8} {'Mean Rank':<12} {'Queries':<8}")
    print("-" * 100)
    
    # Show top combinations
    for i, result in enumerate(combination_results[:show_top_n], 1):
        print(f"{i:<4} {result.combination_name:<50} "
              f"{result.top_k_accuracy:.3f}      "
              f"{result.mean_reciprocal_rank:.3f}    "
              f"{result.mean_rank:.1f}          "
              f"{result.total_queries}")
    
    if len(combination_results) > show_top_n:
        print(f"... and {len(combination_results) - show_top_n} more combinations")
    
    # Detailed analysis of top performers
    print(f"\n{'='*80}")
    print("DETAILED ANALYSIS OF TOP COMBINATIONS")
    print(f"{'='*80}")
    
    for i, result in enumerate(combination_results[:5], 1):
        print(f"\n{i}. {result.combination_name}")
        print(f"   Models: {', '.join(result.models)}")
        print(f"   Top-{top_k_total} Accuracy: {result.top_k_accuracy:.3f} "
              f"({result.top_k_hits}/{result.total_queries})")
        print(f"   Mean Rank: {result.mean_rank:.1f}")
        print(f"   Median Rank: {result.median_rank:.1f}")
        print(f"   Mean Reciprocal Rank: {result.mean_reciprocal_rank:.3f}")
        print(f"   Failed Queries: {result.failed_queries}")
        
        # Show sample successful queries
        if result.sample_queries:
            print("   Sample Results:")
            for j, sample in enumerate(result.sample_queries[:3], 1):
                print(f"     {j}. Query: '{sample['match_text']}'")
                print(f"        Correct: {sample['correct_hpo_id']} (Rank: {sample['found_rank']})")
                print(f"        Top results: {[f'{hpo_id} ({score:.3f})' for hpo_id, _, score in sample['top_results'][:2]]}")
    
    # Analysis by combination size
    print(f"\n{'='*80}")
    print("PERFORMANCE BY COMBINATION SIZE")
    print(f"{'='*80}")
    
    size_groups = {}
    for result in combination_results:
        size = len(result.models)
        if size not in size_groups:
            size_groups[size] = []
        size_groups[size].append(result)
    
    for size in sorted(size_groups.keys()):
        results = size_groups[size]
        best_accuracy = max(r.top_k_accuracy for r in results)
        avg_accuracy = sum(r.top_k_accuracy for r in results) / len(results)
        
        print(f"\nCombinations of {size} model(s): {len(results)} tested")
        print(f"  Best accuracy: {best_accuracy:.3f}")
        print(f"  Average accuracy: {avg_accuracy:.3f}")
        
        # Show best combination for this size
        best_combo = max(results, key=lambda x: x.top_k_accuracy)
        print(f"  Best: {best_combo.combination_name} (accuracy: {best_combo.top_k_accuracy:.3f})")


def save_combination_results(
    combination_results: List[CombinationResult],
    filename: str = "model_combination_results.json"
):
    """Save combination evaluation results to JSON."""
    results_data = {
        "evaluation_summary": {
            "total_combinations_tested": len(combination_results),
            "evaluation_date": datetime.now().isoformat(),
            "top_k_evaluated": 6,
            "best_combination": {
                "models": combination_results[0].models if combination_results else [],
                "name": combination_results[0].combination_name if combination_results else "",
                "accuracy": combination_results[0].top_k_accuracy if combination_results else 0.0
            } if combination_results else {}
        },
        "combination_results": []
    }
    
    for result in combination_results:
        results_data["combination_results"].append({
            "models": result.models,
            "combination_name": result.combination_name,
            "total_queries": result.total_queries,
            "top_k_hits": result.top_k_hits,
            "top_k_accuracy": result.top_k_accuracy,
            "mean_rank": result.mean_rank,
            "median_rank": result.median_rank,
            "mean_reciprocal_rank": result.mean_reciprocal_rank,
            "failed_queries": result.failed_queries,
            "sample_queries": result.sample_queries
        })
    
    with open(filename, 'w') as f:
        json.dump(results_data, f, indent=2)
    
    print(f"\nCombination results saved to: {filename}")


def print_interesting_sample_cases(
    cross_model_results: List[CrossModelQueryResult],
    model_order: List[str],
    max_samples: int = 5
):
    """Print interesting sample cases based on cross-model performance."""
    print("\n" + "="*80)
    print("INTERESTING SAMPLE CASES (CROSS-MODEL ANALYSIS)")
    print("="*80)

    # Case 1: All models succeed (rank 1)
    all_succeed = [r for r in cross_model_results if all(
        rank == 1 for rank in r.ranks.values() if rank is not None
    ) and len(r.ranks) == len(model_order)]
    
    # Case 2: All models fail (not in top 100)
    all_fail = [r for r in cross_model_results if all(
        rank is None for rank in r.ranks.values()
    )]
    
    # Case 3: High-performing models fail, low-performing models succeed
    # Let's define high-performers as the top 3, low-performers as the bottom 3
    high_performers = model_order[:3]
    low_performers = model_order[-3:]
    
    interesting_failures = []
    for r in cross_model_results:
        high_perf_ranks = [r.ranks.get(m) for m in high_performers]
        low_perf_ranks = [r.ranks.get(m) for m in low_performers]
        
        # Condition: at least one high-performer fails (rank > 20 or None)
        # AND at least one low-performer succeeds (rank <= 5)
        if any(rank is None or rank > 20 for rank in high_perf_ranks) and \
           any(rank is not None and rank <= 5 for rank in low_perf_ranks):
            interesting_failures.append(r)

    def display_cases(title, cases):
        print(f"\n{title} - {len(cases)} cases found")
        print("-" * 60)
        if not cases:
            print("None found.")
            return
            
        for i, case in enumerate(cases[:max_samples]):
            print(f"\nSample {i+1}: Query: '{case.match_text}' -> {case.correct_hpo_id}")
            print("Model Ranks:")
            for model_name in model_order:
                rank = case.ranks.get(model_name)
                rank_str = str(rank) if rank is not None else "FAILED"
                print(f"  - {model_name:<30}: {rank_str}")
        if len(cases) > max_samples:
            print(f"... and {len(cases) - max_samples} more.")

    display_cases("Cases where all models ranked #1", all_succeed)
    display_cases("Cases where all models failed to find the term", all_fail)
    display_cases("Cases where high-performing models failed but low-performing models succeeded", interesting_failures)


def evaluate_single_model(
    model_name: str,
    phenotype_matches: List[Tuple[str, str]],
    client: QdrantClient,
    batch_size: int = 1000  # Larger batch for query processing (not embedding)
) -> Tuple[EvaluationMetrics, List[QueryResult]]:
    """
    Evaluate a single embedding model using optimised batch processing.
    Returns both metrics and detailed query results.
    """
    print(f"\nEvaluating model: {model_name}")
    print(f"Total queries to process: {len(phenotype_matches)}")
    
    # Get the optimal embedding batch size for this model
    embed_batch_size = get_optimal_batch_size(model_name)
    print(f"Using embedding batch size: {embed_batch_size} (optimised for {model_name})")
    
    embedding_model = EmbeddingModel(model_name)
    
    try:
        # Initialise aggregated metrics
        all_ranks = []
        all_reciprocal_ranks = []
        all_query_results = []
        total_top_1_hits = 0
        total_top_5_hits = 0
        total_top_10_hits = 0
        total_top_20_hits = 0
        total_failed_queries = 0
        total_processed = 0
        
        # Process in batches to manage memory
        num_batches = (len(phenotype_matches) + batch_size - 1) // batch_size
        
        for i in tqdm(range(num_batches), desc=f"Processing {model_name} batches"):
            start_idx = i * batch_size
            end_idx = min((i + 1) * batch_size, len(phenotype_matches))
            batch_queries = phenotype_matches[start_idx:end_idx]
            
            # Process this batch with optimised embedding
            (batch_ranks, batch_reciprocal_ranks, batch_top_1, batch_top_5,
             batch_top_10, batch_top_20, batch_failed,
             batch_query_results) = process_query_batch_enhanced(
                client, model_name, embedding_model, batch_queries, sample_cases=None
            )
            
            # Aggregate results
            all_ranks.extend(batch_ranks)
            all_reciprocal_ranks.extend(batch_reciprocal_ranks)
            all_query_results.extend(batch_query_results)
            total_top_1_hits += batch_top_1
            total_top_5_hits += batch_top_5
            total_top_10_hits += batch_top_10
            total_top_20_hits += batch_top_20
            total_failed_queries += batch_failed
            total_processed += len(batch_queries)
            
            # Progress update every 5 batches (since batches are larger now)
            if (i + 1) % 5 == 0:
                current_accuracy = total_top_1_hits / max(1, total_processed - total_failed_queries)
                print(f"  Batch {i+1}/{num_batches}: Top-1 accuracy so far: {current_accuracy:.3f}")
            
            # Clear batch data and force garbage collection every few batches
            if i % 3 == 0 and i > 0:  # More frequent cleanup for larger batches
                gc.collect()
                if torch.cuda.is_available():
                    torch.cuda.empty_cache()
                if torch.backends.mps.is_available():
                    torch.mps.empty_cache()
        
        # Calculate final metrics
        successful_queries = total_processed - total_failed_queries
        mean_rank = statistics.mean(all_ranks) if all_ranks else float('inf')
        median_rank = statistics.median(all_ranks) if all_ranks else float('inf')
        mean_reciprocal_rank = (statistics.mean(all_reciprocal_ranks)
                               if all_reciprocal_ranks else 0.0)
        
        metrics = EvaluationMetrics(
            model_name=model_name,
            total_queries=successful_queries,
            top_1_hits=total_top_1_hits,
            top_5_hits=total_top_5_hits,
            top_10_hits=total_top_10_hits,
            top_20_hits=total_top_20_hits,
            mean_rank=mean_rank,
            median_rank=median_rank,
            mean_reciprocal_rank=mean_reciprocal_rank,
            failed_queries=total_failed_queries
        )
        
        print(f"Completed evaluation for {model_name}: "
              f"{successful_queries} successful queries, "
              f"{total_failed_queries} failed queries, "
              f"Top-1 accuracy: {metrics.top_1_accuracy:.3f}")
        
        return metrics, all_query_results
        
    finally:
        # Always unload the model to free memory
        print(f"Cleaning up memory for {model_name}")
        embedding_model.unload_model()
        
        # Additional memory cleanup
        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        if torch.backends.mps.is_available():
            torch.mps.empty_cache()


def print_evaluation_results(metrics_list: List[EvaluationMetrics]):
    """Print formatted evaluation results."""
    print("\n" + "="*80)
    print("EMBEDDING EVALUATION RESULTS")
    print("="*80)
    
    # Print header
    print(f"{'Model':<30} {'Top-1':<8} {'Top-5':<8} {'Top-10':<9} {'Top-20':<9} {'MRR':<8} {'Mean Rank':<12}")
    print("-" * 80)
    
    # Sort by Top-1 accuracy
    metrics_list.sort(key=lambda m: m.top_1_accuracy, reverse=True)
    
    for metrics in metrics_list:
        print(f"{metrics.model_name:<30} "
              f"{metrics.top_1_accuracy:.3f}    "
              f"{metrics.top_5_accuracy:.3f}    "
              f"{metrics.top_10_accuracy:.3f}     "
              f"{metrics.top_20_accuracy:.3f}     "
              f"{metrics.mean_reciprocal_rank:.3f}    "
              f"{metrics.mean_rank:.1f}")
    
    print("\n" + "="*80)
    print("DETAILED METRICS")
    print("="*80)
    
    for metrics in metrics_list:
        print(f"\n{metrics.model_name}:")
        print(f"  Total queries: {metrics.total_queries}")
        print(f"  Failed queries: {metrics.failed_queries}")
        print(f"  Top-1 hits: {metrics.top_1_hits} ({metrics.top_1_accuracy:.1%})")
        print(f"  Top-5 hits: {metrics.top_5_hits} ({metrics.top_5_accuracy:.1%})")
        print(f"  Top-10 hits: {metrics.top_10_hits} ({metrics.top_10_accuracy:.1%})")
        print(f"  Top-20 hits: {metrics.top_20_hits} ({metrics.top_20_accuracy:.1%})")
        print(f"  Mean rank: {metrics.mean_rank:.1f}")
        print(f"  Median rank: {metrics.median_rank:.1f}")
        print(f"  Mean reciprocal rank: {metrics.mean_reciprocal_rank:.3f}")


def save_results(metrics_list: List[EvaluationMetrics], output_file: str = "embedding_evaluation_results.json"):
    """Save evaluation results to a JSON file."""
    results = {
        "evaluation_summary": {
            "total_models_evaluated": len(metrics_list),
            "evaluation_date": datetime.now().isoformat(),
            "backend_url": BACKEND_URL,
            "collection_name": COLLECTION_NAME,
            "hpo_version": HPO_VERSION
        },
        "model_results": [asdict(metrics) for metrics in metrics_list]
    }
    
    with open(output_file, 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"\nResults saved to: {output_file}")


def print_sample_cases(sample_cases: SampleCases, model_name: str, max_samples: int = 5):
    """Display sample cases for analysis."""
    print(f"\n{'='*80}")
    print(f"SAMPLE CASES FOR {model_name}")
    print(f"{'='*80}")
    
    categories = [
        ("EXCELLENT (Rank 1)", sample_cases.excellent_cases),
        ("GOOD (Rank 2-5)", sample_cases.good_cases),
        ("FAIR (Rank 6-20)", sample_cases.fair_cases),
        ("POOR (Rank 21-100)", sample_cases.poor_cases),
        ("FAILED (Not found)", sample_cases.failed_cases)
    ]
    
    for category_name, cases in categories:
        if not cases:
            continue
            
        print(f"\n{category_name} - {len(cases)} cases")
        print("-" * 60)
        
        # Show up to max_samples cases from each category
        display_cases = cases[:max_samples]
        
        for case in display_cases:
            print(f"\nQuery: '{case.match_text}'")
            print(f"Correct HPO: {case.correct_hpo_id}")
            if case.found_rank:
                print(f"Found at rank: {case.found_rank}")
            else:
                print("Not found in top 100")
            
            if case.query_type != "standard":
                print(f"Query type: {case.query_type}")
                if case.instruction_prompt:
                    print(f"Instruction: {case.instruction_prompt}")
            
            # Show top results
            print("Top 5 results:")
            for i, (hpo_id, name, score) in enumerate(case.top_results[:5], 1):
                marker = " *** CORRECT ***" if hpo_id == case.correct_hpo_id else ""
                print(f"  {i}. {hpo_id}: {name} (score: {score:.3f}){marker}")
        
        if len(cases) > max_samples:
            print(f"\n... and {len(cases) - max_samples} more cases")


def evaluate_qwen_with_instructions(
    phenotype_matches: List[Tuple[str, str]],
    client: QdrantClient,
    max_samples: int = 512
) -> List[EvaluationMetrics]:
    """Evaluate Qwen model with different instruction prompts."""
    if "Qwen3-Embedding-0.6B" not in MODELS_TO_EVALUATE:
        print("Qwen3-Embedding-0.6B not in evaluation list, skipping instruction evaluation")
        return []
    
    print("\n" + "="*80)
    print("QWEN INSTRUCTION PROMPT EVALUATION")
    print("="*80)
    
    # Use subset for faster evaluation
    sample_matches = phenotype_matches[:max_samples]
    print(f"Evaluating {len(sample_matches)} samples with {len(QWEN_INSTRUCTION_PROMPTS)} instruction variants")
    
    results = []
    embedding_model = EmbeddingModel("Qwen3-Embedding-0.6B")
    
    try:
        for i, instruction_prompt in enumerate(QWEN_INSTRUCTION_PROMPTS):
            prompt_name = "Qwen3-Embedding-0.6B"
            if instruction_prompt:
                prompt_name += f"_inst_{i}"
                print(f"\nEvaluating with instruction: '{instruction_prompt}'")
            else:
                print("\nEvaluating without instruction (baseline)")
            
            # Create sample collection for this variant
            sample_cases = SampleCases([], [], [], [], [])
            
            # Process all samples at once
            (ranks, reciprocal_ranks, top_1, top_5, top_10, top_20, 
            failed, query_results) = process_query_batch_enhanced(
                client, "Qwen3-Embedding-0.6B", embedding_model, sample_matches,
                instruction_prompt=instruction_prompt,
                query_type="instructed" if instruction_prompt else "standard",
                sample_cases=sample_cases
            )
            
            # Calculate metrics
            successful_queries = len(sample_matches) - failed
            mean_rank = statistics.mean(ranks) if ranks else float('inf')
            median_rank = statistics.median(ranks) if ranks else float('inf')
            mean_reciprocal_rank = statistics.mean(reciprocal_ranks) if reciprocal_ranks else 0.0
            
            metrics = EvaluationMetrics(
                model_name=prompt_name,
                total_queries=successful_queries,
                top_1_hits=top_1,
                top_5_hits=top_5,
                top_10_hits=top_10,
                top_20_hits=top_20,
                mean_rank=mean_rank,
                median_rank=median_rank,
                mean_reciprocal_rank=mean_reciprocal_rank,
                failed_queries=failed
            )
            
            results.append(metrics)
            
            print(f"Results: Top-1={metrics.top_1_accuracy:.3f}, "
                  f"Top-5={metrics.top_5_accuracy:.3f}, "
                  f"MRR={metrics.mean_reciprocal_rank:.3f}")
            
            # Show sample cases for first few instruction variants
            if i < 3:
                print_sample_cases(sample_cases, prompt_name, max_samples=3)
    
    finally:
        embedding_model.unload_model()
    
    return results


def evaluate_query_rephrasing(
    phenotype_matches: List[Tuple[str, str]],
    client: QdrantClient,
    model_name: str = "nomic-embed-text-v1.5",  # Good general model
    max_samples: int = 50  # Smaller sample for demonstration
) -> List[EvaluationMetrics]:
    """Evaluate how different query phrasings affect retrieval performance."""
    print("\n" + "="*80)
    print("QUERY REPHRASING EVALUATION")
    print("="*80)
    
    # Use subset for faster evaluation
    sample_matches = phenotype_matches[:max_samples]
    print(f"Evaluating {len(sample_matches)} samples with {len(QUERY_REPHRASE_TEMPLATES)} query variants")
    
    results = []
    embedding_model = EmbeddingModel(model_name)
    
    try:
        for i, template in enumerate(QUERY_REPHRASE_TEMPLATES):
            template_name = f"{model_name}_template_{i}"
            if template == "{match_text}":
                print("\nEvaluating original queries (baseline)")
            else:
                print(f"\nEvaluating with template: '{template}'")
            
            # Generate rephrased queries
            rephrased_queries = []
            for match_text, correct_hpo_id in sample_matches:
                try:
                    rephrased_text = template.format(match_text=match_text)
                    rephrased_queries.append((rephrased_text, correct_hpo_id))
                except Exception:
                    # Skip invalid templates
                    rephrased_queries.append((match_text, correct_hpo_id))
            
            # Create sample collection for this variant
            sample_cases = SampleCases([], [], [], [], [])
            
            # Process all rephrased queries
            (ranks, reciprocal_ranks, top_1, top_5, top_10, top_20, 
            failed, query_results) = process_query_batch_enhanced(
                client, model_name, embedding_model, rephrased_queries,
                query_type="rephrased" if template != "{match_text}" else "standard",
                sample_cases=sample_cases
            )
            
            # Calculate metrics
            successful_queries = len(rephrased_queries) - failed
            mean_rank = statistics.mean(ranks) if ranks else float('inf')
            median_rank = statistics.median(ranks) if ranks else float('inf')
            mean_reciprocal_rank = statistics.mean(reciprocal_ranks) if reciprocal_ranks else 0.0
            
            metrics = EvaluationMetrics(
                model_name=template_name,
                total_queries=successful_queries,
                top_1_hits=top_1,
                top_5_hits=top_5,
                top_10_hits=top_10,
                top_20_hits=top_20,
                mean_rank=mean_rank,
                median_rank=median_rank,
                mean_reciprocal_rank=mean_reciprocal_rank,
                failed_queries=failed
            )
            
            results.append(metrics)
            
            print(f"Results: Top-1={metrics.top_1_accuracy:.3f}, "
                  f"Top-5={metrics.top_5_accuracy:.3f}, "
                  f"MRR={metrics.mean_reciprocal_rank:.3f}")
            
            # Show sample cases for first few templates
            if i < 3:
                print_sample_cases(sample_cases, template_name, max_samples=2)
    
    finally:
        embedding_model.unload_model()
    
    return results


def main():
    """Enhanced main function with comprehensive evaluation modes."""
    print("Starting enhanced HPO embedding evaluation...")
    
    # Fetch gold corpus data
    try:
        phenotype_matches = fetch_gold_corpus_data()
        if not phenotype_matches:
            print("No phenotype matches found in the corpus.")
            return
        print(f"Successfully extracted {len(phenotype_matches)} phenotype matches")
    except Exception as e:
        print(f"Error fetching corpus data: {e}")
        return
    
    # Initialise Qdrant client
    try:
        client = QdrantClient(path=QDRANT_PATH)
        collection_info = client.get_collection(COLLECTION_NAME)
        print(f"Connected to Qdrant. Collection has {collection_info.points_count} points.")
    except Exception as e:
        print(f"Error connecting to Qdrant: {e}")
        print("Please ensure you have run generate_embeddings.py first.")
        return
    
    # PHASE 1: Standard Model Evaluation
    print("\n" + "="*100)
    print("PHASE 1: STANDARD MODEL EVALUATION")
    print("="*100)
    
    all_metrics = []
    all_model_results = {}
    
    for i, model_name in enumerate(MODELS_TO_EVALUATE, 1):
        try:
            print(f"\n{'-'*60}")
            print(f"Evaluating model {i}/{len(MODELS_TO_EVALUATE)}: {model_name}")
            print(f"{'-'*60}")
            
            # Force memory cleanup before each model
            gc.collect()
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            if torch.backends.mps.is_available():
                torch.mps.empty_cache()
            
            metrics, query_results = evaluate_single_model(model_name, phenotype_matches, client)
            all_metrics.append(metrics)
            all_model_results[model_name] = query_results
            
            print(f"Completed {model_name}: Top-1 accuracy = {metrics.top_1_accuracy:.3f}")
            
        except Exception as e:
            print(f"Error evaluating model {model_name}: {e}")
            continue
        
        # Force cleanup between models
        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        if torch.backends.mps.is_available():
            torch.mps.empty_cache()
    
    # Print standard evaluation results
    if all_metrics:
        # Sort metrics for ordered display
        all_metrics.sort(key=lambda m: m.top_1_accuracy, reverse=True)
        model_order = [m.model_name for m in all_metrics]

        print_evaluation_results(all_metrics)
        save_results(all_metrics, "standard_evaluation_results.json")

        # Analyse and print interesting sample cases
        cross_model_results = analyse_cross_model_performance(all_model_results, phenotype_matches)
        print_interesting_sample_cases(cross_model_results, model_order)

    
    # # PHASE 2: Qwen Instruction Prompt Evaluation
    # print("\n" + "="*100)
    # print("PHASE 2: QWEN INSTRUCTION PROMPT EVALUATION")
    # print("="*100)
    
    # try:
    #     qwen_metrics = evaluate_qwen_with_instructions(phenotype_matches, client, max_samples=200)
    #     if qwen_metrics:
    #         print_evaluation_results(qwen_metrics)
    #         save_results(qwen_metrics, "qwen_instruction_evaluation_results.json")
    #         all_metrics.extend(qwen_metrics)
    # except Exception as e:
    #     print(f"Error in Qwen instruction evaluation: {e}")
    
    # # PHASE 3: Query Rephrasing Evaluation  
    # print("\n" + "="*100)
    # print("PHASE 3: QUERY REPHRASING EVALUATION")
    # print("="*100)
    
    # try:
    #     rephrase_metrics = evaluate_query_rephrasing(phenotype_matches, client, max_samples=100)
    #     if rephrase_metrics:
    #         print_evaluation_results(rephrase_metrics)
    #         save_results(rephrase_metrics, "query_rephrasing_evaluation_results.json")
    #         all_metrics.extend(rephrase_metrics)
    # except Exception as e:
    #     print(f"Error in query rephrasing evaluation: {e}")
    
    # # PHASE 4: Model Combination Evaluation
    # print("\n" + "="*100)
    # print("PHASE 4: MODEL COMBINATION EVALUATION")
    # print("="*100)
    
    # if all_model_results and len(all_model_results) >= 2:
    #     try:
    #         print("Testing model combinations to find the best performing combination for top-6...")
    #         combination_results = evaluate_model_combinations(
    #             all_model_results, 
    #             top_k_total=6, 
    #             max_combination_size=4
    #         )
            
    #         if combination_results:
    #             print_combination_results(combination_results, top_k_total=6)
    #             save_combination_results(combination_results, "model_combination_results.json")
                
    #             # Add best combinations to overall metrics for final summary
    #             best_combinations = combination_results[:3]  # Top 3 combinations
    #             for combo in best_combinations:
    #                 # Create a pseudo-metrics object for the combination
    #                 combo_metrics = EvaluationMetrics(
    #                     model_name=combo.combination_name,
    #                     total_queries=combo.total_queries,
    #                     top_1_hits=0,  # Not directly applicable
    #                     top_5_hits=0,  # Not directly applicable  
    #                     top_10_hits=combo.top_k_hits,  # Use top_k_hits as proxy
    #                     top_20_hits=combo.top_k_hits,
    #                     mean_rank=combo.mean_rank,
    #                     median_rank=combo.median_rank,
    #                     mean_reciprocal_rank=combo.mean_reciprocal_rank,
    #                     failed_queries=combo.failed_queries
    #                 )
    #                 all_metrics.append(combo_metrics)
                    
    #     except Exception as e:
    #         print(f"Error in model combination evaluation: {e}")
    # else:
    #     print("Insufficient model results for combination evaluation (need at least 2 models)")
    

    # Clean up client connection
    try:
        client.close()
    except Exception:
        pass
    
    print("\nFinal memory cleanup...")
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
    if torch.backends.mps.is_available():
        torch.mps.empty_cache()
    print_evaluation_results(all_metrics)
    save_results(all_metrics)
    
    print("\nEvaluation complete!")
    print("Final memory cleanup...")
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
    if torch.backends.mps.is_available():
        torch.mps.empty_cache()


if __name__ == "__main__":
    try:
        print("HPO Embedding Evaluation Tool")
        print("==============================")
        print("This tool evaluates embedding models by comparing their search results")
        print("against gold standard annotations from the corpus.")
        print(f"Models to evaluate: {', '.join(MODELS_TO_EVALUATE)}")
        print()
        
        main()
        
    except KeyboardInterrupt:
        print("\nEvaluation interrupted by user.")
        print("Performing final cleanup...")
        
        # Emergency cleanup
        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        if torch.backends.mps.is_available():
            torch.mps.empty_cache()
            
    except Exception as e:
        print(f"\nUnexpected error during evaluation: {e}")
        print("Performing emergency cleanup...")
        
        # Emergency cleanup
        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        if torch.backends.mps.is_available():
            torch.mps.empty_cache()
        
        raise
        
    finally:
        print("Evaluation session ended.")
