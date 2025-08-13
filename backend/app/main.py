import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from .routers import corpora, metrics, predictions, tool_proxy, tools
from .services.database import initialise_database


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Get database URL from environment or use default
    database_url = os.getenv(
        "DATABASE_URL", "postgresql://postgres:password@database:5432/postgres"
    )

    # Path to corpora directory in the container
    corpora_root = Path("/app/corpora")

    # Initialise database service and ingest corpora
    db_service = initialise_database(database_url, corpora_root)
    db_service.initialise_and_ingest()

    yield


app = FastAPI(
    title="Goldmine Backend API",
    description="Backend service for the Goldmine phenotype identification platform",
    version="1.0.0",
    lifespan=lifespan,
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler to return JSON errors instead of HTML."""
    import logging
    import traceback

    # Log the full error for debugging
    logging.error(f"Unhandled exception: {exc}")
    logging.error(f"Traceback: {traceback.format_exc()}")

    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {str(exc)}", "type": type(exc).__name__},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors and return JSON responses."""
    return JSONResponse(
        status_code=422, content={"detail": "Validation error", "errors": exc.errors()}
    )


# Include routers
app.include_router(tools.router, prefix="/tools", tags=["tools"])
app.include_router(tool_proxy.router, prefix="/proxy", tags=["tool-proxy"])
app.include_router(corpora.router, prefix="/corpora", tags=["corpora"])
app.include_router(predictions.router, prefix="/predictions", tags=["predictions"])
app.include_router(metrics.router, prefix="/metrics", tags=["metrics"])


@app.get("/")
async def root():
    return {"message": "Goldmine Backend API"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
