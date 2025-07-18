import time
from abc import ABC, abstractmethod

from goldmine.types import (
    LoadResponse,
    ToolInfo,
    ToolInput,
    ToolOutput,
    ToolResponse,
    ToolBatchInput,
    ToolBatchOutput,
    ToolBatchResponse,
    ToolState,
    ToolStatus,
    UnloadResponse,
)


class ModelInterface(ABC):
    """
    Abstract base class for all phenotype identification model containers.
    Concrete model implementations must inherit from this and implement the required methods.
    """

    def __init__(self):
        self.state = ToolState.UNLOADED
        self.model_loaded = False
        self.error_message = None

    @abstractmethod
    async def _load_model(self):
        """
        Load the model into memory.
        """
        pass

    @abstractmethod
    async def _unload_model(self):
        """
        Unload the model from memory.

        """
        pass

    @abstractmethod
    async def _predict(self, input: ToolInput) -> ToolOutput:
        """
        Run prediction on a list of sentences.
        Should return a list of lists of PhenotypeMatch objects (one list per sentence).
        """
        pass
    
    async def _batch_predict(self, input: ToolBatchInput) -> ToolBatchOutput:
        """
        Run prediction on a list of documents. A document is a list of sentences.
        """
        processed_documents = []
        for d in input.documents:
            output = await self._predict(ToolInput(sentences=d))
            processed_documents.append(output.results)
        return ToolBatchOutput(results=processed_documents)

    @abstractmethod
    def _get_model_info(self) -> ToolInfo:
        """
        Return information about this tool.
        """
        pass

    # --- Standardised API methods below ---

    async def load(self) -> LoadResponse:
        """
        Public method to load the model, used by the API layer.
        """
        if self.model_loaded:
            return LoadResponse(state=self.state, message="Model already loaded", loading_time=0)
        try:
            self.state = ToolState.LOADING
            start_time = time.time()
            await self._load_model()
            self.model_loaded = True
            self.state = ToolState.READY
            return LoadResponse(
                state=self.state,
                loading_time=time.time() - start_time,
                message="Model loaded successfully",
            )
        except Exception as e:
            self.state = ToolState.ERROR
            self.error_message = str(e)
            raise

    async def unload(self) -> UnloadResponse:
        """
        Public method to unload the model, used by the API layer.
        """
        if not self.model_loaded:
            return UnloadResponse(state=self.state, message="Model already unloaded")

        if self.state != ToolState.READY:
            return UnloadResponse(
                state=self.state, message="Model can only be unloaded in READY state"
            )

        try:
            self.model_loaded = False
            self.state = ToolState.UNLOADING
            await self._unload_model()
            self.state = ToolState.UNLOADED
            return UnloadResponse(state=self.state, message="Model unloaded successfully")
        except Exception as e:
            self.state = ToolState.ERROR
            self.error_message = str(e)
            return UnloadResponse(state=self.state, message=self.error_message)

    async def predict(self, input_data: ToolInput) -> ToolResponse:
        """
        Public method to run prediction, used by the API layer.
        """
        if not self.model_loaded:
            raise RuntimeError("Model must be loaded before prediction")

        # TODO: should we allow predictions while busy?
        # If the model is busy, we could either queue the request or reject it.
        # Rejecting for now
        if self.state == ToolState.BUSY:
            raise RuntimeError("Model is currently busy, please try again later")

        start_time = time.time()
        try:
            output = await self._predict(input_data)
            processing_time = time.time() - start_time
            return ToolResponse(results=output.results, processing_time=processing_time)
        except Exception as e:
            self.state = ToolState.ERROR
            self.error_message = str(e)
            raise

    
    async def batch_predict(self, input_data: ToolBatchInput) -> ToolBatchResponse:
        """
        Public method to run prediction, used by the API layer.
        """
        if not self.model_loaded:
            raise RuntimeError("Model must be loaded before prediction")

        if self.state == ToolState.BUSY:
            raise RuntimeError("Model is currently busy, please try again later")

        start_time = time.time()
        try:
            output = await self._batch_predict(input_data)
            processing_time = time.time() - start_time
            return ToolBatchResponse(results=output.results, processing_time=processing_time)
        except Exception as e:
            self.state = ToolState.ERROR
            self.error_message = str(e)
            raise


    def get_status(self) -> ToolStatus:
        """
        Public method to get tool status, used by the API layer.
        """
        return ToolStatus(
            state=self.state, message=self.error_message if self.error_message else None
        )

    def get_info(self) -> ToolInfo:
        """
        Public method to get tool info, used by the API layer.
        """
        return self._get_model_info()
