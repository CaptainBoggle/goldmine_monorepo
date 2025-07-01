from fastapi import FastAPI

from .routers import tool_proxy, tools
from .services.tool_service import ToolService

app = FastAPI(
    title="Goldmine Backend API",
    description="Backend service for the Goldmine phenotype identification platform",
    version="1.0.0",
)


# Include routers
app.include_router(tools.router, prefix="/tools", tags=["tools"])
app.include_router(tool_proxy.router, prefix="/proxy", tags=["tool-proxy"])


@app.get("/")
async def root():
    return {"message": "Goldmine Backend API"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
