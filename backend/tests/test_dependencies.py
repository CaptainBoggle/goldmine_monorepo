from app.dependencies import get_tool_service, tool_service


class TestDependencies:
    """Test class for dependency functions."""

    def test_get_tool_service_returns_singleton(self):
        """Test that get_tool_service returns the same instance."""
        service1 = get_tool_service()
        service2 = get_tool_service()

        assert service1 is service2
        assert service1 is tool_service

    def test_tool_service_is_initialised(self):
        """Test that the tool service singleton is properly initialised."""
        service = get_tool_service()

        # Should be a ToolService instance
        from app.services.tool_service import ToolService

        assert isinstance(service, ToolService)

        # Should have the expected methods
        assert hasattr(service, "get_discovered_tools")
        assert hasattr(service, "get_tool_by_name")
        assert callable(service.get_discovered_tools)
        assert callable(service.get_tool_by_name)
