from fastapi import APIRouter, Depends
from typing import List
from ..dependencies import get_tool_service
from ..services.tool_service import ToolService
from goldmine.types import ToolDiscoveryInfo

router = APIRouter()

@router.get("/", response_model=List[ToolDiscoveryInfo])
async def list_tools(tool_service: ToolService = Depends(get_tool_service)):
    """List all discovered tools from tools/compose.yml"""
    return tool_service.get_discovered_tools()
