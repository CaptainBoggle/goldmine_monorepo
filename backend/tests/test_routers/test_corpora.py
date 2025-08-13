from unittest.mock import Mock

import pytest
from app.routers.corpora import get_corpus_dependency
from fastapi import HTTPException

from goldmine.types import Corpus, CorpusDocument, ToolInput, ToolOutput


class TestCorporaRouter:
    """Test class for corpora router endpoints."""

    def test_list_corpora_success(self, client_with_mocked_dependencies, sample_corpus):
        """Test listing all corpora successfully."""
        response = client_with_mocked_dependencies.get("/corpora/")
        assert response.status_code == 200

        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1

        # Check that our sample corpus is in the list
        corpus_names = [corpus["name"] for corpus in data]
        assert "test_corpus" in corpus_names

    def test_list_corpora_empty(self, client_with_mocked_dependencies):
        """Test listing corpora when no corpora exist."""
        response = client_with_mocked_dependencies.get("/corpora/")
        assert response.status_code == 200
        assert response.json() == []

    def test_get_corpus_by_name_and_version(self, client_with_mocked_dependencies, sample_corpus):
        """Test getting a specific corpus by name and version."""
        response = client_with_mocked_dependencies.get(
            f"/corpora/{sample_corpus.name}/{sample_corpus.corpus_version}"
        )
        assert response.status_code == 200

        data = response.json()
        assert data["name"] == sample_corpus.name
        assert data["corpus_version"] == sample_corpus.corpus_version
        assert data["description"] == sample_corpus.description
        assert data["hpo_version"] == sample_corpus.hpo_version

    def test_get_corpus_latest_version(self, client_with_mocked_dependencies, sample_corpus):
        """Test getting the latest version of a corpus."""
        response = client_with_mocked_dependencies.get(f"/corpora/{sample_corpus.name}/latest")
        assert response.status_code == 200

        data = response.json()
        assert data["name"] == sample_corpus.name
        assert data["corpus_version"] == sample_corpus.corpus_version

    def test_get_corpus_not_found(self, client_with_mocked_dependencies):
        """Test getting a corpus that doesn't exist."""
        response = client_with_mocked_dependencies.get("/corpora/nonexistent/1.0")
        assert response.status_code == 404
        assert "Corpus 'nonexistent' version '1.0' not found" in response.json()["detail"]

    def test_get_corpus_documents_success(self, client_with_mocked_dependencies, sample_corpus):
        """Test getting documents from a corpus with pagination."""
        response = client_with_mocked_dependencies.get(
            f"/corpora/{sample_corpus.name}/{sample_corpus.corpus_version}/documents"
        )
        assert response.status_code == 200

        data = response.json()
        assert "documents" in data
        assert "total" in data
        assert "skip" in data
        assert "limit" in data
        assert "has_more" in data

        assert data["total"] >= 1
        assert data["skip"] == 0
        assert data["limit"] == 50
        assert isinstance(data["documents"], list)

    def test_get_corpus_documents_with_pagination(
        self, client_with_mocked_dependencies, sample_corpus
    ):
        """Test getting documents with custom pagination parameters."""
        response = client_with_mocked_dependencies.get(
            f"/corpora/{sample_corpus.name}/{sample_corpus.corpus_version}/documents?skip=0&limit=10"
        )
        assert response.status_code == 200

        data = response.json()
        assert data["skip"] == 0
        assert data["limit"] == 10

    def test_get_corpus_documents_invalid_pagination(
        self, client_with_mocked_dependencies, sample_corpus
    ):
        """Test getting documents with invalid pagination parameters."""
        # Test negative skip
        response = client_with_mocked_dependencies.get(
            f"/corpora/{sample_corpus.name}/{sample_corpus.corpus_version}/documents?skip=-1"
        )
        assert response.status_code == 422

        # Test limit too large
        response = client_with_mocked_dependencies.get(
            f"/corpora/{sample_corpus.name}/{sample_corpus.corpus_version}/documents?limit=2000"
        )
        assert response.status_code == 422

    def test_get_random_corpus_document_success(
        self, client_with_mocked_dependencies, sample_corpus
    ):
        """Test getting a random document from a corpus."""
        response = client_with_mocked_dependencies.get(
            f"/corpora/{sample_corpus.name}/{sample_corpus.corpus_version}/documents/random"
        )
        assert response.status_code == 200

        data = response.json()
        assert "name" in data
        assert "annotator" in data
        assert "input" in data
        assert "output" in data

    def test_get_random_corpus_document_empty_corpus(
        self, client_with_mocked_dependencies, test_db_session
    ):
        """Test getting a random document from an empty corpus."""
        from app.dependencies import get_tool_service
        from app.main import app
        from app.services.database import get_db_session

        # Create empty corpus
        empty_corpus = Corpus(
            name="empty_corpus",
            description="Empty test corpus",
            hpo_version="2023-01-01",
            corpus_version="1.0",
        )
        test_db_session.add(empty_corpus)
        test_db_session.commit()
        test_db_session.refresh(empty_corpus)

        empty_tool_service = Mock()
        empty_tool_service.get_discovered_tools.return_value = []

        app.dependency_overrides[get_db_session] = lambda: test_db_session
        app.dependency_overrides[get_tool_service] = lambda: empty_tool_service

        try:
            response = client_with_mocked_dependencies.get(
                f"/corpora/{empty_corpus.name}/{empty_corpus.corpus_version}/documents/random"
            )
            assert response.status_code == 404
            assert (
                f"No documents found in corpus '{empty_corpus.name}'" in response.json()["detail"]
            )
        finally:
            app.dependency_overrides.clear()

    def test_get_corpus_document_by_name_success(
        self, client_with_mocked_dependencies, sample_corpus, sample_corpus_document
    ):
        """Test getting a specific document by name."""
        response = client_with_mocked_dependencies.get(
            f"/corpora/{sample_corpus.name}/{sample_corpus.corpus_version}/document/{sample_corpus_document.name}"
        )
        assert response.status_code == 200

        data = response.json()
        assert data["name"] == sample_corpus_document.name
        assert data["annotator"] == sample_corpus_document.annotator

    def test_get_corpus_document_by_name_not_found(
        self, client_with_mocked_dependencies, sample_corpus
    ):
        """Test getting a document that doesn't exist."""
        response = client_with_mocked_dependencies.get(
            f"/corpora/{sample_corpus.name}/{sample_corpus.corpus_version}/document/nonexistent_doc"
        )
        assert response.status_code == 404
        assert (
            f"Document 'nonexistent_doc' not found in corpus '{sample_corpus.name}'"
            in response.json()["detail"]
        )

    def test_delete_corpus_success(self, client_with_mocked_dependencies, test_db_session):
        """Test deleting a corpus successfully."""
        # Create a new corpus for deletion
        delete_corpus = Corpus(
            name="delete_corpus",
            description="Corpus to be deleted",
            hpo_version="2023-01-01",
            corpus_version="1.0",
        )
        test_db_session.add(delete_corpus)
        test_db_session.commit()
        test_db_session.refresh(delete_corpus)

        response = client_with_mocked_dependencies.delete(
            f"/corpora/{delete_corpus.name}/{delete_corpus.corpus_version}"
        )
        assert response.status_code == 200

        data = response.json()
        assert data["name"] == delete_corpus.name

    def test_delete_corpus_not_found(self, client_with_mocked_dependencies):
        """Test deleting a corpus that doesn't exist."""
        response = client_with_mocked_dependencies.delete("/corpora/nonexistent/1.0")
        assert response.status_code == 404
        assert "Corpus 'nonexistent' version '1.0' not found" in response.json()["detail"]

    def test_delete_corpus_document_success(self, client_with_mocked_dependencies, test_db_session):
        """Test deleting a document from a corpus successfully."""
        # Create a new corpus and document for deletion
        delete_corpus = Corpus(
            name="delete_doc_corpus",
            description="Corpus for document deletion test",
            hpo_version="2023-01-01",
            corpus_version="1.0",
        )
        test_db_session.add(delete_corpus)
        test_db_session.commit()
        test_db_session.refresh(delete_corpus)

        delete_document = CorpusDocument(
            name="delete_document",
            annotator="test_annotator",
            input=ToolInput(sentences=["Test sentence"]),
            output=ToolOutput(results=[[]]),
            corpus_id=delete_corpus.db_id,
        )
        test_db_session.add(delete_document)
        test_db_session.commit()
        test_db_session.refresh(delete_document)

        response = client_with_mocked_dependencies.delete(
            f"/corpora/{delete_corpus.name}/{delete_corpus.corpus_version}/document/{delete_document.name}"
        )
        assert response.status_code == 200

        data = response.json()
        assert data["name"] == delete_document.name

    def test_delete_corpus_document_not_found(self, client_with_mocked_dependencies, sample_corpus):
        """Test deleting a document that doesn't exist."""
        response = client_with_mocked_dependencies.delete(
            f"/corpora/{sample_corpus.name}/{sample_corpus.corpus_version}/document/nonexistent_doc"
        )
        assert response.status_code == 404
        assert (
            f"Document 'nonexistent_doc' not found in corpus '{sample_corpus.name}'"
            in response.json()["detail"]
        )


class TestCorpusDependency:
    """Test class for the get_corpus_dependency function."""

    @pytest.mark.asyncio
    async def test_get_corpus_dependency_success(self, test_db_session, sample_corpus):
        """Test getting corpus dependency successfully."""
        corpus = await get_corpus_dependency(
            sample_corpus.name, sample_corpus.corpus_version, test_db_session
        )

        assert isinstance(corpus, Corpus)
        assert corpus.name == sample_corpus.name
        assert corpus.corpus_version == sample_corpus.corpus_version

    @pytest.mark.asyncio
    async def test_get_corpus_dependency_latest_version(self, test_db_session, sample_corpus):
        """Test getting corpus dependency with 'latest' version."""
        corpus = await get_corpus_dependency(sample_corpus.name, "latest", test_db_session)

        assert isinstance(corpus, Corpus)
        assert corpus.name == sample_corpus.name

    @pytest.mark.asyncio
    async def test_get_corpus_dependency_not_found(self, test_db_session):
        """Test getting corpus dependency when corpus not found."""
        with pytest.raises(HTTPException) as exc_info:
            await get_corpus_dependency("nonexistent", "1.0", test_db_session)

        assert exc_info.value.status_code == 404
        assert "Corpus 'nonexistent' version '1.0' not found" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_get_corpus_dependency_latest_not_found(self, test_db_session):
        """Test getting corpus dependency with 'latest' when no corpus exists."""
        with pytest.raises(HTTPException) as exc_info:
            await get_corpus_dependency("nonexistent", "latest", test_db_session)

        assert exc_info.value.status_code == 404
        assert "Corpus 'nonexistent' not found" in str(exc_info.value.detail)
