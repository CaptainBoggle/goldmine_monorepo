from unittest.mock import Mock

import pytest
from app.routers.tools import get_tool_dependency
from fastapi import HTTPException

from goldmine.types import ToolDiscoveryInfo


class TestToolsRouter:
    """Test class for tools router endpoints."""

    def test_list_tools_success(self, client_with_mocked_dependencies):
        """Test listing all tools successfully."""
        response = client_with_mocked_dependencies.get("/tools/")
        assert response.status_code == 200

        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 2

        # Check first tool
        assert data[0]["id"] == "test-tool-1"
        assert data[0]["container_name"] == "test-tool-1"
        assert data[0]["port"] == 8000
        assert data[0]["endpoint"] == "http://test-tool-1:8000"
        assert data[0]["external_port"] == 8001

        # Check second tool
        assert data[1]["id"] == "test-tool-2"
        assert data[1]["container_name"] == "test-tool-2"
        assert data[1]["port"] == 8000
        assert data[1]["endpoint"] == "http://test-tool-2:8000"
        assert data[1]["external_port"] == 8002

    def test_list_tools_empty(self, client_without_lifespan, test_db_session):
        """Test listing tools when no tools are discovered."""
        # Create a mock tool service that returns empty list
        empty_tool_service = Mock()
        empty_tool_service.get_discovered_tools.return_value = []

        from app.dependencies import get_tool_service
        from app.main import app
        from app.services.database import get_db_session

        app.dependency_overrides[get_db_session] = lambda: test_db_session
        app.dependency_overrides[get_tool_service] = lambda: empty_tool_service

        try:
            response = client_without_lifespan.get("/tools/")
            assert response.status_code == 200
            assert response.json() == []
        finally:
            app.dependency_overrides.clear()


class TestToolDependency:
    """Test class for the get_tool_dependency function."""

    def test_get_tool_dependency_success(self, mock_tool_service):
        """Test getting tool dependency successfully."""
        tool = get_tool_dependency("test-tool-1", mock_tool_service)

        assert isinstance(tool, ToolDiscoveryInfo)
        assert tool.id == "test-tool-1"
        assert tool.container_name == "test-tool-1"
        assert tool.port == 8000
        assert tool.endpoint == "http://test-tool-1:8000"
        assert tool.external_port == 8001

    def test_get_tool_dependency_not_found(self, mock_tool_service):
        """Test getting tool dependency when tool not found."""
        with pytest.raises(HTTPException) as exc_info:
            get_tool_dependency("nonexistent-tool", mock_tool_service)

        assert exc_info.value.status_code == 404
        assert "Tool 'nonexistent-tool' not found" in str(exc_info.value.detail)

    def test_get_tool_dependency_service_returns_none(self):
        """Test getting tool dependency when service returns None."""
        mock_service = Mock()
        mock_service.get_tool_by_name.return_value = None

        with pytest.raises(HTTPException) as exc_info:
            get_tool_dependency("any-tool", mock_service)

        assert exc_info.value.status_code == 404
        assert "Tool 'any-tool' not found" in str(exc_info.value.detail)
