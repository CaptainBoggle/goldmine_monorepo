from typing import List

from fastapi import APIRouter, Depends, HTTPException

from goldmine.types import ToolDiscoveryInfo

from ..dependencies import get_tool_service
from ..services.tool_service import ToolService

router = APIRouter()


def get_tool_dependency(
    tool_name: str,
    tool_service: ToolService = Depends(get_tool_service),
) -> ToolDiscoveryInfo:
    """Dependency to get a tool by name."""
    tool = tool_service.get_tool_by_name(tool_name)
    if tool is None:
        raise HTTPException(status_code=404, detail=f"Tool '{tool_name}' not found")
    return tool


@router.get("/", response_model=List[ToolDiscoveryInfo])
async def list_tools(tool_service: ToolService = Depends(get_tool_service)):
    """List all discovered tools from tools/compose.yml"""
    return tool_service.get_discovered_tools()
