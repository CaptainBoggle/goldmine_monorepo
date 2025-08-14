import pytest
from pydantic import ValidationError

from goldmine.types import (
    PhenotypeMatch,
    ToolState,
    ToolInput,
    ToolOutput,
    ToolResponse,
    ToolBatchInput,
    ToolBatchOutput,
    ToolBatchResponse,
    ToolInfo,
    ToolStatus,
    LoadResponse,
    UnloadResponse,
    ExternalRecommenderDocument,
    ExternalRecommenderMetadata,
    ExternalRecommenderPredictRequest,
    ExternalRecommenderPredictResponse,
    ToolDiscoveryInfo,
    CorpusDocument,
    Corpus,
    Prediction,
    EvaluationResult,
    Metric,
)


class TestPhenotypeMatch:
    """Test class for PhenotypeMatch."""

    def test_valid_hpo_id(self):
        """Test creation with valid HPO ID."""
        match = PhenotypeMatch(id="HP:0000001", match_text="heart defect")
        assert match.id == "HP:0000001"
        assert match.match_text == "heart defect"

    def test_valid_hpo_id_with_default_match_text(self):
        """Test creation with valid HPO ID and default match text."""
        match = PhenotypeMatch(id="HP:0000001")
        assert match.id == "HP:0000001"
        assert match.match_text == ""

    def test_invalid_hpo_id_format(self):
        """Test validation error with invalid HPO ID format."""
        with pytest.raises(ValidationError) as exc_info:
            PhenotypeMatch(id="INVALID:0000001", match_text="heart defect")

        error = exc_info.value.errors()[0]
        assert error["type"] == "value_error"
        assert "CURIE format" in error["msg"]

    def test_invalid_hpo_id_without_prefix(self):
        """Test validation error with HPO ID without proper prefix."""
        with pytest.raises(ValidationError):
            PhenotypeMatch(id="0000001", match_text="heart defect")

    def test_invalid_hpo_id_wrong_prefix(self):
        """Test validation error with wrong prefix."""
        with pytest.raises(ValidationError):
            PhenotypeMatch(id="MP:0000001", match_text="heart defect")

    def test_hpo_id_with_letters_in_number(self):
        """Test validation error with letters in the number part."""
        with pytest.raises(ValidationError):
            PhenotypeMatch(id="HP:00000A1", match_text="heart defect")


class TestToolState:
    """Test class for ToolState enum."""

    def test_tool_state_values(self):
        """Test that all expected tool states exist."""
        assert ToolState.READY == "ready"
        assert ToolState.BUSY == "busy"
        assert ToolState.LOADING == "loading"
        assert ToolState.UNLOADING == "unloading"
        assert ToolState.ERROR == "error"
        assert ToolState.UNLOADED == "unloaded"


class TestToolInput:
    """Test class for ToolInput."""

    def test_valid_tool_input(self):
        """Test creation with valid sentences."""
        input_data = ToolInput(sentences=["Sentence 1", "Sentence 2"])
        assert input_data.sentences == ["Sentence 1", "Sentence 2"]

    def test_empty_sentences_list(self):
        """Test creation with empty sentences list."""
        input_data = ToolInput(sentences=[])
        assert input_data.sentences == []

    def test_sentences_field_required(self):
        """Test that sentences field is required."""
        # This test just ensures the field is required by creating valid input
        input_data = ToolInput(sentences=["test"])
        assert input_data.sentences == ["test"]


class TestToolOutput:
    """Test class for ToolOutput."""

    def test_valid_tool_output(self):
        """Test creation with valid results."""
        matches = [PhenotypeMatch(id="HP:0000001", match_text="heart defect")]
        output = ToolOutput(results=[matches, []])
        assert len(output.results) == 2
        assert len(output.results[0]) == 1
        assert len(output.results[1]) == 0
        assert output.results[0][0].id == "HP:0000001"

    def test_empty_results(self):
        """Test creation with empty results."""
        output = ToolOutput(results=[])
        assert output.results == []


class TestToolResponse:
    """Test class for ToolResponse."""

    def test_tool_response_with_processing_time(self):
        """Test creation with processing time."""
        matches = [PhenotypeMatch(id="HP:0000001", match_text="heart defect")]
        response = ToolResponse(results=[matches], processing_time=1.5)
        assert response.processing_time == 1.5
        assert len(response.results) == 1

    def test_tool_response_without_processing_time(self):
        """Test creation without processing time."""
        matches = [PhenotypeMatch(id="HP:0000001", match_text="heart defect")]
        response = ToolResponse(results=[matches])
        assert response.processing_time is None


class TestToolBatchInput:
    """Test class for ToolBatchInput."""

    def test_valid_batch_input(self):
        """Test creation with valid documents."""
        documents = [["Sentence 1", "Sentence 2"], ["Sentence 3"]]
        batch_input = ToolBatchInput(documents=documents)
        assert batch_input.documents == documents

    def test_empty_batch_input(self):
        """Test creation with empty documents."""
        batch_input = ToolBatchInput(documents=[])
        assert batch_input.documents == []


class TestToolBatchOutput:
    """Test class for ToolBatchOutput."""

    def test_valid_batch_output(self):
        """Test creation with valid batch results."""
        matches = [PhenotypeMatch(id="HP:0000001", match_text="heart defect")]
        batch_output = ToolBatchOutput(results=[[matches, []]])
        assert len(batch_output.results) == 1
        assert len(batch_output.results[0]) == 2
        assert len(batch_output.results[0][0]) == 1


class TestToolBatchResponse:
    """Test class for ToolBatchResponse."""

    def test_batch_response_with_processing_time(self):
        """Test creation with processing time."""
        matches = [PhenotypeMatch(id="HP:0000001", match_text="heart defect")]
        response = ToolBatchResponse(results=[[matches]], processing_time=2.5)
        assert response.processing_time == 2.5


class TestToolInfo:
    """Test class for ToolInfo."""

    def test_valid_tool_info(self):
        """Test creation with all required fields."""
        info = ToolInfo(
            name="Test Tool",
            version="1.0.0",
            description="A test tool",
            author="Test Author",
        )
        assert info.name == "Test Tool"
        assert info.version == "1.0.0"
        assert info.description == "A test tool"
        assert info.author == "Test Author"

    def test_missing_required_fields(self):
        """Test that all fields are required."""
        # All fields are required, so let's test a complete valid case
        info = ToolInfo(
            name="Test Tool", version="1.0.0", description="test", author="test"
        )
        assert info.name == "Test Tool"


class TestToolStatus:
    """Test class for ToolStatus."""

    def test_tool_status_with_message(self):
        """Test creation with state and message."""
        status = ToolStatus(state=ToolState.READY, message="Tool is ready")
        assert status.state == ToolState.READY
        assert status.message == "Tool is ready"

    def test_tool_status_without_message(self):
        """Test creation with only state."""
        status = ToolStatus(state=ToolState.ERROR)
        assert status.state == ToolState.ERROR
        assert status.message is None


class TestLoadResponse:
    """Test class for LoadResponse."""

    def test_load_response_with_all_fields(self):
        """Test creation with all fields."""
        response = LoadResponse(
            state=ToolState.READY, loading_time=2.5, message="Model loaded successfully"
        )
        assert response.state == ToolState.READY
        assert response.loading_time == 2.5
        assert response.message == "Model loaded successfully"

    def test_load_response_with_default_loading_time(self):
        """Test creation with default loading time."""
        response = LoadResponse(state=ToolState.READY)
        assert response.loading_time == 0
        assert response.message is None


class TestUnloadResponse:
    """Test class for UnloadResponse."""

    def test_unload_response(self):
        """Test creation of unload response."""
        response = UnloadResponse(
            state=ToolState.UNLOADED, message="Model unloaded successfully"
        )
        assert response.state == ToolState.UNLOADED
        assert response.message == "Model unloaded successfully"


class TestExternalRecommenderModels:
    """Test class for External Recommender API models."""

    def test_external_recommender_document(self):
        """Test creation of external recommender document."""
        doc = ExternalRecommenderDocument(
            document_id=123, user_id="user123", xmi="<xmi>test</xmi>"
        )
        assert doc.document_id == 123
        assert doc.user_id == "user123"
        assert doc.xmi == "<xmi>test</xmi>"

    def test_external_recommender_document_with_aliases(self):
        """Test creation using field aliases."""
        doc = ExternalRecommenderDocument(documentId=123, userId="user123")
        assert doc.document_id == 123
        assert doc.user_id == "user123"

    def test_external_recommender_metadata(self):
        """Test creation of external recommender metadata."""
        metadata = ExternalRecommenderMetadata(
            layer="test.layer",
            feature="testFeature",
            project_id=456,
            anchoring_mode="characters",
            cross_sentence=True,
        )
        assert metadata.layer == "test.layer"
        assert metadata.feature == "testFeature"
        assert metadata.project_id == 456

    def test_external_recommender_metadata_with_aliases(self):
        """Test creation using field aliases."""
        metadata = ExternalRecommenderMetadata(
            layer="test.layer",
            feature="testFeature",
            projectId=456,
            anchoringMode="characters",
            crossSentence=True,
        )
        assert metadata.project_id == 456
        assert metadata.anchoring_mode == "characters"
        assert metadata.cross_sentence is True

    def test_external_recommender_predict_request(self):
        """Test creation of predict request."""
        doc = ExternalRecommenderDocument(document_id=123)
        metadata = ExternalRecommenderMetadata(
            layer="test.layer",
            feature="testFeature",
            project_id=456,
            anchoring_mode="characters",
            cross_sentence=True,
        )
        request = ExternalRecommenderPredictRequest(
            document=doc,
            request_metadata=metadata,
            type_system="<typeSystem>test</typeSystem>",
        )
        assert request.document == doc
        assert request.request_metadata == metadata
        assert request.type_system == "<typeSystem>test</typeSystem>"

    def test_external_recommender_predict_response(self):
        """Test creation of predict response."""
        response = ExternalRecommenderPredictResponse(
            document="<xmi>annotated document</xmi>"
        )
        assert response.document == "<xmi>annotated document</xmi>"


class TestToolDiscoveryInfo:
    """Test class for ToolDiscoveryInfo."""

    def test_tool_discovery_info(self):
        """Test creation of tool discovery info."""
        info = ToolDiscoveryInfo(
            id="test-tool",
            container_name="test-tool-container",
            port=8000,
            endpoint="http://test-tool:8000",
            external_port=8001,
        )
        assert info.id == "test-tool"
        assert info.container_name == "test-tool-container"
        assert info.port == 8000
        assert info.endpoint == "http://test-tool:8000"
        assert info.external_port == 8001


class TestCorpusDocument:
    """Test class for CorpusDocument."""

    @pytest.fixture
    def sample_tool_input(self):
        """Sample tool input for testing."""
        return ToolInput(sentences=["Test sentence"])

    @pytest.fixture
    def sample_tool_output(self):
        """Sample tool output for testing."""
        return ToolOutput(
            results=[[PhenotypeMatch(id="HP:0000001", match_text="test")]]
        )

    def test_corpus_document_creation_with_objects(
        self, sample_tool_input, sample_tool_output
    ):
        """Test creation with ToolInput and ToolOutput objects."""
        doc = CorpusDocument(
            name="test_doc",
            annotator="test_annotator",
            input=sample_tool_input,
            output=sample_tool_output,
        )
        assert doc.name == "test_doc"
        assert doc.annotator == "test_annotator"
        assert doc.input.sentences == ["Test sentence"]
        assert len(doc.output.results[0]) == 1
        assert doc.output.results[0][0].id == "HP:0000001"

    def test_corpus_document_creation_with_raw_data(self):
        """Test creation with raw dictionary data."""
        input_data = {"sentences": ["Test sentence"]}
        output_data = {"results": [[{"id": "HP:0000001", "match_text": "test"}]]}

        doc = CorpusDocument(
            name="test_doc", input_internal=input_data, output_internal=output_data
        )
        assert doc.input.sentences == ["Test sentence"]
        assert len(doc.output.results[0]) == 1

    def test_corpus_document_default_values(self):
        """Test creation with default values."""
        doc = CorpusDocument(name="test_doc")
        assert doc.annotator == "Unknown"
        assert doc.input.sentences == []
        assert doc.output.results == []

    def test_corpus_document_input_setter(self, sample_tool_input):
        """Test setting input property."""
        doc = CorpusDocument(name="test_doc")
        doc.input = sample_tool_input
        assert doc.input.sentences == ["Test sentence"]
        assert doc.input_internal == {"sentences": ["Test sentence"]}

    def test_corpus_document_output_setter(self, sample_tool_output):
        """Test setting output property."""
        doc = CorpusDocument(name="test_doc")
        doc.output = sample_tool_output
        assert len(doc.output.results[0]) == 1
        assert doc.output.results[0][0].id == "HP:0000001"

    def test_annotation_count_property(self, sample_tool_output):
        """Test annotation count computed property."""
        doc = CorpusDocument(name="test_doc", output=sample_tool_output)
        assert doc.annotation_count == 1

    def test_annotation_count_multiple_sentences(self):
        """Test annotation count with multiple sentences."""
        output = ToolOutput(
            results=[
                [PhenotypeMatch(id="HP:0000001", match_text="test1")],
                [
                    PhenotypeMatch(id="HP:0000002", match_text="test2"),
                    PhenotypeMatch(id="HP:0000003", match_text="test3"),
                ],
                [],
            ]
        )
        doc = CorpusDocument(name="test_doc", output=output)
        assert doc.annotation_count == 3


class TestCorpus:
    """Test class for Corpus."""

    def test_corpus_creation(self):
        """Test creation of corpus."""
        corpus = Corpus(
            name="test_corpus",
            description="Test corpus",
            hpo_version="2023-01-01",
            corpus_version="1.0",
        )
        assert corpus.name == "test_corpus"
        assert corpus.description == "Test corpus"
        assert corpus.hpo_version == "2023-01-01"
        assert corpus.corpus_version == "1.0"

    def test_corpus_default_version(self):
        """Test default corpus version."""
        corpus = Corpus(name="test_corpus", hpo_version="2023-01-01")
        assert corpus.corpus_version == "1.0"
        assert corpus.description is None

    def test_corpus_document_count_empty(self):
        """Test document count for empty corpus."""
        corpus = Corpus(name="test_corpus", hpo_version="2023-01-01")
        assert corpus.document_count == 0

    def test_corpus_total_annotations_empty(self):
        """Test total annotations for empty corpus."""
        corpus = Corpus(name="test_corpus", hpo_version="2023-01-01")
        assert corpus.total_annotations == 0


class TestPrediction:
    """Test class for Prediction."""

    @pytest.fixture
    def sample_tool_output(self):
        """Sample tool output for testing."""
        return ToolOutput(
            results=[[PhenotypeMatch(id="HP:0000001", match_text="test")]]
        )

    def test_prediction_creation_with_object(self, sample_tool_output):
        """Test creation with ToolOutput object."""
        prediction = Prediction(
            tool_name="test_tool", tool_version="1.0.0", output=sample_tool_output
        )
        assert prediction.tool_name == "test_tool"
        assert prediction.tool_version == "1.0.0"
        assert len(prediction.output.results[0]) == 1

    def test_prediction_creation_with_raw_data(self):
        """Test creation with raw dictionary data."""
        output_data = {"results": [[{"id": "HP:0000001", "match_text": "test"}]]}

        prediction = Prediction(
            tool_name="test_tool", tool_version="1.0.0", output_internal=output_data
        )
        assert len(prediction.output.results[0]) == 1

    def test_prediction_output_setter(self, sample_tool_output):
        """Test setting output property."""
        prediction = Prediction(tool_name="test_tool", tool_version="1.0.0")
        prediction.output = sample_tool_output
        assert len(prediction.output.results[0]) == 1
        assert prediction.output.results[0][0].id == "HP:0000001"

    def test_prediction_default_output(self):
        """Test default output value."""
        prediction = Prediction(tool_name="test_tool", tool_version="1.0.0")
        assert prediction.output.results == []


class TestEvaluationResult:
    """Test class for EvaluationResult."""

    def test_evaluation_result_creation(self):
        """Test creation of evaluation result."""
        result = EvaluationResult(
            accuracy=0.95, f1=0.92, precision=0.90, recall=0.94, jaccard=0.88
        )
        assert result.accuracy == 0.95
        assert result.f1 == 0.92
        assert result.precision == 0.90
        assert result.recall == 0.94
        assert result.jaccard == 0.88

    def test_evaluation_result_missing_fields(self):
        """Test validation error when required fields are missing."""
        with pytest.raises(ValidationError):
            EvaluationResult(accuracy=0.95, f1=0.92)


class TestMetric:
    """Test class for Metric."""

    @pytest.fixture
    def sample_evaluation_result(self):
        """Sample evaluation result for testing."""
        return EvaluationResult(
            accuracy=0.95, f1=0.92, precision=0.90, recall=0.94, jaccard=0.88
        )

    def test_metric_creation(self, sample_evaluation_result):
        """Test creation of metric."""
        metric = Metric(
            tool_name="test_tool",
            tool_version="1.0.0",
            corpus_name="test_corpus",
            corpus_version="1.0",
        )
        metric.evaluation_result = sample_evaluation_result

        assert metric.tool_name == "test_tool"
        assert metric.tool_version == "1.0.0"
        assert metric.corpus_name == "test_corpus"
        assert metric.corpus_version == "1.0"
        assert metric.evaluation_result.accuracy == 0.95

    def test_metric_evaluation_result_setter(self, sample_evaluation_result):
        """Test setting evaluation result."""
        metric = Metric(
            tool_name="test_tool",
            tool_version="1.0.0",
            corpus_name="test_corpus",
            corpus_version="1.0",
        )
        metric.evaluation_result = sample_evaluation_result

        # Check that internal data is stored correctly
        assert "accuracy" in metric.evaluation_result_internal
        assert metric.evaluation_result_internal["accuracy"] == 0.95


class TestDatabaseIntegration:
    """Test class for database integration."""

    def test_corpus_document_database_roundtrip(self, test_db_session):
        """Test saving and loading CorpusDocument to/from database."""
        input_data = ToolInput(sentences=["Test sentence"])
        output_data = ToolOutput(
            results=[[PhenotypeMatch(id="HP:0000001", match_text="test")]]
        )

        doc = CorpusDocument(
            name="test_doc",
            annotator="test_annotator",
            input=input_data,
            output=output_data,
        )

        test_db_session.add(doc)
        test_db_session.commit()
        test_db_session.refresh(doc)

        # Retrieve from database
        retrieved_doc = test_db_session.get(CorpusDocument, doc.db_id)
        assert retrieved_doc.name == "test_doc"
        assert retrieved_doc.input.sentences == ["Test sentence"]
        assert len(retrieved_doc.output.results[0]) == 1

    def test_corpus_database_roundtrip(self, test_db_session):
        """Test saving and loading Corpus to/from database."""
        corpus = Corpus(
            name="test_corpus",
            description="Test corpus",
            hpo_version="2023-01-01",
            corpus_version="1.0",
        )

        test_db_session.add(corpus)
        test_db_session.commit()
        test_db_session.refresh(corpus)

        # Retrieve from database
        retrieved_corpus = test_db_session.get(Corpus, corpus.db_id)
        assert retrieved_corpus.name == "test_corpus"
        assert retrieved_corpus.description == "Test corpus"

    def test_prediction_database_roundtrip(self, test_db_session):
        """Test saving and loading Prediction to/from database."""
        output_data = ToolOutput(
            results=[[PhenotypeMatch(id="HP:0000001", match_text="test")]]
        )

        prediction = Prediction(
            tool_name="test_tool", tool_version="1.0.0", output=output_data
        )

        test_db_session.add(prediction)
        test_db_session.commit()
        test_db_session.refresh(prediction)

        # Retrieve from database
        retrieved_prediction = test_db_session.get(Prediction, prediction.db_id)
        assert retrieved_prediction.tool_name == "test_tool"
        assert len(retrieved_prediction.output.results[0]) == 1

    def test_metric_database_roundtrip(self, test_db_session):
        """Test saving and loading Metric to/from database."""
        evaluation_result = EvaluationResult(
            accuracy=0.95, f1=0.92, precision=0.90, recall=0.94, jaccard=0.88
        )

        metric = Metric(
            tool_name="test_tool",
            tool_version="1.0.0",
            corpus_name="test_corpus",
            corpus_version="1.0",
        )
        metric.evaluation_result = evaluation_result

        test_db_session.add(metric)
        test_db_session.commit()
        test_db_session.refresh(metric)

        # Retrieve from database
        retrieved_metric = test_db_session.get(Metric, metric.db_id)
        assert retrieved_metric.evaluation_result.accuracy == 0.95
