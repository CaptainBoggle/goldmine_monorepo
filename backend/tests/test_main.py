import asyncio
from unittest.mock import Mock, patch

import pytest
from fastapi import Request
from fastapi.exceptions import RequestValidationError


def test_root_endpoint(client_without_lifespan):
    """Test the root endpoint returns correct message."""
    response = client_without_lifespan.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Goldmine Backend API"}


def test_health_check_endpoint(client_without_lifespan):
    """Test the health check endpoint."""
    response = client_without_lifespan.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}


def test_app_lifespan():
    """Test application lifespan context manager."""
    with (
        patch("app.main.initialise_database") as mock_init_db,
        patch("app.main.Path"),
        patch("os.getenv") as mock_getenv,
    ):
        # Mock environment variable
        mock_getenv.return_value = "postgresql://test:test@localhost:5432/test"

        # Mock database service
        mock_db_service = Mock()
        mock_init_db.return_value = mock_db_service

        # Import and test lifespan
        from app.main import app, lifespan

        # Test lifespan context manager
        async def test_lifespan():
            async with lifespan(app):
                pass

        # Run the test
        asyncio.run(test_lifespan())

        # Verify calls
        mock_getenv.assert_called_once_with(
            "DATABASE_URL", "postgresql://postgres:password@database:5432/postgres"
        )
        mock_init_db.assert_called_once()
        mock_db_service.initialise_and_ingest.assert_called_once()


def test_app_configuration():
    """Test that the FastAPI app is configured correctly."""
    from app.main import app

    assert app.title == "Goldmine Backend API"
    assert app.description == "Backend service for the Goldmine phenotype identification platform"
    assert app.version == "1.0.0"


def test_routers_included():
    """Test that all routers are included in the app."""
    from app.main import app
    from fastapi.routing import APIRoute

    # Check that routes exist for each router by looking at route patterns
    route_paths = []
    for route in app.routes:
        # check if route is an APIRoute
        if isinstance(route, APIRoute):
            route_paths.append(route.path)

    # Check for router prefixes
    assert any("/tools" in path for path in route_paths)
    assert any("/proxy" in path for path in route_paths)
    assert any("/corpora" in path for path in route_paths)
    assert any("/predictions" in path for path in route_paths)
    assert any("/metrics" in path for path in route_paths)


def test_app_tags():
    """Test that routers have correct tags."""
    from app.main import app
    from fastapi.routing import APIRoute

    # Get all routes with tags
    all_tags = set()
    for route in app.routes:
        if isinstance(route, APIRoute) and hasattr(route, "tags") and route.tags:
            all_tags.update(route.tags)

    # Check that expected tags exist
    expected_tags = {"tools", "tool-proxy", "corpora", "predictions", "metrics"}
    assert expected_tags.issubset(all_tags)


def test_invalid_endpoint_returns_404(client_without_lifespan):
    """Test that invalid endpoints return 404."""
    response = client_without_lifespan.get("/nonexistent-endpoint")
    assert response.status_code == 404


def test_app_exception_handling_integration(client_without_lifespan):
    """Test exception handling through the actual app."""
    # This would trigger a validation error if we had an endpoint that requires validation
    # Since we don't have such an endpoint in our simple app, we'll test with a malformed request

    # Try to POST to a GET-only endpoint
    response = client_without_lifespan.post("/")
    assert response.status_code == 405  # Method not allowed


@patch("app.main.os.getenv")
def test_database_url_from_environment(mock_getenv):
    """Test that database URL is read from environment."""
    mock_getenv.return_value = "postgresql://custom:url@localhost:5432/custom"

    with patch("app.main.initialise_database") as mock_init_db, patch("app.main.Path"):
        mock_db_service = Mock()
        mock_init_db.return_value = mock_db_service

        from app.main import app, lifespan

        async def test_custom_db_url():
            async with lifespan(app):
                pass

        asyncio.run(test_custom_db_url())

        # Verify custom URL was used
        mock_init_db.assert_called_once()
        args, kwargs = mock_init_db.call_args
        assert args[0] == "postgresql://custom:url@localhost:5432/custom"


def test_corpora_root_path():
    """Test that corpora root path is set correctly."""
    from pathlib import Path

    with patch("app.main.initialise_database") as mock_init_db, patch("os.getenv"):
        mock_db_service = Mock()
        mock_init_db.return_value = mock_db_service

        from app.main import app, lifespan

        async def test_corpora_path():
            async with lifespan(app):
                pass

        asyncio.run(test_corpora_path())

        # Verify corpora path was used
        mock_init_db.assert_called_once()
        args, kwargs = mock_init_db.call_args
        assert isinstance(args[1], Path)
        assert str(args[1]) == "/app/corpora"


@pytest.mark.asyncio
async def test_global_exception_handler():
    """Test the global exception handler."""
    from app.main import global_exception_handler

    # Mock request
    mock_request = Mock(spec=Request)

    # Test exception
    test_exception = ValueError("Test error")

    # Call the handler
    response = await global_exception_handler(mock_request, test_exception)

    # Check response
    assert response.status_code == 500
    # Access the response content properly
    import json

    response_data = json.loads(response.body)
    assert "Internal server error" in response_data["detail"]
    assert response_data["type"] == "ValueError"


@pytest.mark.asyncio
async def test_validation_exception_handler():
    """Test the validation exception handler."""
    from app.main import validation_exception_handler

    # Mock request
    mock_request = Mock(spec=Request)

    # Create a validation error
    validation_error = RequestValidationError(
        [
            {
                "type": "missing",
                "loc": ("body", "field"),
                "msg": "field required",
                "input": None,
            }
        ]
    )

    # Call the handler
    response = await validation_exception_handler(mock_request, validation_error)

    # Check response
    assert response.status_code == 422
    # Access the response content properly
    import json

    response_data = json.loads(response.body)
    assert "detail" in response_data
    assert len(response_data["detail"]) > 0
