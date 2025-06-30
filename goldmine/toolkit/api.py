from fastapi import FastAPI, HTTPException

from goldmine.toolkit.interface import ModelInterface

from ..types import LoadResponse, ToolInfo, ToolInput, ToolResponse, ToolStatus


def create_app(model_implementation: ModelInterface):
    """
    Creates a standard FastAPI application for a model tool.
    This acts as the web layer, handling HTTP requests and responses.
    """

    app = FastAPI(
        title="Goldmine Tool API",
        description="Standard API for Goldmine tool containers",
        version="1.0.0",
    )

    @app.get("/status", response_model=ToolStatus)
    async def get_status():
        """Get the current status of the tool, doubles as a health check."""
        return model_implementation.get_status()

    @app.get("/info", response_model=ToolInfo)
    async def get_info():
        """Get detailed information about the tool."""
        return model_implementation.get_info()

    @app.post("/load", response_model=LoadResponse)
    async def load_model():
        """
        Load the model into memory. This is a blocking call that will wait
        for the model to be fully loaded before returning a response.
        """
        try:
            return await model_implementation.load()
        except HTTPException as e:
            raise e
        except Exception as e:
            raise HTTPException(
                status_code=500, detail=f"An unexpected error occurred during loading: {str(e)}"
            )

    @app.post("/unload")
    async def unload_model():
        """Unload the model from memory to free up resources."""
        try:
            return await model_implementation.unload()
        except Exception as e:
            raise HTTPException(
                status_code=500, detail=f"An unexpected error occurred during unloading: {str(e)}"
            )

    @app.post("/predict", response_model=ToolResponse)
    async def predict(input_data: ToolInput) -> ToolResponse:
        """
        Process a list of sentences to identify phenotype IDs.
        This endpoint will automatically load the model if it's not already loaded.
        """
        try:
            return await model_implementation.predict(input_data)

        except HTTPException as e:
            raise e
        except Exception as e:
            raise HTTPException(
                status_code=500, detail=f"An unexpected error occurred during prediction: {str(e)}"
            )

    return app
