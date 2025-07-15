from fastapi import FastAPI, HTTPException

from goldmine.toolkit.interface import ModelInterface

from ..types import (
    ExternalRecommenderPredictRequest,
    ExternalRecommenderPredictResponse,
    LoadResponse,
    ToolInfo,
    ToolInput,
    ToolResponse,
    ToolStatus,
)


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

    @app.post("/external-recommender/predict")
    async def external_recommender_predict(
        request: ExternalRecommenderPredictRequest,
    ) -> ExternalRecommenderPredictResponse:
        """
        INCEpTION External Recommender API endpoint.
        This endpoint follows the INCEpTION specification for external recommenders.
        """
        try:
            # TODO: Implement the logic to handle the external recommender request
            # see https://inception-project.github.io/releases/37.1/docs/developer-guide.html#_external_recommender
            # Use https://github.com/dkpro/dkpro-cassis for deserialising/serialising

            # Basically we need to take the request, process it into our standard format,
            # get the predictions, then convert those into the expected XMI format

            annotated_xmi = ""

            return ExternalRecommenderPredictResponse(document=annotated_xmi)

        except HTTPException as e:
            raise e
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"An unexpected error occurred in external recommender: {str(e)}"
            )

    return app
