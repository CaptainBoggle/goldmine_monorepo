#!/usr/bin/env python3
"""
Script to analyze HPO agent predictions against gold-corpus-small ground truth.

This script:
1. Connects to the database and retrieves HPO agent predictions for gold-corpus-small
2. Loads the ground truth annotations from gold-corpus-small 
3. Compares predictions vs ground truth for each sentence
4. Generates a text file showing:
   - Each sentence with its HPO IDs
   - ✅ for correctly predicted HPO IDs
   - ➕ for HPO IDs predicted but not in ground truth (false positives)
   - ➖ for HPO IDs in ground truth but not predicted (false negatives)
"""

import os
import re
import sys
from pathlib import Path
from typing import Dict, List, Tuple, Optional

# Add the project root to the Python path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))
sys.path.insert(0, str(project_root / "goldmine"))
sys.path.insert(0, str(project_root / "backend"))

try:
    from sqlmodel import Session, create_engine, select
    from goldmine.types import Corpus, CorpusDocument, Prediction, PhenotypeMatch
    from corpora.gold_corpus_small.corpus import GoldCorpusSmallParser
    from pyhpo import Ontology
except ImportError as e:
    print(f"Import error: {e}")
    print("Make sure you're running this script from the project root and dependencies are installed")
    sys.exit(1)


def load_hpo_ontology():
    """
    Load HPO ontology using pyhpo.
    
    Returns:
        pyhpo Ontology object or None if failed
    """
    print("Loading HPO ontology using pyhpo...")
    
    # Try to find the HPO data folder (similar to agent.py)
    possible_versions = ["2024-04-19", "2024-02-08"]
    
    ontology = None
    for version in possible_versions:
        hpo_path = None
        try:
            # Try to load from tools/hpo-agent/hpo directory first
            hpo_path = project_root / "tools" / "hpo-agent" / "hpo" / version
            if hpo_path.exists():
                print(f"Loading HPO ontology from: {hpo_path}")
                ontology = Ontology(data_folder=str(hpo_path))
                break
        except Exception as e:
            if hpo_path:
                print(f"Failed to load HPO from {hpo_path}: {e}")
            continue
    
    if ontology is None:
        try:
            # Fallback to default pyhpo data
            print("Loading default HPO ontology...")
            ontology = Ontology()
        except Exception as e:
            print(f"Warning: Failed to load HPO ontology: {e}")
            print("Term names will not be displayed.")
            return None
    
    print(f"Successfully loaded HPO ontology with {len(ontology)} terms")
    return ontology


def load_gold_corpus_small() -> Dict[str, Tuple[List[str], List[List[PhenotypeMatch]]]]:
    """
    Load the gold corpus small dataset.
    
    Returns:
        Dict mapping document names to (sentences, ground_truth_annotations)
    """
    print("Loading gold-corpus-small ground truth...")
    
    parser = GoldCorpusSmallParser()
    corpus_path = project_root / "corpora" / "gold_corpus_small"
    
    if not corpus_path.exists():
        raise FileNotFoundError(f"Gold corpus small path not found: {corpus_path}")
    
    documents = parser.parse_corpus(corpus_path)
    
    result = {}
    for doc in documents:
        result[doc.name] = (doc.input.sentences, doc.output.results)
    
    print(f"Loaded {len(result)} documents from gold-corpus-small")
    return result


def get_database_predictions(database_url: str) -> Dict[str, List[List[PhenotypeMatch]]]:
    """
    Retrieve HPO agent predictions for gold-corpus-small from the database.
    
    Returns:
        Dict mapping document names to predicted annotations
    """
    print("Connecting to database and retrieving predictions...")
    
    engine = create_engine(database_url, echo=False)
    
    with Session(engine) as session:
        # First, let's see what corpora are available
        all_corpora_stmt = select(Corpus)
        all_corpora = list(session.exec(all_corpora_stmt).all())
        print(f"Available corpora in database: {[c.name for c in all_corpora]}")
        corpus_stmt = select(Corpus).where(Corpus.name == "gold_corpus_small")
        corpus = session.exec(corpus_stmt).first()
        
        if not corpus:
            available_names = [c.name for c in all_corpora]
            raise ValueError(
                f"gold_corpus_small corpus not found in database. "
                f"Available: {available_names}"
            )
        
        print(f"Found corpus: {corpus.name} (version: {corpus.corpus_version})")
        
        # Get all documents for this corpus
        docs_stmt = select(CorpusDocument).where(CorpusDocument.corpus_id == corpus.db_id)
        documents = list(session.exec(docs_stmt).all())
        
        if not documents:
            raise ValueError("No documents found for gold-corpus-small corpus")
        
        print(f"Found {len(documents)} documents in corpus")
        
        # Get HPO agent predictions for these documents
        predictions_stmt = (
            select(Prediction)
            .join(CorpusDocument)
            .where(CorpusDocument.corpus_id == corpus.db_id)
        )
        all_predictions = list(session.exec(predictions_stmt).all())
        
        # Filter for HPO agent predictions
        predictions = [p for p in all_predictions if "hpo-agent" in p.tool_name.lower()]
        
        if not predictions:
            print("Warning: No HPO agent predictions found in database")
            return {}
        
        print(f"Found {len(predictions)} HPO agent predictions")
        
        # Map predictions by document name
        doc_name_map = {doc.db_id: doc.name for doc in documents}
        result = {}
        
        for prediction in predictions:
            doc_name = doc_name_map[prediction.document_id]
            result[doc_name] = prediction.output.results
        
        print(f"Retrieved predictions for {len(result)} documents")
        return result


def compare_annotations(
    ground_truth: List[List[PhenotypeMatch]], 
    predictions: List[List[PhenotypeMatch]]
) -> List[Dict]:
    """
    Compare ground truth vs predictions for each sentence.
    
    Returns:
        List of comparison results for each sentence
    """
    results = []
    
    # Ensure both lists have the same length
    max_len = max(len(ground_truth), len(predictions))
    gt_padded = ground_truth + [[] for _ in range(max_len - len(ground_truth))]
    pred_padded = predictions + [[] for _ in range(max_len - len(predictions))]
    
    for i, (gt_matches, pred_matches) in enumerate(zip(gt_padded, pred_padded)):
        # Extract HPO IDs from matches
        gt_ids = {match.id for match in gt_matches}
        pred_ids = {match.id for match in pred_matches}
        
        # Calculate different types of matches
        correct = gt_ids & pred_ids  # intersection
        false_positives = pred_ids - gt_ids  # predicted but not in ground truth
        false_negatives = gt_ids - pred_ids  # in ground truth but not predicted
        
        results.append({
            'sentence_index': i,
            'ground_truth_matches': gt_matches,
            'predicted_matches': pred_matches,
            'correct_ids': correct,
            'false_positive_ids': false_positives,
            'false_negative_ids': false_negatives
        })
    
    return results


def generate_analysis_report(
    gold_corpus_data: Dict[str, Tuple[List[str], List[List[PhenotypeMatch]]]],
    predictions_data: Dict[str, List[List[PhenotypeMatch]]],
    ontology,
    output_file: str = "hpo_agent_analysis.txt"
):
    """
    Generate a comprehensive analysis report comparing predictions to ground truth.
    """
    print(f"Generating analysis report: {output_file}")
    
    def format_hpo_id(hpo_id: str, match_text: str = "") -> str:
        """Format HPO ID with term name if available."""
        if ontology:
            try:
                # Use pyhpo to get the term name
                term = ontology.get_hpo_object(hpo_id)
                term_name = term.name if term else "Unknown term"
            except Exception:
                term_name = "Unknown term"
        else:
            term_name = "Unknown term"
        
        if match_text:
            return f"{hpo_id} - {term_name} (matched: '{match_text}')"
        else:
            return f"{hpo_id} - {term_name}"
    
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write("HPO Agent Prediction Analysis Report\n")
        f.write("=" * 50 + "\n\n")
        f.write("Legend:\n")
        f.write("✅ Correctly predicted HPO ID\n")
        f.write("➕ False positive (predicted but not in ground truth)\n")
        f.write("➖ False negative (in ground truth but not predicted)\n\n")
        
        total_docs = len(gold_corpus_data)
        docs_with_predictions = 0
        total_sentences = 0
        total_correct = 0
        total_fp = 0
        total_fn = 0
        
        for doc_name, (sentences, ground_truth) in gold_corpus_data.items():
            f.write(f"\nDocument: {doc_name}\n")
            f.write("-" * (len(doc_name) + 10) + "\n")
            
            predictions = predictions_data.get(doc_name, [])
            if predictions:
                docs_with_predictions += 1
            
            # Compare annotations
            comparison_results = compare_annotations(ground_truth, predictions)
            
            for i, sentence in enumerate(sentences):
                total_sentences += 1
                f.write(f"\nSentence {i+1}: {sentence}\n")
                
                if i < len(comparison_results):
                    result = comparison_results[i]
                    
                    # Count stats
                    total_correct += len(result['correct_ids'])
                    total_fp += len(result['false_positive_ids'])
                    total_fn += len(result['false_negative_ids'])
                    
                    # Write correctly predicted HPO IDs
                    if result['correct_ids']:
                        f.write("  Correct predictions:\n")
                        for hpo_id in sorted(result['correct_ids']):
                            # Find the match text from either ground truth or predictions
                            match_text = ""
                            for match in result['ground_truth_matches']:
                                if match.id == hpo_id:
                                    match_text = match.match_text
                                    break
                            f.write(f"    ✅ {format_hpo_id(hpo_id, match_text)}\n")
                    
                    # Write false positives
                    if result['false_positive_ids']:
                        f.write("  False positives (predicted but not in ground truth):\n")
                        for hpo_id in sorted(result['false_positive_ids']):
                            # Find match text from predictions
                            match_text = ""
                            for match in result['predicted_matches']:
                                if match.id == hpo_id:
                                    match_text = match.match_text
                                    break
                            f.write(f"    ➕ {format_hpo_id(hpo_id, match_text)}\n")
                    
                    # Write false negatives
                    if result['false_negative_ids']:
                        f.write("  False negatives (in ground truth but not predicted):\n")
                        for hpo_id in sorted(result['false_negative_ids']):
                            # Find match text from ground truth
                            match_text = ""
                            for match in result['ground_truth_matches']:
                                if match.id == hpo_id:
                                    match_text = match.match_text
                                    break
                            f.write(f"    ➖ {format_hpo_id(hpo_id, match_text)}\n")
                    
                    # If no annotations at all
                    if (not result['correct_ids'] and 
                        not result['false_positive_ids'] and 
                        not result['false_negative_ids']):
                        f.write("  No annotations (ground truth or predicted)\n")
                
                else:
                    f.write("  No comparison data available\n")
        
        # Write summary statistics
        f.write("\n\n" + "=" * 50 + "\n")
        f.write("SUMMARY STATISTICS\n")
        f.write("=" * 50 + "\n")
        f.write(f"Total documents: {total_docs}\n")
        f.write(f"Documents with predictions: {docs_with_predictions}\n")
        f.write(f"Total sentences: {total_sentences}\n")
        f.write(f"Correct predictions: {total_correct}\n")
        f.write(f"False positives: {total_fp}\n")
        f.write(f"False negatives: {total_fn}\n")
        
        if total_correct + total_fp > 0:
            precision = total_correct / (total_correct + total_fp)
            f.write(f"Precision: {precision:.3f}\n")
        else:
            f.write("Precision: N/A (no predictions made)\n")
        
        if total_correct + total_fn > 0:
            recall = total_correct / (total_correct + total_fn)
            f.write(f"Recall: {recall:.3f}\n")
        else:
            f.write("Recall: N/A (no ground truth annotations)\n")
        
        if total_correct + total_fp > 0 and total_correct + total_fn > 0:
            precision = total_correct / (total_correct + total_fp)
            recall = total_correct / (total_correct + total_fn)
            if precision + recall > 0:
                f1 = 2 * (precision * recall) / (precision + recall)
                f.write(f"F1-Score: {f1:.3f}\n")
    
    print(f"Analysis report saved to: {output_file}")


def main():
    """Main function to run the analysis."""
    # Database URL - you can override this with environment variable
    database_url = os.getenv(
        "DATABASE_URL", 
        "postgresql://postgres:password@localhost:5432/postgres"
    )
    
    try:
        # Load HPO ontology
        ontology = load_hpo_ontology()
        
        # Load ground truth data
        gold_corpus_data = load_gold_corpus_small()
        
        # Get predictions from database
        predictions_data = get_database_predictions(database_url)
        
        if not predictions_data:
            print("No predictions found in database. Make sure you have:")
            print("1. Run the backend service to ingest the corpus")
            print("2. Run HPO agent predictions on gold-corpus-small")
            print("3. Check that the database is accessible")
            return
        
        # Generate analysis report
        generate_analysis_report(gold_corpus_data, predictions_data, ontology)
        
        print("\nAnalysis complete!")
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
