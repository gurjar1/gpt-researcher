"""
Ollama Pull API - Download models from Ollama
"""

import os
import httpx
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/ollama", tags=["ollama-pull"])


class PullRequest(BaseModel):
    """Request to pull a model"""
    model: str


class PullResponse(BaseModel):
    """Response from pulling a model"""
    success: bool
    message: str
    model: str


@router.post("/pull", response_model=PullResponse)
async def pull_model(request: PullRequest):
    """
    Pull (download) a model from Ollama.
    Uses stream=true to start download immediately and return first response.
    """
    ollama_url = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
    
    try:
        # First check if Ollama is running
        async with httpx.AsyncClient(timeout=5.0) as client:
            try:
                check = await client.get(f"{ollama_url}/api/version")
                if check.status_code != 200:
                    return PullResponse(
                        success=False,
                        message="Ollama is not running. Please start Ollama first.",
                        model=request.model
                    )
            except Exception:
                return PullResponse(
                    success=False,
                    message="Cannot connect to Ollama. Make sure Ollama is running.",
                    model=request.model
                )
        
        # Start the pull with streaming - this returns immediately
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"{ollama_url}/api/pull",
                json={"name": request.model, "stream": True},
            )
            
            if response.status_code == 200:
                # Parse first line to check for immediate errors
                first_line = response.text.split('\n')[0] if response.text else ''
                if 'error' in first_line.lower():
                    return PullResponse(
                        success=False,
                        message=f"Error: {first_line}",
                        model=request.model
                    )
                
                return PullResponse(
                    success=True,
                    message=f"Downloading {request.model}... (this may take a few minutes)",
                    model=request.model
                )
            else:
                return PullResponse(
                    success=False,
                    message=f"Failed: HTTP {response.status_code}",
                    model=request.model
                )
    except httpx.TimeoutException:
        # Timeout is actually OK for streaming - the download started
        return PullResponse(
            success=True,
            message=f"Download started for {request.model}. Check Ollama for progress.",
            model=request.model
        )
    except Exception as e:
        return PullResponse(
            success=False,
            message=f"Error: {str(e)}",
            model=request.model
        )
