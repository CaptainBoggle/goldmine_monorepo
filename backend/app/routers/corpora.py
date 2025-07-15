"""
Corpus management API endpoints.
"""

import random
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Path, Query
from sqlmodel import Field, Session, SQLModel, func, select

from goldmine.types import Corpus, CorpusDocument

from ..services.database import get_db_session


async def get_corpus_dependency(
    corpus_name: str = Path(..., description="Name of the corpus"),
    corpus_version: str = Path(..., description="Version of the corpus or 'latest'"),
    session: Session = Depends(get_db_session),
) -> Corpus:
    """Dependency to get a corpus by name and version."""
    if corpus_version == "latest":
        statement = (
            select(Corpus)
            .where(Corpus.name == corpus_name)
            # Get the most recently inserted (latest) version
            # The type is of `db_id` is optional[int] so that the
            # database can automatically assign it, but we know it will always be set
            .order_by(Corpus.db_id.desc())  # type: ignore
        )
        corpus = session.exec(statement).first()

        if corpus is None:
            raise HTTPException(status_code=404, detail=f"Corpus '{corpus_name}' not found")
    else:
        statement = select(Corpus).where(
            Corpus.name == corpus_name, Corpus.corpus_version == corpus_version
        )
        corpus = session.exec(statement).first()

        if corpus is None:
            raise HTTPException(
                status_code=404,
                detail=f"Corpus '{corpus_name}' version '{corpus_version}' not found",
            )

    return corpus


# Response model for paginated results
class PaginatedDocumentsResponse(SQLModel):
    """Paginated response for corpus documents."""

    documents: List[CorpusDocument] = Field(..., description="List of corpus documents")
    total: int = Field(..., description="Total number of documents in the corpus")
    skip: int = Field(..., description="Number of documents skipped")
    limit: int = Field(..., description="Number of documents returned")
    has_more: bool = Field(..., description="Whether there are more documents available")


router = APIRouter()


@router.get("/", response_model=List[Corpus])
async def list_corpora(session: Session = Depends(get_db_session)):
    """List all ingested corpora."""
    statement = select(Corpus)
    corpora = session.exec(statement).all()
    return corpora


@router.get("/{corpus_name}/{corpus_version}", response_model=Corpus)
async def get_corpus(corpus: Corpus = Depends(get_corpus_dependency)):
    """Get the details of a specific corpus."""
    return corpus


@router.get("/{corpus_name}/{corpus_version}/documents", response_model=PaginatedDocumentsResponse)
async def get_corpus_documents(
    corpus: Corpus = Depends(get_corpus_dependency),
    session: Session = Depends(get_db_session),
    skip: int = Query(0, ge=0, description="Number of documents to skip"),
    limit: int = Query(50, ge=1, le=1000, description="Number of documents to return (max 1000)"),
):
    """Get documents from a specific corpus with pagination."""
    # Get total count of documents in this corpus
    count_statement = (
        select(func.count())
        .select_from(CorpusDocument)
        .where(CorpusDocument.corpus_id == corpus.db_id)
    )
    total = session.exec(count_statement).one()

    # Get paginated documents
    document_statement = (
        select(CorpusDocument)
        .where(CorpusDocument.corpus_id == corpus.db_id)
        .offset(skip)
        .limit(limit)
    )
    documents = list(session.exec(document_statement).all())

    # Calculate if there are more documents
    has_more = (skip + limit) < total

    return PaginatedDocumentsResponse(
        documents=documents, total=total, skip=skip, limit=limit, has_more=has_more
    )


@router.get("/{corpus_name}/{corpus_version}/documents/random", response_model=CorpusDocument)
async def get_random_corpus_document(
    corpus: Corpus = Depends(get_corpus_dependency), session: Session = Depends(get_db_session)
):
    """Get a random document from a corpus."""
    # Get all documents from this corpus
    document_statement = select(CorpusDocument).where(CorpusDocument.corpus_id == corpus.db_id)
    documents = session.exec(document_statement).all()

    if not documents:
        raise HTTPException(status_code=404, detail=f"No documents found in corpus '{corpus.name}'")

    # Return a random document
    return random.choice(documents)


@router.get("/{corpus_name}/{corpus_version}/document/{doc_name}", response_model=CorpusDocument)
async def get_corpus_document(
    doc_name: str,
    corpus: Corpus = Depends(get_corpus_dependency),
    session: Session = Depends(get_db_session),
):
    """Get a specific document by name from a corpus."""
    statement = select(CorpusDocument).where(
        CorpusDocument.corpus_id == corpus.db_id, CorpusDocument.name == doc_name
    )
    document = session.exec(statement).first()

    if document is None:
        raise HTTPException(
            status_code=404, detail=f"Document '{doc_name}' not found in corpus '{corpus.name}'"
        )

    return document


@router.delete("/{corpus_name}/{corpus_version}", response_model=Corpus)
async def delete_corpus(
    corpus: Corpus = Depends(get_corpus_dependency), session: Session = Depends(get_db_session)
):
    """Delete a specific corpus version and all its documents."""
    session.delete(corpus)
    session.commit()
    return corpus


@router.delete("/{corpus_name}/{corpus_version}/document/{doc_name}", response_model=CorpusDocument)
async def delete_corpus_document(
    doc_name: str,
    corpus: Corpus = Depends(get_corpus_dependency),
    session: Session = Depends(get_db_session),
):
    """Delete a specific document from a corpus."""
    statement = select(CorpusDocument).where(
        CorpusDocument.corpus_id == corpus.db_id, CorpusDocument.name == doc_name
    )
    document = session.exec(statement).first()

    if document is None:
        raise HTTPException(
            status_code=404, detail=f"Document '{doc_name}' not found in corpus '{corpus.name}'"
        )

    session.delete(document)
    session.commit()
    return document
