from unittest.mock import patch

from goldmine.types import (
    Corpus,
    CorpusDocument,
    EvaluationResult,
    Metric,
    PhenotypeMatch,
    Prediction,
    ToolInput,
    ToolOutput,
)


class TestMetricsRouter:
    """Test class for metrics router."""

    def test_calculate_evaluation_metrics(self):
        """Test the calculate_evaluation_metrics function."""
        from app.routers.metrics import calculate_evaluation_metrics

        predictions = [
            ["HP:0000001", "HP:0000002"],
            ["HP:0000003"],
            [],
        ]
        ground_truth = [
            ["HP:0000001", "HP:0000002"],
            ["HP:0000003", "HP:0000004"],
            ["HP:0000005"],
        ]

        result = calculate_evaluation_metrics(predictions, ground_truth)

        assert isinstance(result, EvaluationResult)
        assert 0 <= result.accuracy <= 1
        assert 0 <= result.f1 <= 1
        assert 0 <= result.precision <= 1
        assert 0 <= result.recall <= 1
        assert 0 <= result.jaccard <= 1

    @patch("app.routers.metrics.get_predictions_for_corpus")
    def test_calculate_and_store_metrics_success(
        self, mock_get_predictions, client_with_mocked_dependencies, test_db_session
    ):
        """Test calculating and storing metrics successfully."""
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

        # Mock predictions
        mock_predictions = [
            Prediction(
                document_id=document.db_id,
                tool_name="test-tool-1",
                tool_version="1.0.0",
                output=ToolOutput(results=[[PhenotypeMatch(id="HP:0000001", match_text="test")]]),
            )
        ]
        mock_get_predictions.return_value = mock_predictions

        response = client_with_mocked_dependencies.post("/metrics/test-tool-1/test_corpus/1.0")

        assert response.status_code == 200
        result = response.json()
        assert "accuracy" in result
        assert "f1" in result
        assert "precision" in result
        assert "recall" in result
        assert "jaccard" in result

    @patch("app.routers.metrics.get_predictions_for_corpus")
    def test_calculate_and_store_metrics_no_predictions(
        self, mock_get_predictions, client_with_mocked_dependencies, test_db_session
    ):
        """Test calculating metrics when no predictions exist."""
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

        # Mock empty predictions
        mock_get_predictions.return_value = []

        response = client_with_mocked_dependencies.post("/metrics/test-tool-1/test_corpus/1.0")

        assert response.status_code == 404
        assert "No predictions found" in response.json()["detail"]

    def test_get_metrics_success(self, client_with_mocked_dependencies, test_db_session):
        """Test getting metrics successfully."""
        # Create test metric
        metric = Metric(
            tool_name="test-tool-1",
            tool_version="1.0.0",
            corpus_name="test_corpus",
            corpus_version="1.0",
            evaluation_result_internal={
                "accuracy": 0.8,
                "f1": 0.75,
                "precision": 0.7,
                "recall": 0.8,
                "jaccard": 0.65,
            },
        )
        test_db_session.add(metric)
        test_db_session.commit()

        response = client_with_mocked_dependencies.get("/metrics/test-tool-1/test_corpus/1.0")

        assert response.status_code == 200
        result = response.json()
        assert len(result) == 1
        assert result[0]["tool_name"] == "test-tool-1"
        assert result[0]["corpus_name"] == "test_corpus"

    def test_get_metrics_empty(self, client_with_mocked_dependencies):
        """Test getting metrics when none exist."""
        response = client_with_mocked_dependencies.get(
            "/metrics/nonexistent-tool/nonexistent_corpus/1.0"
        )

        assert response.status_code == 200
        assert response.json() == []

    def test_calculate_evaluation_metrics_empty_predictions(self):
        """Test calculating metrics with empty predictions."""
        from app.routers.metrics import calculate_evaluation_metrics

        predictions = [[], [], []]
        ground_truth = [
            ["HP:0000001"],
            ["HP:0000002"],
            ["HP:0000003"],
        ]

        result = calculate_evaluation_metrics(predictions, ground_truth)

        assert isinstance(result, EvaluationResult)
        assert result.accuracy == 0.0
        assert result.precision == 0.0
        assert result.recall == 0.0

    def test_calculate_evaluation_metrics_perfect_match(self):
        """Test calculating metrics with perfect predictions."""
        from app.routers.metrics import calculate_evaluation_metrics

        predictions = [
            ["HP:0000001", "HP:0000002"],
            ["HP:0000003"],
            ["HP:0000004"],
        ]
        ground_truth = [
            ["HP:0000001", "HP:0000002"],
            ["HP:0000003"],
            ["HP:0000004"],
        ]

        result = calculate_evaluation_metrics(predictions, ground_truth)

        assert isinstance(result, EvaluationResult)
        assert result.accuracy == 1.0
        assert result.f1 == 1.0
        assert result.precision == 1.0
        assert result.recall == 1.0
        assert result.jaccard == 1.0

    @patch("app.routers.metrics.get_predictions_for_corpus")
    def test_calculate_metrics_with_missing_document_predictions(
        self, mock_get_predictions, client_with_mocked_dependencies, test_db_session
    ):
        """Test calculating metrics when some documents have no predictions."""
        # Create test corpus with multiple documents
        corpus = Corpus(
            name="test_corpus",
            description="Test corpus",
            hpo_version="2023-01-01",
            corpus_version="1.0",
        )
        test_db_session.add(corpus)
        test_db_session.commit()
        test_db_session.refresh(corpus)

        # Create test documents
        document1 = CorpusDocument(
            name="test_doc1",
            annotator="test_annotator",
            input=ToolInput(sentences=["Test sentence 1"]),
            output=ToolOutput(results=[[PhenotypeMatch(id="HP:0000001", match_text="test1")]]),
            corpus_id=corpus.db_id,
        )
        document2 = CorpusDocument(
            name="test_doc2",
            annotator="test_annotator",
            input=ToolInput(sentences=["Test sentence 2"]),
            output=ToolOutput(results=[[PhenotypeMatch(id="HP:0000002", match_text="test2")]]),
            corpus_id=corpus.db_id,
        )
        test_db_session.add(document1)
        test_db_session.add(document2)
        test_db_session.commit()
        test_db_session.refresh(document1)
        test_db_session.refresh(document2)

        # Mock predictions for only one document
        mock_predictions = [
            Prediction(
                document_id=document1.db_id,
                tool_name="test-tool-1",
                tool_version="1.0.0",
                output=ToolOutput(results=[[PhenotypeMatch(id="HP:0000001", match_text="test1")]]),
            )
        ]
        mock_get_predictions.return_value = mock_predictions

        response = client_with_mocked_dependencies.post("/metrics/test-tool-1/test_corpus/1.0")

        assert response.status_code == 200
        result = response.json()
        assert "accuracy" in result

    @patch("app.routers.metrics.get_predictions_for_corpus")
    def test_calculate_metrics_with_partial_sentence_predictions(
        self, mock_get_predictions, client_with_mocked_dependencies, test_db_session
    ):
        """Test calculating metrics when predictions have fewer sentences than ground truth."""
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

        # Create test document with multiple sentences
        document = CorpusDocument(
            name="test_doc",
            annotator="test_annotator",
            input=ToolInput(sentences=["Test sentence 1", "Test sentence 2"]),
            output=ToolOutput(
                results=[
                    [PhenotypeMatch(id="HP:0000001", match_text="test1")],
                    [PhenotypeMatch(id="HP:0000002", match_text="test2")],
                ]
            ),
            corpus_id=corpus.db_id,
        )
        test_db_session.add(document)
        test_db_session.commit()
        test_db_session.refresh(document)

        # Mock predictions with only one sentence result
        mock_predictions = [
            Prediction(
                document_id=document.db_id,
                tool_name="test-tool-1",
                tool_version="1.0.0",
                output=ToolOutput(results=[[PhenotypeMatch(id="HP:0000001", match_text="test1")]]),
            )
        ]
        mock_get_predictions.return_value = mock_predictions

        response = client_with_mocked_dependencies.post("/metrics/test-tool-1/test_corpus/1.0")

        assert response.status_code == 200
        result = response.json()
        assert "accuracy" in result
