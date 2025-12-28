"""
LLM Backend API - Unified endpoints for all supported LLM backends
"""

import os
from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import List, Optional

from server.llm_providers import get_llm_provider, get_backend_info, LLMBackend

router = APIRouter(prefix="/api/llm", tags=["llm"])


# ============================================================================
# Models
# ============================================================================

class LLMModel(BaseModel):
    """An LLM model"""
    name: str
    size: Optional[str] = None

class BackendInfo(BaseModel):
    """Information about a backend"""
    id: str
    name: str
    default_url: str

class BackendStatusResponse(BaseModel):
    """Backend connection status"""
    connected: bool
    backend: str
    url: str
    error: Optional[str] = None

class ModelsResponse(BaseModel):
    """List of available models"""
    models: List[LLMModel]
    connected: bool
    backend: str


# ============================================================================
# Endpoints
# ============================================================================

@router.get("/backends", response_model=List[BackendInfo])
async def list_backends():
    """List all supported LLM backends"""
    return get_backend_info()


@router.get("/status", response_model=BackendStatusResponse)
async def get_backend_status(
    backend: str = Query("ollama", description="Backend type"),
    url: Optional[str] = Query(None, description="Custom backend URL")
):
    """Check if a specific backend is accessible"""
    provider = get_llm_provider(backend, url)
    result = await provider.check_connection()
    return BackendStatusResponse(**result)


@router.get("/models", response_model=ModelsResponse)
async def list_backend_models(
    backend: str = Query("ollama", description="Backend type"),
    url: Optional[str] = Query(None, description="Custom backend URL")
):
    """List models from a specific backend"""
    provider = get_llm_provider(backend, url)
    
    # Check connection first
    status = await provider.check_connection()
    if not status["connected"]:
        return ModelsResponse(models=[], connected=False, backend=backend)
    
    # Get models
    models = await provider.list_models()
    return ModelsResponse(
        models=[LLMModel(**m) for m in models],
        connected=True,
        backend=backend
    )
