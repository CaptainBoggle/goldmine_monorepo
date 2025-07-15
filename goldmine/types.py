import re
from enum import Enum
from typing import List, Optional

from pydantic import computed_field, field_validator
from sqlalchemy import JSON
from sqlmodel import Column, Field, Relationship, SQLModel


class PhenotypeMatch(SQLModel):
    # HPO id
    id: str = Field(
        ..., description="HPO ID of the phenotype (must be CURIE format, e.g., 'HP:0000001')"
    )

    @field_validator("id")
    @classmethod
    def validate_hpo_id(cls, v):
        if not re.match(r"^HP:[0-9]+$", v):
            raise ValueError("id must be in CURIE format (e.g., 'HP:0000001')")
        return v

    match_text: Optional[str] = Field("", description="Text that matched the phenotype")

class ToolState(str, Enum):
    READY = "ready"
    BUSY = "busy"
    LOADING = "loading"
    UNLOADING = "unloading"
    ERROR = "error"
    UNLOADED = "unloaded"

class ToolInput(SQLModel):
    """Base class for tool input"""
    sentences: List[str] = Field(..., description="List of sentences to be processed by the tool")
    # TODO: do we bother with parameters?
    # parameters: Dict[str, Any] = Field(
    #     default_factory=dict, description="Additional parameters for the tool"
    # )


class ToolOutput(SQLModel):
    """Base class for tool output"""
    results: List[List[PhenotypeMatch]] = Field(
        ..., description="List of of phenotype matches for each sentence"
    )


class ToolResponse(ToolOutput):
    """Response from the tool"""
    processing_time: Optional[float] = Field(
        None, description="Time taken to process the input in seconds"
    )


class ToolInfo(SQLModel):
    """Information about a tool"""

    name: str = Field(..., description="Name of the tool")
    version: str = Field(..., description="Version of the tool")
    description: str = Field(..., description="Description of the tool")
    author: str = Field(..., description="Author of the tool")
    # TODO: memory requirements, etc?
    # memory_requirements: int = Field(
    #   ..., description="Approximate memory requirements for the tool in MB"
    # )


class ToolStatus(SQLModel):
    """Status of a tool"""

    state: ToolState = Field(..., description="Current state of the tool")
    message: Optional[str] = Field(
        None,
        description="Optional message providing additional information about the tool's status",
    )
    # TODO: performance metrics?
    # memory_usage: Optional[int] = Field(None, description="Current memory usage MB")
    # cpu_usage: Optional[int] = Field(None, description="Current CPU usage %")
    # gpu_usage: Optional[int] = Field(None, description="Current GPU usage %")


class LoadResponse(SQLModel):
    """Response from model load operation"""

    state: ToolState = Field(..., description="Current state of the tool after load request")
    loading_time: float = Field(0, description="Time taken to load in seconds")
    message: Optional[str] = Field(
        None,
        description="Optional message providing additional information about the load operation",
    )


class UnloadResponse(SQLModel):
    """Response from model unload operation"""

    state: ToolState = Field(..., description="Current state of the tool after unload request")
    message: Optional[str] = Field(
        None,
        description="Optional message providing additional information about the unload operation",
    )


class ToolDiscoveryInfo(SQLModel):
    """Tool information discovered from compose.yml, handled by backend not the tool itself"""

    id: str = Field(..., description="Tool identifier")
    container_name: str = Field(..., description="Docker container name")
    port: int = Field(..., description="Internal port")
    endpoint: str = Field(..., description="Internal endpoint URL")
    external_port: int = Field(..., description="External port for direct access")


# TODO: do we want this?
# class BatchPredictionRequest(BaseModel):
# class BatchPredictionResponse(BaseModel):

class CorpusDocument(SQLModel, table=True):
    """Base class for corpus entries"""
    # each entry contains an input and output object

    # Database fields
    db_id: Optional[int] = Field(default=None, primary_key=True, description="Database ID")
    corpus_id: Optional[int] = Field(
        default=None, foreign_key="corpus.db_id", description="Foreign key to corpus", index=True
        )

    name: str = Field(..., description="Name of the document", index=True)
    annotator: str = Field("Unknown", description="Name of the annotator")

    # Store the complex objects as JSON in the database
    input_internal: dict = Field(
        default_factory=dict,
        sa_column=Column(JSON),
        description="Serialised ToolInput",
        exclude=True  # Hide from API responses
    )
    output_internal: dict = Field(
        default_factory=dict,
        sa_column=Column(JSON),
        description="Serialised ToolOutput",
        exclude=True  # Hide from API responses
    )

    corpus: Optional["Corpus"] = Relationship(back_populates="entries")

    def __init__(
        self,
        *,
        db_id: Optional[int] = None,
        corpus_id: Optional[int] = None,
        name: str,
        annotator: str = "Unknown",
        input: Optional[ToolInput] = None,
        output: Optional[ToolOutput] = None,
        input_internal: Optional[dict] = None,
        output_internal: Optional[dict] = None,
        **kwargs
    ):
        """
        Initialise CorpusDocument with either ToolInput/ToolOutput objects or raw data.
        Args:
            input: ToolInput object (will be serialised to input_internal)
            output: ToolOutput object (will be serialised to output_internal)
            input_internal: Raw dict data (for database loading)
            output_internal: Raw dict data (for database loading)
        """
        # Call parent init with database fields
        super().__init__(
            db_id=db_id,
            corpus_id=corpus_id,
            name=name,
            annotator=annotator,
            input_internal=input_internal or {},
            output_internal=output_internal or {},
            **kwargs
        )

        # If ToolInput/ToolOutput objects were passed, serialise them
        if input is not None:
            self.input = input
        if output is not None:
            self.output = output

    # Properties to access ToolInput and ToolOutput directly
    @computed_field
    @property
    def input(self) -> ToolInput:
        """Get the ToolInput object"""
        if not self.input_internal:
            return ToolInput(sentences=[])
        return ToolInput.model_validate(self.input_internal)

    @input.setter
    def input(self, value: ToolInput):
        """Set the ToolInput object"""
        self.input_internal = value.model_dump()

    @computed_field
    @property
    def output(self) -> ToolOutput:
        """Get the ToolOutput object"""
        if not self.output_internal:
            return ToolOutput(results=[])
        # Convert dict back to PhenotypeMatch objects
        results = []
        for sentence_results in self.output_internal.get("results", []):
            sentence_matches = [
                PhenotypeMatch.model_validate(match) for match in sentence_results
            ]
            results.append(sentence_matches)
        return ToolOutput(results=results)

    @output.setter
    def output(self, value: ToolOutput):
        """Set the ToolOutput object"""
        # Convert PhenotypeMatch objects to dicts for JSON storage
        results = []
        for sentence_results in value.results:
            sentence_dicts = [match.model_dump() for match in sentence_results]
            results.append(sentence_dicts)
        self.output_internal = {"results": results}

    @computed_field
    @property
    def annotation_count(self) -> int:
        """Get the number of annotations in this document"""
        return sum(len(sentence_annotations) for sentence_annotations in self.output.results)

class Corpus(SQLModel, table=True):
    '''Base class for a corpus'''
    db_id: Optional[int] = Field(default=None, primary_key=True, description="Database ID")

    name: str = Field(..., description="Name of the corpus", index=True)
    description: Optional[str] = Field(None, description="Description of the corpus")
    # TODO: enforce format of hpo_version?
    hpo_version: str = Field(..., description="Version of the HPO ontology used")
    corpus_version: str = Field(
        "1.0", description="Version of the corpus format, for future compatibility", index=True
    )

    entries: List[CorpusDocument] = Relationship(back_populates="corpus", cascade_delete=True)

    # auto generated field to track number of documents
    @computed_field
    @property
    def document_count(self) -> int:
        """Get the number of documents in this corpus"""
        return len(self.entries)

    @computed_field
    @property
    def total_annotations(self) -> int:
        """Get the total number of annotations across all documents in this corpus"""
        return sum(doc.annotation_count for doc in self.entries)
