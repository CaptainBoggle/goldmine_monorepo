from typing import List

import evaluate
import numpy as np
from fastapi import APIRouter, Depends, HTTPException
from sklearn.metrics import jaccard_score
from sklearn.preprocessing import MultiLabelBinarizer
from sqlmodel import Session, select

from goldmine.types import (
    Corpus,
    EvaluationResult,
    Metric,
    ToolDiscoveryInfo,
)

from ..services.database import get_db_session
from .corpora import get_corpus_dependency
from .predictions import get_predictions_for_corpus, get_tool_dependency

router = APIRouter()

def calculate_evaluation_metrics(
    predictions: List[List[str]], ground_truth_labels: List[List[str]]
) -> EvaluationResult:
    """Calculates evaluation metrics using the huggingface evaluate library."""

    all_labels = ground_truth_labels + predictions
    mlb = MultiLabelBinarizer()
    mlb.fit(all_labels)
    binarized_ground_truth = mlb.transform(ground_truth_labels).astype(np.int32)
    binarized_predictions = mlb.transform(predictions).astype(np.int32)

    accuracy_metric = evaluate.load("accuracy", "multilabel")
    f1_metric = evaluate.load("f1", "multilabel")
    precision_metric = evaluate.load("precision", "multilabel")
    recall_metric = evaluate.load("recall", "multilabel")

    accuracy = accuracy_metric.compute(
        predictions=binarized_predictions, references=binarized_ground_truth
    )["accuracy"]
    f1 = f1_metric.compute(
        predictions=binarized_predictions, references=binarized_ground_truth, average="micro"
    )["f1"]
    precision = precision_metric.compute(
        predictions=binarized_predictions, references=binarized_ground_truth, average="micro"
    )["precision"]
    recall = recall_metric.compute(
        predictions=binarized_predictions, references=binarized_ground_truth, average="micro"
    )["recall"]
    jaccard = float(
        jaccard_score(binarized_ground_truth, binarized_predictions, average="micro")
    )

    return EvaluationResult(
        accuracy=accuracy,
        f1=f1,
        precision=precision,
        recall=recall,
        jaccard=jaccard
    )


@router.post("/{tool_name}/{corpus_name}/{corpus_version}", response_model=EvaluationResult)
async def calculate_and_store_metrics(
    tool: ToolDiscoveryInfo = Depends(get_tool_dependency),
    corpus: Corpus = Depends(get_corpus_dependency),
    session: Session = Depends(get_db_session),
):
    """Calculate and store evaluation metrics for a tool on a corpus."""

    predictions = await get_predictions_for_corpus(tool=tool, corpus=corpus, session=session)
    if not predictions:
        raise HTTPException(
            status_code=404, detail="No predictions found for this tool and corpus."
        )

    predictions_by_doc_id = {pred.document_id: pred for pred in predictions}

    flat_predictions = []
    flat_ground_truth = []
    for doc in corpus.entries:
        prediction = predictions_by_doc_id.get(doc.db_id)
        if not prediction:
            continue

        for i, sentence_ground_truth in enumerate(doc.output.results):
            if i < len(prediction.output.results):
                sentence_prediction = prediction.output.results[i]
                flat_ground_truth.append([match.id for match in sentence_ground_truth])
                flat_predictions.append([match.id for match in sentence_prediction])
            else:
                flat_ground_truth.append([match.id for match in sentence_ground_truth])
                flat_predictions.append([])

    evaluation_result = calculate_evaluation_metrics(flat_predictions, flat_ground_truth)

    metric = Metric(
        tool_name=tool.id,
        tool_version=predictions[0].tool_version,
        corpus_name=corpus.name,
        corpus_version=corpus.corpus_version,
        evaluation_result_internal=evaluation_result.model_dump(),
    )
    session.add(metric)
    session.commit()

    return evaluation_result


@router.get("/{tool_name}/{corpus_name}/{corpus_version}", response_model=List[Metric])
async def get_metrics(
    tool_name: str,
    corpus_name: str,
    corpus_version: str,
    session: Session = Depends(get_db_session),
):
    """Get all evaluation metrics for a given tool on a specific corpus."""
    try:
        statement = (
            select(Metric)
            .where(Metric.tool_name == tool_name)
            .where(Metric.corpus_name == corpus_name)
            .where(Metric.corpus_version == corpus_version)
        )
        metrics = list(session.exec(statement).all())
        return metrics
    finally:
        # Ensure session is properly closed to release connection
        session.close()
