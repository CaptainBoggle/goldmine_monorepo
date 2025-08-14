import os
import tempfile
from pathlib import Path
from typing import Generator
from unittest.mock import Mock, patch

import pytest
from fastapi.testclient import TestClient
from pytest_postgresql import factories
from sqlmodel import Session, SQLModel, create_engine

from goldmine.types import (
    Corpus,
    CorpusDocument,
    PhenotypeMatch,
    ToolDiscoveryInfo,
    ToolInput,
    ToolOutput,
)

# Create postgresql process and database fixtures
postgresql_proc = factories.postgresql_proc()
postgresql = factories.postgresql("postgresql_proc")


@pytest.fixture(scope="function")
def test_db_engine(postgresql):
    """Create a test database engine using PostgreSQL."""
    # Create connection string from postgresql fixture
    connection_string = f"postgresql+psycopg2://{postgresql.info.user}:@{postgresql.info.host}:{postgresql.info.port}/{postgresql.info.dbname}"

    engine = create_engine(
        connection_string,
        echo=False,  # Set to True for SQL debugging
        pool_pre_ping=True,
    )
    SQLModel.metadata.create_all(engine)
    return engine


@pytest.fixture(scope="function")
def test_db_session(test_db_engine) -> Generator[Session, None, None]:
    """Create a test database session."""
    session = Session(test_db_engine)
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def mock_corpora_root():
    """Create a temporary directory for test corpora."""
    with tempfile.TemporaryDirectory() as temp_dir:
        yield Path(temp_dir)


@pytest.fixture
def mock_compose_yml_content():
    """Mock compose.yml content for testing."""
    return """
version: '3.8'
services:
  test-tool-1:
    container_name: test-tool-1
    build: ./test_tool_1
    ports:
      - "8001:8000"

  test-tool-2:
    container_name: test-tool-2
    build: ./test_tool_2
    ports:
      - "8002:8000"

  tool-without-ports:
    container_name: tool-without-ports
    build: ./tool_without_ports
"""


@pytest.fixture
def mock_tool_discovery_info():
    """Mock tool discovery information."""
    return [
        ToolDiscoveryInfo(
            id="test-tool-1",
            container_name="test-tool-1",
            port=8000,
            endpoint="http://test-tool-1:8000",
            external_port=8001,
        ),
        ToolDiscoveryInfo(
            id="test-tool-2",
            container_name="test-tool-2",
            port=8000,
            endpoint="http://test-tool-2:8000",
            external_port=8002,
        ),
    ]


@pytest.fixture
def sample_phenotype_matches():
    """Sample phenotype matches for testing."""
    return [
        PhenotypeMatch(id="HP:0000001", match_text="heart defect"),
        PhenotypeMatch(id="HP:0000002", match_text="muscle weakness"),
    ]


@pytest.fixture
def sample_tool_input():
    """Sample tool input for testing."""
    return ToolInput(
        sentences=[
            "Patient has heart defect and muscle weakness.",
            "No significant findings in the cardiac examination.",
        ]
    )


@pytest.fixture
def sample_tool_output(sample_phenotype_matches):
    """Sample tool output for testing."""
    return ToolOutput(
        results=[
            sample_phenotype_matches,  # First sentence has matches
            [],  # Second sentence has no matches
        ]
    )


@pytest.fixture
def sample_corpus_document(sample_tool_input, sample_tool_output):
    """Sample corpus document for testing."""
    return CorpusDocument(
        name="test_document_1",
        annotator="test_annotator",
        input=sample_tool_input,
        output=sample_tool_output,
    )


@pytest.fixture
def sample_corpus(test_db_session, sample_corpus_document):
    """Sample corpus for testing."""
    corpus = Corpus(
        name="test_corpus",
        description="A test corpus for unit tests",
        hpo_version="2023-01-01",
        corpus_version="1.0",
    )
    test_db_session.add(corpus)
    test_db_session.commit()
    test_db_session.refresh(corpus)

    # Add document to corpus
    sample_corpus_document.corpus_id = corpus.db_id
    test_db_session.add(sample_corpus_document)
    test_db_session.commit()
    test_db_session.refresh(sample_corpus_document)

    return corpus


@pytest.fixture
def mock_tool_service(mock_tool_discovery_info):
    """Mock tool service for testing."""
    mock_service = Mock()
    mock_service.get_discovered_tools.return_value = mock_tool_discovery_info
    mock_service.get_tool_by_name.side_effect = lambda name: next(
        (tool for tool in mock_tool_discovery_info if tool.id == name), None
    )
    return mock_service


@pytest.fixture
def mock_httpx_responses():
    """Mock httpx responses for tool communication."""
    return {
        "status": {"state": "ready", "message": "Tool is ready"},
        "info": {
            "name": "Test Tool",
            "version": "1.0.0",
            "description": "A test tool",
            "author": "Test Author",
        },
        "load": {"state": "ready", "loading_time": 2.5, "message": "Tool loaded successfully"},
        "unload": {"state": "unloaded", "message": "Tool unloaded successfully"},
        "predict": {
            "results": [
                [{"id": "HP:0000001", "match_text": "heart defect"}],
                [],
            ],
            "processing_time": 0.1,
        },
        "batch_predict": {
            "results": [
                [
                    [{"id": "HP:0000001", "match_text": "heart defect"}],
                    [],
                ]
            ],
            "processing_time": 0.2,
        },
        "external-recommender/predict": {"document": "<xmi>test document</xmi>"},
    }


@pytest.fixture
def client_without_lifespan():
    """Create a test client without the lifespan context manager for testing."""
    # We need to mock the lifespan dependencies to avoid database initialization
    with patch("app.main.initialise_database"), patch("app.services.database.get_db_session"):
        # Import here to avoid circular imports and ensure mocks are in place
        from app.main import app

        # Create app without lifespan for testing
        test_app = app
        test_app.dependency_overrides = {}  # Clear any existing overrides

        with TestClient(test_app) as client:
            yield client


@pytest.fixture
def client_with_mocked_dependencies(test_db_session, mock_tool_service, client_without_lifespan):
    """Create a test client with mocked dependencies."""
    from app.dependencies import get_tool_service

    # Import the app here to ensure all patches are applied
    from app.main import app
    from app.services.database import get_db_session

    # Create a mock database service that returns our test session
    mock_db_service = Mock()
    mock_db_service.get_session.return_value = test_db_session

    # Patch the get_database_service function to return our mock
    with patch("app.services.database.get_database_service", return_value=mock_db_service):
        # Override dependencies
        app.dependency_overrides[get_db_session] = lambda: test_db_session
        app.dependency_overrides[get_tool_service] = lambda: mock_tool_service

        try:
            yield client_without_lifespan
        finally:
            # Clean up overrides
            app.dependency_overrides.clear()


# Mock environment variables for testing
@pytest.fixture(autouse=True)
def mock_env_vars(postgresql):
    """Mock environment variables for testing."""
    # Use the actual PostgreSQL connection details
    connection_string = f"postgresql+psycopg2://{postgresql.info.user}:@{postgresql.info.host}:{postgresql.info.port}/{postgresql.info.dbname}"

    with patch.dict(
        os.environ,
        {
            "DATABASE_URL": connection_string,
        },
        clear=False,
    ):
        yield
