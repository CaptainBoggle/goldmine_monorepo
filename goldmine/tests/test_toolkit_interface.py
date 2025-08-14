import pytest
from unittest.mock import patch
from goldmine.toolkit.interface import ModelInterface
from goldmine.types import (
    ToolState,
    ToolStatus,
    ToolInfo,
    LoadResponse,
    UnloadResponse,
    ToolInput,
    ToolOutput,
    ToolResponse,
    ToolBatchInput,
    ToolBatchResponse,
    PhenotypeMatch,
)


class MockModelInterface(ModelInterface):
    """Mock implementation of ModelInterface for testing."""

    def __init__(self):
        super().__init__()
        self.load_called = False
        self.unload_called = False
        self.predict_called = False
        self.batch_predict_called = False
        self.should_fail_load = False
        self.should_fail_unload = False
        self.should_fail_predict = False

    async def _load_model(self):
        self.load_called = True
        if self.should_fail_load:
            raise RuntimeError("Mock load failure")

    async def _unload_model(self):
        self.unload_called = True
        if self.should_fail_unload:
            raise RuntimeError("Mock unload failure")

    async def _predict(self, input: ToolInput) -> ToolOutput:
        self.predict_called = True
        if self.should_fail_predict:
            raise RuntimeError("Mock predict failure")
        # Return mock predictions
        results = []
        for sentence in input.sentences:
            if "heart" in sentence.lower():
                results.append(
                    [PhenotypeMatch(id="HP:0000001", match_text="heart defect")]
                )
            else:
                results.append([])
        return ToolOutput(results=results)

    def _get_model_info(self) -> ToolInfo:
        return ToolInfo(
            name="Mock Tool",
            version="1.0.0",
            description="A mock tool for testing",
            author="Test Author",
        )


class TestModelInterface:
    """Test class for ModelInterface abstract base class."""

    def test_cannot_instantiate_directly(self):
        """Test that ModelInterface cannot be instantiated directly."""
        with pytest.raises(TypeError):
            ModelInterface()

    def test_initial_state(self):
        """Test initial state of ModelInterface."""
        mock_interface = MockModelInterface()

        assert mock_interface.state == ToolState.UNLOADED
        assert mock_interface.model_loaded is False
        assert mock_interface.error_message is None

    def test_get_status_initial(self):
        """Test get_status returns correct initial status."""
        mock_interface = MockModelInterface()

        status = mock_interface.get_status()

        assert isinstance(status, ToolStatus)
        assert status.state == ToolState.UNLOADED
        assert status.message is None

    def test_get_status_with_error(self):
        """Test get_status returns error message when present."""
        mock_interface = MockModelInterface()
        mock_interface.error_message = "Test error"

        status = mock_interface.get_status()

        assert status.state == ToolState.UNLOADED
        assert status.message == "Test error"

    def test_get_info(self):
        """Test get_info returns tool information."""
        mock_interface = MockModelInterface()

        info = mock_interface.get_info()

        assert isinstance(info, ToolInfo)
        assert info.name == "Mock Tool"
        assert info.version == "1.0.0"
        assert info.description == "A mock tool for testing"
        assert info.author == "Test Author"


class TestModelInterfaceLoad:
    """Test class for model loading functionality."""

    @pytest.mark.asyncio
    async def test_load_success(self):
        """Test successful model loading."""
        mock_interface = MockModelInterface()

        with patch("time.time", side_effect=[0, 1.5]):  # Mock loading time
            response = await mock_interface.load()

        assert isinstance(response, LoadResponse)
        assert response.state == ToolState.READY
        assert response.loading_time == 1.5
        assert response.message == "Model loaded successfully"
        assert mock_interface.model_loaded is True
        assert mock_interface.load_called is True

    @pytest.mark.asyncio
    async def test_load_already_loaded(self):
        """Test loading when model is already loaded."""
        mock_interface = MockModelInterface()
        mock_interface.model_loaded = True

        response = await mock_interface.load()

        assert response.state == ToolState.UNLOADED  # State doesn't change
        assert response.loading_time == 0
        assert response.message == "Model already loaded"
        assert mock_interface.load_called is False  # _load_model not called

    @pytest.mark.asyncio
    async def test_load_failure(self):
        """Test model loading failure."""
        mock_interface = MockModelInterface()
        mock_interface.should_fail_load = True

        with pytest.raises(RuntimeError, match="Mock load failure"):
            await mock_interface.load()

        assert mock_interface.state == ToolState.ERROR
        assert mock_interface.error_message == "Mock load failure"
        assert mock_interface.model_loaded is False


class TestModelInterfaceUnload:
    """Test class for model unloading functionality."""

    @pytest.mark.asyncio
    async def test_unload_success(self):
        """Test successful model unloading."""
        mock_interface = MockModelInterface()
        mock_interface.model_loaded = True
        mock_interface.state = ToolState.READY

        response = await mock_interface.unload()

        assert isinstance(response, UnloadResponse)
        assert response.state == ToolState.UNLOADED
        assert response.message == "Model unloaded successfully"
        assert mock_interface.model_loaded is False
        assert mock_interface.unload_called is True

    @pytest.mark.asyncio
    async def test_unload_already_unloaded(self):
        """Test unloading when model is already unloaded."""
        mock_interface = MockModelInterface()
        # Model starts unloaded by default

        response = await mock_interface.unload()

        assert response.state == ToolState.UNLOADED
        assert response.message == "Model already unloaded"
        assert mock_interface.unload_called is False

    @pytest.mark.asyncio
    async def test_unload_wrong_state(self):
        """Test unloading when model is not in READY state."""
        mock_interface = MockModelInterface()
        mock_interface.model_loaded = True
        mock_interface.state = ToolState.LOADING  # Wrong state

        response = await mock_interface.unload()

        assert response.state == ToolState.LOADING
        assert response.message == "Model can only be unloaded in READY state"
        assert mock_interface.unload_called is False

    @pytest.mark.asyncio
    async def test_unload_failure(self):
        """Test model unloading failure."""
        mock_interface = MockModelInterface()
        mock_interface.model_loaded = True
        mock_interface.state = ToolState.READY
        mock_interface.should_fail_unload = True

        response = await mock_interface.unload()

        assert response.state == ToolState.ERROR
        assert response.message == "Mock unload failure"
        assert mock_interface.model_loaded is False  # Still set to False even on error


class TestModelInterfacePredict:
    """Test class for prediction functionality."""

    @pytest.mark.asyncio
    async def test_predict_success(self):
        """Test successful prediction."""
        mock_interface = MockModelInterface()
        mock_interface.model_loaded = True
        mock_interface.state = ToolState.READY

        input_data = ToolInput(
            sentences=["Patient has heart defect", "No issues found"]
        )

        with patch("time.time", side_effect=[0, 0.5]):  # Mock processing time
            response = await mock_interface.predict(input_data)

        assert isinstance(response, ToolResponse)
        assert len(response.results) == 2
        assert len(response.results[0]) == 1  # Heart defect found
        assert response.results[0][0].id == "HP:0000001"
        assert len(response.results[1]) == 0  # No matches
        assert response.processing_time == 0.5
        assert mock_interface.predict_called is True

    @pytest.mark.asyncio
    async def test_predict_model_not_loaded(self):
        """Test prediction when model is not loaded."""
        mock_interface = MockModelInterface()
        # Model not loaded by default

        input_data = ToolInput(sentences=["Test sentence"])

        with pytest.raises(
            RuntimeError, match="Model must be loaded before prediction"
        ):
            await mock_interface.predict(input_data)

        assert mock_interface.predict_called is False

    @pytest.mark.asyncio
    async def test_predict_model_busy(self):
        """Test prediction when model is busy."""
        mock_interface = MockModelInterface()
        mock_interface.model_loaded = True
        mock_interface.state = ToolState.BUSY

        input_data = ToolInput(sentences=["Test sentence"])

        with pytest.raises(RuntimeError, match="Model is currently busy"):
            await mock_interface.predict(input_data)

        assert mock_interface.predict_called is False

    @pytest.mark.asyncio
    async def test_predict_failure(self):
        """Test prediction failure."""
        mock_interface = MockModelInterface()
        mock_interface.model_loaded = True
        mock_interface.state = ToolState.READY
        mock_interface.should_fail_predict = True

        input_data = ToolInput(sentences=["Test sentence"])

        with pytest.raises(RuntimeError, match="Mock predict failure"):
            await mock_interface.predict(input_data)

        assert mock_interface.state == ToolState.ERROR
        assert mock_interface.error_message == "Mock predict failure"


class TestModelInterfaceBatchPredict:
    """Test class for batch prediction functionality."""

    @pytest.mark.asyncio
    async def test_batch_predict_success(self):
        """Test successful batch prediction."""
        mock_interface = MockModelInterface()
        mock_interface.model_loaded = True
        mock_interface.state = ToolState.READY

        batch_input = ToolBatchInput(
            documents=[
                ["Patient has heart defect", "No issues"],
                ["Another heart problem"],
            ]
        )

        with patch("time.time", side_effect=[0, 1.0]):  # Mock processing time
            response = await mock_interface.batch_predict(batch_input)

        assert isinstance(response, ToolBatchResponse)
        assert len(response.results) == 2  # Two documents
        assert len(response.results[0]) == 2  # Two sentences in first doc
        assert len(response.results[1]) == 1  # One sentence in second doc
        assert response.processing_time == 1.0

    @pytest.mark.asyncio
    async def test_batch_predict_model_not_loaded(self):
        """Test batch prediction when model is not loaded."""
        mock_interface = MockModelInterface()
        batch_input = ToolBatchInput(documents=[["Test sentence"]])

        with pytest.raises(
            RuntimeError, match="Model must be loaded before prediction"
        ):
            await mock_interface.batch_predict(batch_input)

    @pytest.mark.asyncio
    async def test_batch_predict_model_busy(self):
        """Test batch prediction when model is busy."""
        mock_interface = MockModelInterface()
        mock_interface.model_loaded = True
        mock_interface.state = ToolState.BUSY

        batch_input = ToolBatchInput(documents=[["Test sentence"]])

        with pytest.raises(RuntimeError, match="Model is currently busy"):
            await mock_interface.batch_predict(batch_input)

    @pytest.mark.asyncio
    async def test_batch_predict_empty_documents(self):
        """Test batch prediction with empty documents."""
        mock_interface = MockModelInterface()
        mock_interface.model_loaded = True
        mock_interface.state = ToolState.READY

        batch_input = ToolBatchInput(documents=[])

        response = await mock_interface.batch_predict(batch_input)

        assert len(response.results) == 0

    @pytest.mark.asyncio
    async def test_batch_predict_failure(self):
        """Test batch prediction failure."""
        mock_interface = MockModelInterface()
        mock_interface.model_loaded = True
        mock_interface.state = ToolState.READY
        mock_interface.should_fail_predict = True

        batch_input = ToolBatchInput(documents=[["Test sentence"]])

        with pytest.raises(RuntimeError, match="Mock predict failure"):
            await mock_interface.batch_predict(batch_input)

        assert mock_interface.state == ToolState.ERROR


class TestModelInterfaceDefaultBatchPredict:
    """Test class for default batch predict implementation."""

    class MinimalModelInterface(ModelInterface):
        """Minimal implementation that doesn't override _batch_predict."""

        async def _load_model(self):
            pass  # pragma: no cover

        async def _unload_model(self):
            pass  # pragma: no cover

        async def _predict(self, input: ToolInput) -> ToolOutput:
            # Simple mock that returns one match per sentence
            results = []
            for i, sentence in enumerate(input.sentences):
                if i % 2 == 0:  # Even indices get matches
                    results.append(
                        [
                            PhenotypeMatch(
                                id=f"HP:000000{i + 1}", match_text=f"match{i + 1}"
                            )
                        ]
                    )
                else:
                    results.append([])
            return ToolOutput(results=results)

        def _get_model_info(self) -> ToolInfo:
            return ToolInfo(
                name="Minimal", version="1.0", description="Test", author="Test"
            )

    @pytest.mark.asyncio
    async def test_default_batch_predict_implementation(self):
        """Test the default _batch_predict implementation."""
        interface = self.MinimalModelInterface()

        # validate model works
        assert interface._get_model_info().name == "Minimal"

        interface.model_loaded = True
        interface.state = ToolState.READY

        batch_input = ToolBatchInput(
            documents=[
                ["First sentence", "Second sentence"],
                ["Third sentence", "Fourth sentence", "Fifth sentence"],
            ]
        )

        response = await interface.batch_predict(batch_input)

        # Check structure
        assert len(response.results) == 2  # Two documents
        assert len(response.results[0]) == 2  # Two sentences in first doc
        assert len(response.results[1]) == 3  # Three sentences in second doc

        # Check predictions (even indices get matches)
        assert len(response.results[0][0]) == 1  # First sentence (index 0) has match
        assert len(response.results[0][1]) == 0  # Second sentence (index 1) no match
        assert (
            len(response.results[1][0]) == 1
        )  # Third sentence (index 0 in doc) has match
        assert (
            len(response.results[1][1]) == 0
        )  # Fourth sentence (index 1 in doc) no match
        assert (
            len(response.results[1][2]) == 1
        )  # Fifth sentence (index 2 in doc) has match


class TestModelInterfaceStateManagement:
    """Test class for state management edge cases."""

    @pytest.mark.asyncio
    async def test_state_transitions_during_load(self):
        """Test state transitions during loading."""
        mock_interface = MockModelInterface()

        # Check initial state
        assert mock_interface.state == ToolState.UNLOADED

        # Mock _load_model to check intermediate state
        original_load = mock_interface._load_model

        async def check_state_load():
            assert mock_interface.state == ToolState.LOADING
            await original_load()

        mock_interface._load_model = check_state_load

        await mock_interface.load()

        assert mock_interface.state == ToolState.READY

    @pytest.mark.asyncio
    async def test_state_transitions_during_unload(self):
        """Test state transitions during unloading."""
        mock_interface = MockModelInterface()
        mock_interface.model_loaded = True
        mock_interface.state = ToolState.READY

        # Mock _unload_model to check intermediate state
        original_unload = mock_interface._unload_model

        async def check_state_unload():
            assert mock_interface.state == ToolState.UNLOADING
            await original_unload()

        mock_interface._unload_model = check_state_unload

        await mock_interface.unload()

        assert mock_interface.state == ToolState.UNLOADED

    @pytest.mark.asyncio
    async def test_error_state_persists(self):
        """Test that error state persists after failure."""
        mock_interface = MockModelInterface()
        mock_interface.should_fail_load = True

        with pytest.raises(RuntimeError):
            await mock_interface.load()

        # State should remain ERROR
        assert mock_interface.state == ToolState.ERROR

        # Status should show error
        status = mock_interface.get_status()
        assert status.state == ToolState.ERROR
        assert status.message == "Mock load failure"
