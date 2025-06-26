from .services.tool_service import ToolService

# Create a single, shared instance of the ToolService.
# This instance will be created once when the module is first imported
# and shared across all requests.
tool_service = ToolService()


def get_tool_service() -> ToolService:
    """FastAPI dependency to get the shared ToolService instance."""
    return tool_service
