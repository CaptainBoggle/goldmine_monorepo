import re
import io
from fastapi import FastAPI, HTTPException
from cassis import load_typesystem, load_cas_from_xmi
from goldmine.toolkit.interface import ModelInterface

from ..types import (
    ExternalRecommenderPredictRequest,
    ExternalRecommenderPredictResponse,
    LoadResponse,
    ToolInfo,
    ToolInput,
    ToolResponse,
    ToolBatchInput,
    ToolBatchResponse,
    ToolStatus,
    ToolOutput,
    PhenotypeMatch,
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
        
    @app.post("/batch_predict", response_model=ToolBatchResponse)
    async def batch_predict(input_data: ToolBatchInput) -> ToolBatchResponse:
        """
        Process a list of documents to identify phenotype IDs.
        This endpoint will automatically load the model if it's not already loaded.
        """
        try:
            return await model_implementation.batch_predict(input_data)

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
            print("Received request:", request) # debugging
            print("Request metadata:", request.request_metadata) # debuggin

            # Load type system and CAS
            typesystem = load_typesystem(io.BytesIO(request.type_system.encode("utf-8")))
            cas = load_cas_from_xmi(io.BytesIO(request.document.xmi.encode("utf-8")), typesystem=typesystem)

            layer_name = request.request_metadata.layer
            feature_name = request.request_metadata.feature
            AnnotationType = typesystem.get_type(layer_name)

            view = cas.get_view('_InitialView')
            text = view.sofa_string
            print("Text from _InitialView:", repr(text)) # debuggin

            # Run prediction using the model interface
            tool_input = ToolInput(sentences=[text])
            tool_output = await model_implementation.predict(tool_input)

            # mock test
            # tool_output = ToolOutput(results=[[
            #     PhenotypeMatch(id="HP:0001250", match_text="epilepsy"),
            #     PhenotypeMatch(id="HP:0000707", match_text="autism")
            # ]])

            for match in tool_output.results[0]:
                match_text = match.match_text or ""

                # Match all occurrences of the match_text
                for occurrence in re.finditer(re.escape(match_text), text):
                    begin, end = occurrence.start(), occurrence.end()

                    annotation = AnnotationType(
                        begin=begin,
                        end=end,
                        **{
                            feature_name: f"http://purl.obolibrary.org/obo/{match.id.replace(':', '_')}",
                            f"{feature_name}_score": 1.0,  # Assuming a score of 1.0 for simplicity
                            f"{feature_name}_score_explanation": f"Predicted by tool {model_implementation.get_info().name}",
                            "inception_internal_predicted": True
                        }
                    )
                    cas.add(annotation)

            annotated_xmi = cas.to_xmi()
            return ExternalRecommenderPredictResponse(document=annotated_xmi)

        except HTTPException as e:
            raise e
        except Exception as e:
            print(f"Error in external recommender predict: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"An unexpected error occurred in external recommender: {str(e)}"
            )

    return app
