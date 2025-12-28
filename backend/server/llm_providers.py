"""
Unified LLM Providers - Support for multiple local LLM backends
All backends use OpenAI-compatible API format for consistency
"""

import os
import json
import asyncio
import httpx
from typing import AsyncGenerator, List, Dict, Any, Optional
from enum import Enum
from pydantic import BaseModel


class LLMBackend(str, Enum):
    """Supported LLM backends"""
    OLLAMA = "ollama"
    LM_STUDIO = "lm_studio"
    LOCAL_AI = "local_ai"
    VLLM = "vllm"
    TEXT_GEN_WEBUI = "text_gen_webui"


# Default configurations for each backend
BACKEND_CONFIGS = {
    LLMBackend.OLLAMA: {
        "name": "Ollama",
        "default_url": "http://localhost:11434",
        "models_endpoint": "/api/tags",
        "chat_endpoint": "/api/generate",  # Use native for streaming
        "openai_compatible": True,
        "openai_chat_endpoint": "/v1/chat/completions",
    },
    LLMBackend.LM_STUDIO: {
        "name": "LM Studio",
        "default_url": "http://localhost:1234",
        "models_endpoint": "/v1/models",
        "chat_endpoint": "/v1/chat/completions",
        "openai_compatible": True,
    },
    LLMBackend.LOCAL_AI: {
        "name": "LocalAI",
        "default_url": "http://localhost:8080",
        "models_endpoint": "/v1/models",
        "chat_endpoint": "/v1/chat/completions",
        "openai_compatible": True,
    },
    LLMBackend.VLLM: {
        "name": "vLLM",
        "default_url": "http://localhost:8000",
        "models_endpoint": "/v1/models",
        "chat_endpoint": "/v1/chat/completions",
        "openai_compatible": True,
    },
    LLMBackend.TEXT_GEN_WEBUI: {
        "name": "text-generation-webui",
        "default_url": "http://localhost:5000",
        "models_endpoint": "/v1/models",
        "chat_endpoint": "/v1/chat/completions",
        "openai_compatible": True,
    },
}


class LLMProvider:
    """Unified interface for all LLM backends"""
    
    def __init__(self, backend: LLMBackend = LLMBackend.OLLAMA, base_url: Optional[str] = None):
        self.backend = backend
        self.config = BACKEND_CONFIGS[backend]
        self.base_url = base_url or self.config["default_url"]
    
    async def check_connection(self) -> Dict[str, Any]:
        """Check if the backend is accessible"""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                # Try models endpoint first
                response = await client.get(f"{self.base_url}{self.config['models_endpoint']}")
                if response.status_code == 200:
                    return {"connected": True, "backend": self.backend.value, "url": self.base_url}
                return {"connected": False, "backend": self.backend.value, "error": f"Status {response.status_code}"}
        except Exception as e:
            return {"connected": False, "backend": self.backend.value, "url": self.base_url, "error": str(e)}
    
    async def list_models(self) -> List[Dict[str, Any]]:
        """List available models from the backend"""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(f"{self.base_url}{self.config['models_endpoint']}")
                if response.status_code != 200:
                    return []
                
                data = response.json()
                
                # Parse based on backend format
                if self.backend == LLMBackend.OLLAMA:
                    # Ollama format: {"models": [{"name": "...", "size": ...}]}
                    models = []
                    for model in data.get("models", []):
                        size_bytes = model.get("size", 0)
                        size_str = f"{size_bytes / 1_000_000_000:.1f} GB" if size_bytes > 1_000_000_000 else f"{size_bytes / 1_000_000:.1f} MB"
                        models.append({
                            "name": model.get("name", ""),
                            "size": size_str,
                        })
                    return models
                else:
                    # OpenAI format: {"data": [{"id": "..."}]}
                    models = []
                    for model in data.get("data", []):
                        models.append({
                            "name": model.get("id", ""),
                            "size": None,
                        })
                    return models
        except Exception as e:
            print(f"[LLMProvider] Error listing models: {e}")
            return []
    
    async def stream_chat(
        self,
        messages: List[Dict[str, str]],
        model: str,
        temperature: float = 0.7,
    ) -> AsyncGenerator[str, None]:
        """Stream chat completion from the backend"""
        
        if self.backend == LLMBackend.OLLAMA:
            # Use Ollama native API for better streaming
            async for chunk in self._stream_ollama_native(messages, model, temperature):
                yield chunk
        else:
            # Use OpenAI-compatible API
            async for chunk in self._stream_openai_compatible(messages, model, temperature):
                yield chunk
    
    async def _stream_ollama_native(
        self,
        messages: List[Dict[str, str]],
        model: str,
        temperature: float,
    ) -> AsyncGenerator[str, None]:
        """Stream from Ollama using native /api/generate endpoint"""
        # Convert messages to prompt
        prompt = ""
        for msg in messages:
            if msg["role"] == "system":
                prompt += f"{msg['content']}\n\n"
            elif msg["role"] == "user":
                prompt += f"User: {msg['content']}\n"
            elif msg["role"] == "assistant":
                prompt += f"Assistant: {msg['content']}\n"
        prompt += "Assistant:"
        
        async with httpx.AsyncClient() as client:
            try:
                async with client.stream(
                    "POST",
                    f"{self.base_url}/api/generate",
                    json={
                        "model": model,
                        "prompt": prompt,
                        "stream": True,
                        "options": {"temperature": temperature},
                    },
                    timeout=120.0
                ) as response:
                    async for line in response.aiter_lines():
                        if line:
                            try:
                                data = json.loads(line)
                                if "response" in data:
                                    yield data["response"]
                            except json.JSONDecodeError:
                                continue
            except asyncio.CancelledError:
                raise
            except Exception as e:
                yield f"\n\nError: {str(e)}"
    
    async def _stream_openai_compatible(
        self,
        messages: List[Dict[str, str]],
        model: str,
        temperature: float,
    ) -> AsyncGenerator[str, None]:
        """Stream from OpenAI-compatible endpoint"""
        async with httpx.AsyncClient() as client:
            try:
                async with client.stream(
                    "POST",
                    f"{self.base_url}{self.config['chat_endpoint']}",
                    json={
                        "model": model,
                        "messages": messages,
                        "stream": True,
                        "temperature": temperature,
                    },
                    timeout=120.0
                ) as response:
                    async for line in response.aiter_lines():
                        if line.startswith("data: "):
                            data_str = line[6:]
                            if data_str.strip() == "[DONE]":
                                break
                            try:
                                data = json.loads(data_str)
                                delta = data.get("choices", [{}])[0].get("delta", {})
                                if "content" in delta:
                                    yield delta["content"]
                            except json.JSONDecodeError:
                                continue
            except asyncio.CancelledError:
                raise
            except Exception as e:
                yield f"\n\nError: {str(e)}"


def get_llm_provider(backend: str = "ollama", base_url: Optional[str] = None) -> LLMProvider:
    """Factory function to get LLM provider instance"""
    try:
        backend_enum = LLMBackend(backend)
    except ValueError:
        backend_enum = LLMBackend.OLLAMA
    
    # Use environment variable if no URL provided
    if base_url is None:
        env_key = f"{backend.upper()}_BASE_URL"
        base_url = os.environ.get(env_key) or BACKEND_CONFIGS[backend_enum]["default_url"]
    
    return LLMProvider(backend_enum, base_url)


# Export backend info for frontend
def get_backend_info() -> List[Dict[str, Any]]:
    """Get information about all supported backends"""
    return [
        {
            "id": backend.value,
            "name": config["name"],
            "default_url": config["default_url"],
        }
        for backend, config in BACKEND_CONFIGS.items()
    ]
