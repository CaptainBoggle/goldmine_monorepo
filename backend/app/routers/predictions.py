"""
Tool prediction API endpoints.
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from goldmine.types import Corpus, CorpusDocument, Prediction, ToolDiscoveryInfo, ToolOutput

from ..dependencies import get_tool_service
from ..services.database import get_db_session
from ..services.tool_service import ToolService
from .corpora import get_corpus_dependency
from .tools import get_tool_dependency
import httpx

router = APIRouter()


@router.post("/{tool_name}/{corpus_name}/{corpus_version}/predict")
async def run_tool_on_corpus(
    tool: ToolDiscoveryInfo = Depends(get_tool_dependency),
    corpus: Corpus = Depends(get_corpus_dependency),
    session: Session = Depends(get_db_session),
):
    """Run a tool on all documents in a corpus and store the predictions."""
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"{tool.endpoint}/status")
            response.raise_for_status()
            status = response.json()
            if status.get("state") != "ready":
                raise HTTPException(
                    status_code=503,
                    detail=f"Model '{tool.id}' is not ready for predictions. Current state: {status.get('state')}",
                )
        except httpx.RequestError as e:
            raise HTTPException(
                status_code=503,
                detail=f"Model '{tool.id}' is not currently available.",
            ) from e

    # Get all documents from this corpus
    documents = corpus.entries
    if not documents:
        raise HTTPException(status_code=404, detail=f"No documents found in corpus '{corpus.name}'")

    batch_input = {"documents": [doc.input.sentences for doc in documents]}

    # Call the tool's batch_predict endpoint
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{tool.endpoint}/batch_predict",
                json=batch_input,
                timeout=None,
            )
            response.raise_for_status()
            batch_output = response.json()
        except httpx.RequestError as e:
            raise HTTPException(status_code=500, detail=f"Error calling tool '{tool.id}': {e}")

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"{tool.endpoint}/info")
            response.raise_for_status()
            tool_info = response.json()
        except httpx.RequestError as e:
            raise HTTPException(status_code=500, detail=f"Error calling tool '{tool.id}': {e}")

    # Store predictions in the database
    for i, doc in enumerate(documents):
        prediction = Prediction(
            document_id=doc.db_id,
            tool_name=tool.id,
            tool_version=tool_info["version"],
            output=ToolOutput(results=batch_output["results"][i]),
        )
        session.add(prediction)

    session.commit()

    return {"message": f"Successfully ran tool '{tool.id}' on corpus '{corpus.name}' and stored {len(documents)} predictions."}


@router.get("/{tool_name}/{corpus_name}/{corpus_version}", response_model=List[Prediction])
async def get_predictions_for_corpus(
    tool: ToolDiscoveryInfo = Depends(get_tool_dependency),
    corpus: Corpus = Depends(get_corpus_dependency),
    session: Session = Depends(get_db_session),
):
    """Get all predictions for a given tool on a specific corpus."""
    statement = (
        select(Prediction)
        .join(CorpusDocument)
        .where(CorpusDocument.corpus_id == corpus.db_id)
        .where(Prediction.tool_name == tool.id)
    )
    predictions = list(session.exec(statement).all())
    return predictions