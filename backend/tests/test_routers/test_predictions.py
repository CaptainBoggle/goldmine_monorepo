from unittest.mock import AsyncMock, Mock, patch

import httpx

from goldmine.types import (
    Corpus,
    CorpusDocument,
    PhenotypeMatch,
    Prediction,
    ToolInput,
    ToolOutput,
)


class TestPredictionsRouter:
    """Test class for predictions router."""

    @patch("httpx.AsyncClient")
    def test_run_tool_on_corpus_success(
        self, mock_httpx_client, client_with_mocked_dependencies, test_db_session
    ):
        """Test running a tool on a corpus successfully."""
        # Create test corpus with documents
        corpus = Corpus(
            name="test_corpus",
            description="Test corpus",
            hpo_version="2023-01-01",
            corpus_version="1.0",
        )
        test_db_session.add(corpus)
        test_db_session.commit()
        test_db_session.refresh(corpus)

        # Create test document
        document = CorpusDocument(
            name="test_doc",
            annotator="test_annotator",
            input=ToolInput(sentences=["Test sentence"]),
            output=ToolOutput(results=[[PhenotypeMatch(id="HP:0000001", match_text="test")]]),
            corpus_id=corpus.db_id,
        )
        test_db_session.add(document)
        test_db_session.commit()
        test_db_session.refresh(document)

        # Mock HTTP responses
        mock_client = AsyncMock()
        mock_httpx_client.return_value.__aenter__.return_value = mock_client

        # Mock status response
        mock_status_response = Mock()
        mock_status_response.json.return_value = {"state": "ready"}
        mock_status_response.raise_for_status.return_value = None
        mock_client.get.return_value = mock_status_response

        # Mock batch_predict response
        mock_batch_response = Mock()
        mock_batch_response.json.return_value = {
            "results": [[[{"id": "HP:0000001", "match_text": "test"}]]]
        }
        mock_batch_response.raise_for_status.return_value = None

        # Mock info response
        mock_info_response = Mock()
        mock_info_response.json.return_value = {"version": "1.0.0"}
        mock_info_response.raise_for_status.return_value = None

        mock_client.post.return_value = mock_batch_response
        mock_client.get.side_effect = [mock_status_response, mock_info_response]

        response = client_with_mocked_dependencies.post(
            "/predictions/test-tool-1/test_corpus/1.0/predict"
        )

        assert response.status_code == 200
        result = response.json()
        assert "Successfully ran tool" in result["message"]
        assert "test_corpus" in result["message"]

    @patch("httpx.AsyncClient")
    def test_run_tool_on_corpus_tool_not_ready(
        self, mock_httpx_client, client_with_mocked_dependencies, test_db_session
    ):
        """Test running a tool when it's not ready."""
        # Create test corpus
        corpus = Corpus(
            name="test_corpus",
            description="Test corpus",
            hpo_version="2023-01-01",
            corpus_version="1.0",
        )
        test_db_session.add(corpus)
        test_db_session.commit()

        # Mock HTTP responses
        mock_client = AsyncMock()
        mock_httpx_client.return_value.__aenter__.return_value = mock_client

        # Mock status response - tool not ready
        mock_status_response = Mock()
        mock_status_response.json.return_value = {"state": "loading"}
        mock_status_response.raise_for_status.return_value = None
        mock_client.get.return_value = mock_status_response

        response = client_with_mocked_dependencies.post(
            "/predictions/test-tool-1/test_corpus/1.0/predict"
        )

        assert response.status_code == 503
        assert "not ready for predictions" in response.json()["detail"]

    @patch("httpx.AsyncClient")
    def test_run_tool_on_corpus_tool_unavailable(
        self, mock_httpx_client, client_with_mocked_dependencies, test_db_session
    ):
        """Test running a tool when it's unavailable."""
        # Create test corpus
        corpus = Corpus(
            name="test_corpus",
            description="Test corpus",
            hpo_version="2023-01-01",
            corpus_version="1.0",
        )
        test_db_session.add(corpus)
        test_db_session.commit()

        # Mock HTTP responses
        mock_client = AsyncMock()
        mock_httpx_client.return_value.__aenter__.return_value = mock_client

        # Mock request error
        mock_client.get.side_effect = httpx.RequestError("Connection failed")

        response = client_with_mocked_dependencies.post(
            "/predictions/test-tool-1/test_corpus/1.0/predict"
        )

        assert response.status_code == 503
        assert "not currently available" in response.json()["detail"]

    def test_run_tool_on_corpus_empty_corpus(
        self, client_with_mocked_dependencies, test_db_session
    ):
        """Test running a tool on an empty corpus."""
        # Create empty corpus
        corpus = Corpus(
            name="empty_corpus",
            description="Empty test corpus",
            hpo_version="2023-01-01",
            corpus_version="1.0",
        )
        test_db_session.add(corpus)
        test_db_session.commit()

        with patch("httpx.AsyncClient") as mock_httpx_client:
            # Mock HTTP responses
            mock_client = AsyncMock()
            mock_httpx_client.return_value.__aenter__.return_value = mock_client

            # Mock status response
            mock_status_response = Mock()
            mock_status_response.json.return_value = {"state": "ready"}
            mock_status_response.raise_for_status.return_value = None
            mock_client.get.return_value = mock_status_response

            response = client_with_mocked_dependencies.post(
                "/predictions/test-tool-1/empty_corpus/1.0/predict"
            )

            assert response.status_code == 404
            assert "No documents found" in response.json()["detail"]

    @patch("httpx.AsyncClient")
    def test_run_tool_on_corpus_batch_predict_error(
        self, mock_httpx_client, client_with_mocked_dependencies, test_db_session
    ):
        """Test handling batch predict errors."""
        # Create test corpus with documents
        corpus = Corpus(
            name="test_corpus",
            description="Test corpus",
            hpo_version="2023-01-01",
            corpus_version="1.0",
        )
        test_db_session.add(corpus)
        test_db_session.commit()
        test_db_session.refresh(corpus)

        # Create test document
        document = CorpusDocument(
            name="test_doc",
            annotator="test_annotator",
            input=ToolInput(sentences=["Test sentence"]),
            output=ToolOutput(results=[[]]),
            corpus_id=corpus.db_id,
        )
        test_db_session.add(document)
        test_db_session.commit()

        # Mock HTTP responses
        mock_client = AsyncMock()
        mock_httpx_client.return_value.__aenter__.return_value = mock_client

        # Mock status response
        mock_status_response = Mock()
        mock_status_response.json.return_value = {"state": "ready"}
        mock_status_response.raise_for_status.return_value = None
        mock_client.get.return_value = mock_status_response

        # Mock batch_predict error
        mock_client.post.side_effect = httpx.RequestError("Batch predict failed")

        response = client_with_mocked_dependencies.post(
            "/predictions/test-tool-1/test_corpus/1.0/predict"
        )

        assert response.status_code == 500
        assert "Error calling tool" in response.json()["detail"]

    @patch("httpx.AsyncClient")
    def test_run_tool_on_corpus_info_error(
        self, mock_httpx_client, client_with_mocked_dependencies, test_db_session
    ):
        """Test handling tool info endpoint errors."""
        # Create test corpus with documents
        corpus = Corpus(
            name="test_corpus",
            description="Test corpus",
            hpo_version="2023-01-01",
            corpus_version="1.0",
        )
        test_db_session.add(corpus)
        test_db_session.commit()
        test_db_session.refresh(corpus)

        # Create test document
        document = CorpusDocument(
            name="test_doc",
            annotator="test_annotator",
            input=ToolInput(sentences=["Test sentence"]),
            output=ToolOutput(results=[[]]),
            corpus_id=corpus.db_id,
        )
        test_db_session.add(document)
        test_db_session.commit()

        # Mock HTTP responses
        mock_client = AsyncMock()
        mock_httpx_client.return_value.__aenter__.return_value = mock_client

        # Mock status response
        mock_status_response = Mock()
        mock_status_response.json.return_value = {"state": "ready"}
        mock_status_response.raise_for_status.return_value = None

        # Mock batch_predict response
        mock_batch_response = Mock()
        mock_batch_response.json.return_value = {"results": [[[]]]}
        mock_batch_response.raise_for_status.return_value = None

        mock_client.get.side_effect = [mock_status_response, httpx.RequestError("Info failed")]
        mock_client.post.return_value = mock_batch_response

        response = client_with_mocked_dependencies.post(
            "/predictions/test-tool-1/test_corpus/1.0/predict"
        )

        assert response.status_code == 500
        assert "Error calling tool" in response.json()["detail"]

    def test_get_predictions_for_corpus_success(
        self, client_with_mocked_dependencies, test_db_session
    ):
        """Test getting predictions for a corpus successfully."""
        # Create test corpus
        corpus = Corpus(
            name="test_corpus",
            description="Test corpus",
            hpo_version="2023-01-01",
            corpus_version="1.0",
        )
        test_db_session.add(corpus)
        test_db_session.commit()
        test_db_session.refresh(corpus)

        # Create test document
        document = CorpusDocument(
            name="test_doc",
            annotator="test_annotator",
            input=ToolInput(sentences=["Test sentence"]),
            output=ToolOutput(results=[[]]),
            corpus_id=corpus.db_id,
        )
        test_db_session.add(document)
        test_db_session.commit()
        test_db_session.refresh(document)

        # Create test prediction
        prediction = Prediction(
            document_id=document.db_id,
            tool_name="test-tool-1",
            tool_version="1.0.0",
            output=ToolOutput(results=[[PhenotypeMatch(id="HP:0000001", match_text="test")]]),
        )
        test_db_session.add(prediction)
        test_db_session.commit()

        response = client_with_mocked_dependencies.get("/predictions/test-tool-1/test_corpus/1.0")

        assert response.status_code == 200
        result = response.json()
        assert len(result) == 1
        assert result[0]["tool_name"] == "test-tool-1"
        assert result[0]["document_id"] == document.db_id

    def test_get_predictions_for_corpus_empty(
        self, client_with_mocked_dependencies, test_db_session
    ):
        """Test getting predictions when none exist."""
        # Create test corpus
        corpus = Corpus(
            name="test_corpus",
            description="Test corpus",
            hpo_version="2023-01-01",
            corpus_version="1.0",
        )
        test_db_session.add(corpus)
        test_db_session.commit()

        response = client_with_mocked_dependencies.get("/predictions/test-tool-1/test_corpus/1.0")

        assert response.status_code == 200
        assert response.json() == []

    def test_get_predictions_for_nonexistent_corpus(self, client_with_mocked_dependencies):
        """Test getting predictions for a nonexistent corpus."""
        response = client_with_mocked_dependencies.get(
            "/predictions/test-tool-1/nonexistent_corpus/1.0"
        )

        assert response.status_code == 404
        assert "nonexistent_corpus" in response.json()["detail"]
        assert "not found" in response.json()["detail"]

    def test_get_predictions_for_nonexistent_tool(
        self, client_with_mocked_dependencies, test_db_session
    ):
        """Test getting predictions for a nonexistent tool."""
        # Create test corpus
        corpus = Corpus(
            name="test_corpus",
            description="Test corpus",
            hpo_version="2023-01-01",
            corpus_version="1.0",
        )
        test_db_session.add(corpus)
        test_db_session.commit()

        response = client_with_mocked_dependencies.get(
            "/predictions/nonexistent-tool/test_corpus/1.0"
        )

        assert response.status_code == 404
        assert "nonexistent-tool" in response.json()["detail"]
        assert "not found" in response.json()["detail"]

    @patch("httpx.AsyncClient")
    def test_run_tool_database_error_rollback(
        self, mock_httpx_client, client_with_mocked_dependencies, test_db_session
    ):
        """Test database error handling and rollback."""
        # Create test corpus with documents
        corpus = Corpus(
            name="test_corpus",
            description="Test corpus",
            hpo_version="2023-01-01",
            corpus_version="1.0",
        )
        test_db_session.add(corpus)
        test_db_session.commit()
        test_db_session.refresh(corpus)

        # Create test document
        document = CorpusDocument(
            name="test_doc",
            annotator="test_annotator",
            input=ToolInput(sentences=["Test sentence"]),
            output=ToolOutput(results=[[]]),
            corpus_id=corpus.db_id,
        )
        test_db_session.add(document)
        test_db_session.commit()

        # Mock HTTP responses
        mock_client = AsyncMock()
        mock_httpx_client.return_value.__aenter__.return_value = mock_client

        # Mock status response
        mock_status_response = Mock()
        mock_status_response.json.return_value = {"state": "ready"}
        mock_status_response.raise_for_status.return_value = None

        # Mock batch_predict response
        mock_batch_response = Mock()
        mock_batch_response.json.return_value = {"results": [[[]]]}
        mock_batch_response.raise_for_status.return_value = None

        # Mock info response
        mock_info_response = Mock()
        mock_info_response.json.return_value = {"version": "1.0.0"}
        mock_info_response.raise_for_status.return_value = None

        mock_client.get.side_effect = [mock_status_response, mock_info_response]
        mock_client.post.return_value = mock_batch_response

        # Mock database session to raise an error during commit
        with patch.object(test_db_session, "commit", side_effect=Exception("Database error")):
            response = client_with_mocked_dependencies.post(
                "/predictions/test-tool-1/test_corpus/1.0/predict"
            )

            assert response.status_code == 500
            assert "Error storing predictions" in response.json()["detail"]

    @patch("httpx.AsyncClient")
    def test_run_tool_on_corpus_error_loading_corpus(
        self, mock_httpx_client, client_with_mocked_dependencies
    ):
        """Covers exception when accessing corpus.entries (Error loading corpus)."""
        # Make tool status ready
        mock_client = AsyncMock()
        mock_httpx_client.return_value.__aenter__.return_value = mock_client
        mock_status_response = Mock()
        mock_status_response.json.return_value = {"state": "ready"}
        mock_status_response.raise_for_status.return_value = None
        mock_client.get.return_value = mock_status_response

        # Override corpus dependency to return an object whose .entries raises
        from app.main import app
        from app.routers.corpora import get_corpus_dependency

        class BadCorpus:
            def __init__(self, name: str):
                self.name = name

            @property
            def entries(self):  # pragma: no cover - error path covered by HTTPException
                raise Exception("relationship failed")

        bad_corpus = BadCorpus("bad_corpus")
        app.dependency_overrides[get_corpus_dependency] = lambda: bad_corpus
        try:
            response = client_with_mocked_dependencies.post(
                "/predictions/test-tool-1/bad_corpus/1.0/predict"
            )
        finally:
            # Clean up only our override; the fixture will clear all at teardown anyway
            app.dependency_overrides.pop(get_corpus_dependency, None)

        assert response.status_code == 500
        assert "Error loading corpus 'bad_corpus'" in response.json()["detail"]
        assert "relationship failed" in response.json()["detail"]

    @patch("httpx.AsyncClient")
    def test_run_tool_on_corpus_error_preparing_batch_input(
        self, mock_httpx_client, client_with_mocked_dependencies, test_db_session
    ):
        """Covers exception when preparing batch input (invalid document input)."""
        # Create corpus and a document with invalid input_internal to trigger validation error
        corpus = Corpus(
            name="bad_input_corpus",
            description="Test corpus",
            hpo_version="2023-01-01",
            corpus_version="1.0",
        )
        test_db_session.add(corpus)
        test_db_session.commit()
        test_db_session.refresh(corpus)

        bad_doc = CorpusDocument(
            name="bad_doc",
            annotator="tester",
            input_internal={"sentences": "not-a-list"},  # invalid type
            output_internal={"results": []},
            corpus_id=corpus.db_id,
        )
        test_db_session.add(bad_doc)
        test_db_session.commit()

        # Make tool status ready
        mock_client = AsyncMock()
        mock_httpx_client.return_value.__aenter__.return_value = mock_client
        mock_status_response = Mock()
        mock_status_response.json.return_value = {"state": "ready"}
        mock_status_response.raise_for_status.return_value = None
        mock_client.get.return_value = mock_status_response

        response = client_with_mocked_dependencies.post(
            "/predictions/test-tool-1/bad_input_corpus/1.0/predict"
        )

        assert response.status_code == 500
        assert "Error preparing batch input" in response.json()["detail"]
