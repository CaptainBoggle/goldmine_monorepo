from unittest.mock import AsyncMock, Mock, patch

import httpx
import pytest

from goldmine.types import (
    ExternalRecommenderPredictRequest,
    ToolBatchInput,
)


class TestToolProxyRouter:
    """Test class for tool proxy router endpoints."""

    @pytest.mark.asyncio
    async def test_get_tool_status_success(
        self, client_with_mocked_dependencies, mock_httpx_responses
    ):
        """Test getting tool status successfully."""
        with patch(
            "app.routers.tool_proxy._proxy_get_request", new_callable=AsyncMock
        ) as mock_request:
            mock_request.return_value = mock_httpx_responses["status"]

            response = client_with_mocked_dependencies.get("/proxy/test-tool-1/status")
            assert response.status_code == 200

            data = response.json()
            assert data["state"] == "ready"
            assert data["message"] == "Tool is ready"

    def test_get_tool_status_tool_not_found(self, client_with_mocked_dependencies):
        """Test getting tool status when tool not found."""
        response = client_with_mocked_dependencies.get("/proxy/nonexistent-tool/status")
        assert response.status_code == 404
        assert "Tool 'nonexistent-tool' not found" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_get_tool_info_success(
        self, client_with_mocked_dependencies, mock_httpx_responses
    ):
        """Test getting tool info successfully."""
        with patch(
            "app.routers.tool_proxy._proxy_get_request", new_callable=AsyncMock
        ) as mock_request:
            mock_request.return_value = mock_httpx_responses["info"]

            response = client_with_mocked_dependencies.get("/proxy/test-tool-1/info")
            assert response.status_code == 200

            data = response.json()
            assert data["name"] == "Test Tool"
            assert data["version"] == "1.0.0"
            assert data["description"] == "A test tool"
            assert data["author"] == "Test Author"

    def test_get_tool_info_tool_not_found(self, client_with_mocked_dependencies):
        """Test getting tool info when tool not found."""
        response = client_with_mocked_dependencies.get("/proxy/nonexistent-tool/info")
        assert response.status_code == 404
        assert "Tool 'nonexistent-tool' not found" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_load_tool_success(self, client_with_mocked_dependencies, mock_httpx_responses):
        """Test loading tool successfully."""
        with patch(
            "app.routers.tool_proxy._proxy_post_request", new_callable=AsyncMock
        ) as mock_request:
            mock_request.return_value = mock_httpx_responses["load"]

            response = client_with_mocked_dependencies.post("/proxy/test-tool-1/load")
            assert response.status_code == 200

            data = response.json()
            assert data["state"] == "ready"
            assert data["loading_time"] == 2.5
            assert data["message"] == "Tool loaded successfully"

    def test_load_tool_not_found(self, client_with_mocked_dependencies):
        """Test loading tool when tool not found."""
        response = client_with_mocked_dependencies.post("/proxy/nonexistent-tool/load")
        assert response.status_code == 404
        assert "Tool 'nonexistent-tool' not found" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_unload_tool_success(self, client_with_mocked_dependencies, mock_httpx_responses):
        """Test unloading tool successfully."""
        with patch(
            "app.routers.tool_proxy._proxy_post_request", new_callable=AsyncMock
        ) as mock_request:
            mock_request.return_value = mock_httpx_responses["unload"]

            response = client_with_mocked_dependencies.post("/proxy/test-tool-1/unload")
            assert response.status_code == 200

            data = response.json()
            assert data["state"] == "unloaded"
            assert data["message"] == "Tool unloaded successfully"

    def test_unload_tool_not_found(self, client_with_mocked_dependencies):
        """Test unloading tool when tool not found."""
        response = client_with_mocked_dependencies.post("/proxy/nonexistent-tool/unload")
        assert response.status_code == 404
        assert "Tool 'nonexistent-tool' not found" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_predict_with_tool_success(
        self, client_with_mocked_dependencies, mock_httpx_responses, sample_tool_input
    ):
        """Test making prediction with tool successfully."""
        with patch(
            "app.routers.tool_proxy._proxy_post_request", new_callable=AsyncMock
        ) as mock_request:
            mock_request.return_value = mock_httpx_responses["predict"]

            response = client_with_mocked_dependencies.post(
                "/proxy/test-tool-1/predict", json=sample_tool_input.dict()
            )
            assert response.status_code == 200

            data = response.json()
            assert "results" in data
            assert data["processing_time"] == 0.1
            assert len(data["results"]) == 2
            assert data["results"][0][0]["id"] == "HP:0000001"

    def test_predict_with_tool_not_found(self, client_with_mocked_dependencies, sample_tool_input):
        """Test making prediction when tool not found."""
        response = client_with_mocked_dependencies.post(
            "/proxy/nonexistent-tool/predict", json=sample_tool_input.dict()
        )
        assert response.status_code == 404
        assert "Tool 'nonexistent-tool' not found" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_batch_predict_with_tool_success(
        self, client_with_mocked_dependencies, mock_httpx_responses
    ):
        """Test making batch prediction with tool successfully."""
        batch_input = ToolBatchInput(
            documents=[["Patient has heart defect."], ["No significant findings."]]
        )

        with patch(
            "app.routers.tool_proxy._proxy_post_request", new_callable=AsyncMock
        ) as mock_request:
            mock_request.return_value = mock_httpx_responses["batch_predict"]

            response = client_with_mocked_dependencies.post(
                "/proxy/test-tool-1/batch_predict", json=batch_input.dict()
            )
            assert response.status_code == 200

            data = response.json()
            assert "results" in data
            assert data["processing_time"] == 0.2

    def test_batch_predict_with_tool_not_found(self, client_with_mocked_dependencies):
        """Test making batch prediction when tool not found."""
        batch_input = ToolBatchInput(documents=[["Test sentence"]])

        response = client_with_mocked_dependencies.post(
            "/proxy/nonexistent-tool/batch_predict", json=batch_input.dict()
        )
        assert response.status_code == 404
        assert "Tool 'nonexistent-tool' not found" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_predict_with_external_recommender_success(
        self, client_with_mocked_dependencies, mock_httpx_responses
    ):
        """Test making prediction with external recommender format successfully."""
        from goldmine.types import ExternalRecommenderDocument, ExternalRecommenderMetadata

        request_data = ExternalRecommenderPredictRequest(
            document=ExternalRecommenderDocument(
                documentId=1, userId="user123", xmi="<xmi>test document</xmi>"
            ),
            typeSystem="type system",
            metadata=ExternalRecommenderMetadata(
                layer="layer1",
                feature="feature1",
                projectId=1,
                anchoringMode="mode1",
                crossSentence=False,
            ),
        )

        with patch(
            "app.routers.tool_proxy._proxy_post_request", new_callable=AsyncMock
        ) as mock_request:
            mock_request.return_value = mock_httpx_responses["external-recommender/predict"]

            response = client_with_mocked_dependencies.post(
                "/proxy/test-tool-1/external-recommender/predict", json=request_data.dict()
            )
            assert response.status_code == 200

            data = response.json()
            assert data["document"] == "<xmi>test document</xmi>"

    def test_predict_with_external_recommender_tool_not_found(
        self, client_with_mocked_dependencies
    ):
        """Test external recommender prediction when tool not found."""
        from goldmine.types import ExternalRecommenderDocument, ExternalRecommenderMetadata

        request_data = ExternalRecommenderPredictRequest(
            document=ExternalRecommenderDocument(
                documentId=1, userId="user123", xmi="<xmi>test document</xmi>"
            ),
            typeSystem="type system",
            metadata=ExternalRecommenderMetadata(
                layer="layer1",
                feature="feature1",
                projectId=1,
                anchoringMode="mode1",
                crossSentence=False,
            ),
        )

        response = client_with_mocked_dependencies.post(
            "/proxy/nonexistent-tool/external-recommender/predict", json=request_data.dict()
        )
        assert response.status_code == 404
        assert "Tool 'nonexistent-tool' not found" in response.json()["detail"]


class TestProxyHelperFunctions:
    """Test the helper functions for HTTP proxying."""

    @pytest.mark.asyncio
    async def test_proxy_get_request_success(self):
        """Test successful GET request proxy."""
        from app.routers.tool_proxy import _proxy_get_request

        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"state": "ready"}
        mock_response.raise_for_status.return_value = None

        with patch("httpx.AsyncClient") as mock_client:
            mock_client.return_value.__aenter__.return_value.get.return_value = mock_response

            result = await _proxy_get_request("http://test-tool:8000", "/status")
            assert result == {"state": "ready"}

    @pytest.mark.asyncio
    async def test_proxy_get_request_connection_error(self):
        """Test GET request proxy with connection error."""
        from app.routers.tool_proxy import _proxy_get_request
        from fastapi import HTTPException

        with patch("httpx.AsyncClient") as mock_client:
            mock_client.return_value.__aenter__.return_value.get.side_effect = httpx.RequestError(
                "Connection failed"
            )

            with pytest.raises(HTTPException) as exc_info:
                await _proxy_get_request("http://test-tool:8000", "/status")

            assert exc_info.value.status_code == 503
            assert "Failed to connect to tool" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_proxy_get_request_http_error(self):
        """Test GET request proxy with HTTP error."""
        from app.routers.tool_proxy import _proxy_get_request
        from fastapi import HTTPException

        mock_response = Mock()
        mock_response.status_code = 500
        mock_response.text = "Internal Server Error"

        with patch("httpx.AsyncClient") as mock_client:
            mock_client.return_value.__aenter__.return_value.get.return_value = mock_response
            mock_response.raise_for_status.side_effect = httpx.HTTPStatusError(
                "Server Error", request=Mock(), response=mock_response
            )

            with pytest.raises(HTTPException) as exc_info:
                await _proxy_get_request("http://test-tool:8000", "/status")

            assert exc_info.value.status_code == 500
            assert "Tool returned error" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_proxy_post_request_success(self):
        """Test successful POST request proxy."""
        from app.routers.tool_proxy import _proxy_post_request

        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"results": []}
        mock_response.raise_for_status.return_value = None

        with patch("httpx.AsyncClient") as mock_client:
            mock_client.return_value.__aenter__.return_value.post.return_value = mock_response

            result = await _proxy_post_request(
                "http://test-tool:8000", "/predict", {"sentences": []}
            )
            assert result == {"results": []}

    @pytest.mark.asyncio
    async def test_proxy_post_request_connection_error(self):
        """Test POST request proxy with connection error."""
        from app.routers.tool_proxy import _proxy_post_request
        from fastapi import HTTPException

        with patch("httpx.AsyncClient") as mock_client:
            mock_client.return_value.__aenter__.return_value.post.side_effect = httpx.RequestError(
                "Connection failed"
            )

            with pytest.raises(HTTPException) as exc_info:
                await _proxy_post_request("http://test-tool:8000", "/predict", {})

            assert exc_info.value.status_code == 503
            assert "Failed to connect to tool" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_proxy_post_request_http_error(self):
        """Test POST request proxy with HTTP error."""
        from app.routers.tool_proxy import _proxy_post_request
        from fastapi import HTTPException

        mock_response = Mock()
        mock_response.status_code = 400
        mock_response.text = "Bad Request"

        with patch("httpx.AsyncClient") as mock_client:
            mock_client.return_value.__aenter__.return_value.post.return_value = mock_response
            mock_response.raise_for_status.side_effect = httpx.HTTPStatusError(
                "Client Error", request=Mock(), response=mock_response
            )

            with pytest.raises(HTTPException) as exc_info:
                await _proxy_post_request("http://test-tool:8000", "/predict", {})

            assert exc_info.value.status_code == 400
            assert "Tool returned error" in str(exc_info.value.detail)
