from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field
import re
from pydantic import field_validator


class PhenotypeMatch(BaseModel):
    # HPO id
    id: str = Field(..., description="HPO ID of the phenotype (must be CURIE format, e.g., 'HP:0000001')")

    @field_validator("id")
    @classmethod
    def validate_hpo_id(cls, v):
        if not re.match(r"^HP:[0-9]+$", v):
            raise ValueError("id must be in CURIE format (e.g., 'HP:0000001')")
        return v

    match_text: Optional[str] = Field(..., description="Text that matched the phenotype")
class ToolState(str, Enum):
    READY = "ready"
    BUSY = "busy"
    LOADING = "loading"
    UNLOADING = "unloading"
    ERROR = "error"
    UNLOADED = "unloaded"


class ToolInput(BaseModel):
    sentences: List[str] = Field(..., description="List of sentences to be processed by the tool")
    # TODO: do we bother with parameters?
    # parameters: Dict[str, Any] = Field(default_factory=dict, description="Additional parameters for the tool")


class ToolOutput(BaseModel):
    results: List[List[PhenotypeMatch]] = Field(
        ..., description="List of of phenotype matches for each sentence"
    )


class ToolResponse(ToolOutput):
    processing_time: Optional[float] = Field(
        None, description="Time taken to process the input in seconds"
    )


class ToolInfo(BaseModel):
    """Information about a tool"""

    name: str = Field(..., description="Name of the tool")
    version: str = Field(..., description="Version of the tool")
    description: str = Field(..., description="Description of the tool")
    author: str = Field(..., description="Author of the tool")
    # TODO: memory requirements, etc?
    # memory_requirements: int = Field(..., description="Approximate memory requirements for the tool in MB")


class ToolStatus(BaseModel):
    """Status of a tool"""

    state: ToolState = Field(..., description="Current state of the tool")
    message: Optional[str] = Field(
        None,
        description="Optional message providing additional information about the tool's status",
    )
    # TODO: performance metrics?
    # memory_usage: Optional[int] = Field(None, description="Current memory usage of the tool in MB")
    # cpu_usage: Optional[int] = Field(None, description="Current CPU usage of the tool in percentage")
    # gpu_usage: Optional[int] = Field(None, description="Current GPU usage of the tool in percentage")


class LoadResponse(BaseModel):
    """Response from model load operation"""

    state: ToolState = Field(..., description="Current state of the tool after load request")
    loading_time: float = Field(0, description="Time taken to load in seconds")
    message: Optional[str] = Field(
        None,
        description="Optional message providing additional information about the load operation",
    )

class UnloadResponse(BaseModel):
    """Response from model unload operation"""

    state: ToolState = Field(..., description="Current state of the tool after unload request")
    message: Optional[str] = Field(
        None,
        description="Optional message providing additional information about the unload operation",
    )

class ToolDiscoveryInfo(BaseModel):
    """Information discovered about a tool from compose.yml, handled by backend not the tool itself"""

    id: str = Field(..., description="Tool identifier")
    container_name: str = Field(..., description="Docker container name")
    port: int = Field(..., description="Internal port")
    endpoint: str = Field(..., description="Internal endpoint URL")
    external_port: int = Field(..., description="External port for direct access")


# TODO: do we want this?
# class BatchPredictionRequest(BaseModel):
# class BatchPredictionResponse(BaseModel):
