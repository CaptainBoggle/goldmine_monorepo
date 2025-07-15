import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI

from .routers import corpora, tool_proxy, tools
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

# Include routers
app.include_router(tools.router, prefix="/tools", tags=["tools"])
app.include_router(tool_proxy.router, prefix="/proxy", tags=["tool-proxy"])
app.include_router(corpora.router, prefix="/corpora", tags=["corpora"])


@app.get("/")
async def root():
    return {"message": "Goldmine Backend API"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
