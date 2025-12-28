"""
Ollama Models API - List and manage Ollama models
"""

import os
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter(prefix="/api/ollama", tags=["ollama"])

# ============================================================================
# Models
# ============================================================================

class OllamaModel(BaseModel):
    """An Ollama model"""
    name: str
    size: Optional[str] = None
    modified_at: Optional[str] = None

class OllamaStatusResponse(BaseModel):
    """Ollama connection status"""
    connected: bool
    url: str
    error: Optional[str] = None

class OllamaModelsResponse(BaseModel):
    """List of installed Ollama models"""
    models: List[OllamaModel]
    connected: bool

# ============================================================================
# Endpoints
# ============================================================================

@router.get("/status", response_model=OllamaStatusResponse)
async def get_ollama_status():
    """Check if Ollama is running and accessible"""
    ollama_url = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
    
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{ollama_url}/api/version")
            if response.status_code == 200:
                return OllamaStatusResponse(connected=True, url=ollama_url)
            else:
                return OllamaStatusResponse(
                    connected=False, 
                    url=ollama_url,
                    error=f"Unexpected status: {response.status_code}"
                )
    except Exception as e:
        return OllamaStatusResponse(
            connected=False,
            url=ollama_url,
            error=str(e)
        )

@router.get("/models", response_model=OllamaModelsResponse)
async def list_ollama_models():
    """List all installed Ollama models"""
    ollama_url = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{ollama_url}/api/tags")
            if response.status_code == 200:
                data = response.json()
                models = []
                for model in data.get("models", []):
                    # Format size nicely
                    size_bytes = model.get("size", 0)
                    if size_bytes > 1_000_000_000:
                        size_str = f"{size_bytes / 1_000_000_000:.1f} GB"
                    elif size_bytes > 1_000_000:
                        size_str = f"{size_bytes / 1_000_000:.1f} MB"
                    else:
                        size_str = f"{size_bytes} bytes"
                    
                    models.append(OllamaModel(
                        name=model.get("name", ""),
                        size=size_str,
                        modified_at=model.get("modified_at", "")
                    ))
                return OllamaModelsResponse(models=models, connected=True)
            else:
                return OllamaModelsResponse(models=[], connected=False)
    except Exception as e:
        print(f"[Ollama] Error listing models: {e}")
        return OllamaModelsResponse(models=[], connected=False)
