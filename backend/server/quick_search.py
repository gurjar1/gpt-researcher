"""
Quick Search API - Perplexica-like fast search with LLM answer
Provides fast web search + LLM response with streaming and citations
"""

import os
import json
import asyncio
import httpx
from typing import AsyncGenerator, List, Dict, Any
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/api", tags=["quick-search"])

# ============================================================================
# Models
# ============================================================================

class ConversationMessage(BaseModel):
    """A message in conversation history"""
    role: str = Field(..., description="'user' or 'assistant'")
    content: str

class QuickSearchRequest(BaseModel):
    """Request for quick search"""
    query: str = Field(..., description="Search query")
    num_results: int = Field(5, description="Number of search results to use")
    model: str = Field("llama3.1", description="Ollama model to use")
    focus_mode: str = Field("quick", description="Focus mode: quick, reddit, news, shopping")
    conversation_history: List[ConversationMessage] = Field(default=[], description="Previous Q&A for context")

class SearchSource(BaseModel):
    """A search result source"""
    title: str
    url: str
    snippet: str

class QuickSearchResponse(BaseModel):
    """Response from quick search (for non-streaming)"""
    answer: str
    sources: List[SearchSource]
    query: str

# ============================================================================
# Helper Functions
# ============================================================================

# Import the multi-provider search manager
from backend.server.search_providers import get_search_manager

# Focus mode configurations (for prompt context only now)
FOCUS_MODE_CONFIG = {
    "quick": {"prompt_context": "general web search results"},
    "reddit": {"prompt_context": "Reddit discussions and community opinions"},
    "news": {"prompt_context": "recent news articles and current events"},
    "shopping": {"prompt_context": "shopping results and product prices"}
}

async def search_multi_provider(query: str, num_results: int = 5, focus_mode: str = "quick") -> List[Dict[str, Any]]:
    """Search using multi-provider manager with round-robin distribution and focus mode"""
    manager = get_search_manager()
    return await manager.search(query, num_results, focus_mode)


async def stream_ollama_response(
    query: str, 
    context: str, 
    sources: List[Dict], 
    model: str = "llama3.1",
    conversation_history: List[Dict] = None
) -> AsyncGenerator[str, None]:
    """Stream response from Ollama with context and conversation history"""
    ollama_url = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
    
    # Build prompt with sources for citations
    sources_text = "\n".join([
        f"[{i+1}] {s['title']}: {s['snippet']}" 
        for i, s in enumerate(sources)
    ])
    
    # Build conversation history text
    history_text = ""
    if conversation_history:
        history_text = "\nPrevious Conversation:\n"
        for msg in conversation_history[-6:]:  # Keep last 3 exchanges (6 messages)
            role = "User" if msg.get('role') == 'user' else "Assistant"
            history_text += f"{role}: {msg.get('content', '')[:500]}\n"  # Limit length
        history_text += "\n"
    
    prompt = f"""You are a helpful AI assistant. Answer the user's question based on the search results and conversation context below.
Include citations in your answer using [1], [2], etc. to reference the sources.
Be concise but comprehensive. Format your response in markdown.
{history_text}
Search Results:
{sources_text}

User Question: {query}

Answer with citations:"""

    async with httpx.AsyncClient() as client:
        try:
            async with client.stream(
                "POST",
                f"{ollama_url}/api/generate",
                json={
                    "model": model,
                    "prompt": prompt,
                    "stream": True
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
            print("[Ollama] Request cancelled by client")
            raise  # Re-raise to propagate cancellation
        except Exception as e:
            yield f"\n\nError: {str(e)}"

# ============================================================================
# Endpoints
# ============================================================================

@router.post("/quick-search")
async def quick_search(request: QuickSearchRequest, req: Request):
    """
    Quick search with LLM answer - streaming response.
    Returns sources first, then streams the answer.
    Handles client disconnection gracefully.
    """
    # Step 1: Search using multi-provider round-robin
    sources = await search_multi_provider(request.query, request.num_results, request.focus_mode)
    
    if not sources:
        raise HTTPException(status_code=503, detail=f"No results found for {request.focus_mode} mode")
    
    # Get focus mode context for prompt
    mode_config = FOCUS_MODE_CONFIG.get(request.focus_mode, FOCUS_MODE_CONFIG["quick"])
    prompt_context = mode_config["prompt_context"]
    
    # Build context from sources
    context = "\n\n".join([
        f"Source {i+1}: {s['title']}\n{s['snippet']}"
        for i, s in enumerate(sources)
    ])
    
    async def generate_response():
        # First, send the sources as JSON with mode info
        sources_data = {
            "type": "sources",
            "sources": sources,
            "query": request.query,
            "focus_mode": request.focus_mode
        }
        yield f"data: {json.dumps(sources_data)}\n\n"
        
        # Check if client disconnected before starting LLM
        if await req.is_disconnected():
            print(f"[QuickSearch] Client disconnected before LLM generation")
            return
        
        # Then stream the answer
        yield f"data: {json.dumps({'type': 'start'})}\n\n"
        
        try:
            async for chunk in stream_ollama_response(
                request.query, 
                context, 
                sources, 
                request.model,
                [msg.model_dump() for msg in request.conversation_history]
            ):
                # Check for client disconnect during streaming
                if await req.is_disconnected():
                    print(f"[QuickSearch] Client disconnected during LLM streaming")
                    return
                yield f"data: {json.dumps({'type': 'chunk', 'content': chunk})}\n\n"
        except asyncio.CancelledError:
            print(f"[QuickSearch] Request cancelled")
            return
        
        yield f"data: {json.dumps({'type': 'done'})}\n\n"
    
    return StreamingResponse(
        generate_response(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

@router.post("/quick-search-sync", response_model=QuickSearchResponse)
async def quick_search_sync(request: QuickSearchRequest):
    """
    Quick search with LLM answer - non-streaming response.
    Useful for testing or clients that don't support SSE.
    """
    # Step 1: Search using multi-provider
    sources = await search_multi_provider(request.query, request.num_results)
    
    if not sources:
        raise HTTPException(status_code=503, detail="No search results found")
    
    # Step 2: Get LLM response
    context = "\n\n".join([
        f"Source {i+1}: {s['title']}\n{s['snippet']}"
        for i, s in enumerate(sources)
    ])
    
    answer_parts = []
    async for chunk in stream_ollama_response(
        request.query, 
        context, 
        sources, 
        request.model
    ):
        answer_parts.append(chunk)
    
    return QuickSearchResponse(
        answer="".join(answer_parts),
        sources=[SearchSource(**s) for s in sources],
        query=request.query
    )

@router.get("/search-usage")
async def get_search_usage():
    """
    Get current search provider usage statistics.
    Shows quota usage for each configured provider.
    """
    manager = get_search_manager()
    return manager.get_usage_stats()
