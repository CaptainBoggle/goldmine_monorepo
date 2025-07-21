from typing import Any, Dict

import httpx
from fastapi import APIRouter, Depends, HTTPException

from goldmine.types import (
    ExternalRecommenderPredictRequest,
    ExternalRecommenderPredictResponse,
    LoadResponse,
    ToolInfo,
    ToolInput,
    ToolResponse,
    ToolStatus,
    ToolBatchInput,
    ToolBatchResponse,
)

from ..dependencies import get_tool_service
from ..services.tool_service import ToolService

# Create a router with the tool-id as a path parameter
router = APIRouter()


@router.get("/{tool_id}/status", response_model=ToolStatus)
async def get_tool_status(tool_id: str, tool_service: ToolService = Depends(get_tool_service)):
    """Get the status of a specific tool"""
    tool = tool_service.get_tool_by_name(tool_id)
    if not tool:
        raise HTTPException(status_code=404, detail=f"Tool '{tool_id}' not found")

    return await _proxy_get_request(tool.endpoint, "/status")


@router.get("/{tool_id}/info", response_model=ToolInfo)
async def get_tool_info(tool_id: str, tool_service: ToolService = Depends(get_tool_service)):
    """Get information about a specific tool"""
    tool = tool_service.get_tool_by_name(tool_id)
    if not tool:
        raise HTTPException(status_code=404, detail=f"Tool '{tool_id}' not found")

    return await _proxy_get_request(tool.endpoint, "/info")


@router.post("/{tool_id}/load", response_model=LoadResponse)
async def load_tool(tool_id: str, tool_service: ToolService = Depends(get_tool_service)):
    """Load a specific tool"""
    tool = tool_service.get_tool_by_name(tool_id)
    if not tool:
        raise HTTPException(status_code=404, detail=f"Tool '{tool_id}' not found")

    return await _proxy_post_request(tool.endpoint, "/load", {}, timeout=90.0)


@router.post("/{tool_id}/unload")
async def unload_tool(tool_id: str, tool_service: ToolService = Depends(get_tool_service)):
    """Unload a specific tool"""
    tool = tool_service.get_tool_by_name(tool_id)
    if not tool:
        raise HTTPException(status_code=404, detail=f"Tool '{tool_id}' not found")

    return await _proxy_post_request(tool.endpoint, "/unload", {})


@router.post("/{tool_id}/predict", response_model=ToolResponse)
async def predict_with_tool(
    tool_id: str, input_data: ToolInput, tool_service: ToolService = Depends(get_tool_service)
):
    """Make a prediction using a specific tool"""
    tool = tool_service.get_tool_by_name(tool_id)
    if not tool:
        raise HTTPException(status_code=404, detail=f"Tool '{tool_id}' not found")

    return await _proxy_post_request(tool.endpoint, "/predict", input_data.dict(), timeout=120.0)


@router.post("/{tool_id}/batch_predict", response_model=ToolBatchResponse)
async def batch_predict_with_tool(
    tool_id: str, input_data: ToolBatchInput, tool_service: ToolService = Depends(get_tool_service)
):
    """Make a batch prediction using a specific tool"""
    tool = tool_service.get_tool_by_name(tool_id)
    if not tool:
        raise HTTPException(status_code=404, detail=f"Tool '{tool_id}' not found")

    return await _proxy_post_request(tool.endpoint, "/batch_predict", input_data.dict(), timeout=120.0)


@router.post("/{tool_id}/external-recommender/predict", response_model=ExternalRecommenderPredictResponse)
async def external_recommender_predict(
    tool_id: str, request: ExternalRecommenderPredictRequest, tool_service: ToolService = Depends(get_tool_service)
):
    """Make a prediction using an external recommender tool"""
    tool = tool_service.get_tool_by_name(tool_id)
    if not tool:
        raise HTTPException(status_code=404, detail=f"Tool '{tool_id}' not found")

    # Forward the external recommender request directly to the tool
    internal_response = await _proxy_post_request(
        tool.endpoint, "/external-recommender/predict", request.dict(), timeout=120.0
    )

    # Return the response directly from the tool
    return ExternalRecommenderPredictResponse(document=internal_response.get("document", ""))


# Helper functions for making HTTP requests
async def _proxy_get_request(base_url: str, endpoint: str, timeout: float = 60.0) -> Dict[str, Any]:
    """Make a GET request to a tool endpoint"""
    url = f"{base_url}{endpoint}"

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, timeout=timeout)
            response.raise_for_status()
            return response.json()
        except httpx.RequestError as e:
            raise HTTPException(status_code=503, detail=f"Failed to connect to tool at {url}: {e}")
        except httpx.HTTPStatusError as e:
            raise HTTPException(
                status_code=e.response.status_code, detail=f"Tool returned error: {e.response.text}"
            )


async def _proxy_post_request(
    base_url: str, endpoint: str, data: Dict[str, Any], timeout: float = 30.0
) -> Dict[str, Any]:
    """Make a POST request to a tool endpoint"""
    url = f"{base_url}{endpoint}"

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, json=data, timeout=timeout)
            response.raise_for_status()
            return response.json()
        except httpx.RequestError as e:
            raise HTTPException(status_code=503, detail=f"Failed to connect to tool at {url}: {e}")
        except httpx.HTTPStatusError as e:
            raise HTTPException(
                status_code=e.response.status_code, detail=f"Tool returned error: {e.response.text}"
            )
