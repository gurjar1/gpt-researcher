"""
Browser Service - FastAPI Microservice
Provides browser automation via Playwright with Ollama for content analysis.
Designed to run as a separate process to integrate with GPT Researcher.
"""

import asyncio
import os
import sys
import uuid
import base64
from typing import Optional, List
from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
from dotenv import load_dotenv

load_dotenv()

# ============================================================================
# Models
# ============================================================================

class BrowseRequest(BaseModel):
    """Request to browse and extract content from a URL"""
    url: str = Field(..., description="URL to browse")
    task: Optional[str] = Field(None, description="What to look for on the page")
    wait_for: Optional[str] = Field(None, description="CSS selector to wait for")
    timeout: int = Field(30000, description="Timeout in milliseconds")
    take_screenshot: bool = Field(False, description="Capture screenshot")
    use_llm: bool = Field(True, description="Use Ollama to analyze content")
    model: str = Field("llama3.1", description="Ollama model for analysis")

class BrowseResponse(BaseModel):
    """Response from browsing a URL"""
    success: bool
    url: str
    title: Optional[str] = None
    content: Optional[str] = None
    analysis: Optional[str] = None
    screenshot_b64: Optional[str] = None
    error: Optional[str] = None

class SearchRequest(BaseModel):
    """Request to search the web"""
    query: str = Field(..., description="Search query")
    num_results: int = Field(5, description="Number of results to return")
    search_engine: str = Field("duckduckgo", description="Search engine to use")

class SearchResult(BaseModel):
    """A single search result"""
    title: str
    url: str
    snippet: str

class SearchResponse(BaseModel):
    """Response from web search"""
    success: bool
    query: str
    results: List[SearchResult] = []
    error: Optional[str] = None

class ExtractRequest(BaseModel):
    """Request to extract content from URL"""
    url: str = Field(..., description="URL to extract from")
    extract_type: str = Field("text", description="'text', 'html', or 'screenshot'")
    wait_for: Optional[str] = Field(None, description="CSS selector to wait for")
    timeout: int = Field(30000, description="Timeout in milliseconds")

class ExtractResponse(BaseModel):
    """Response from extraction"""
    success: bool
    content: Optional[str] = None
    content_type: str = "text"
    error: Optional[str] = None

# ============================================================================
# App Setup
# ============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 Browser Service starting on port 8001...")
    yield
    print("👋 Browser Service shutting down...")

app = FastAPI(
    title="Browser Service",
    description="Browser automation with Playwright + Ollama analysis",
    version="1.0.0",
    lifespan=lifespan
)

# ============================================================================
# Helper Functions
# ============================================================================

async def analyze_with_ollama(content: str, task: str, model: str = "llama3.1") -> str:
    """Use Ollama to analyze page content"""
    import httpx
    
    ollama_url = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
    
    prompt = f"""Analyze the following web page content and {task}

Content:
{content[:8000]}  # Limit content length

Provide a concise analysis:"""

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{ollama_url}/api/generate",
                json={
                    "model": model,
                    "prompt": prompt,
                    "stream": False
                },
                timeout=120.0
            )
            if response.status_code == 200:
                return response.json().get("response", "No analysis generated")
            else:
                return f"Ollama error: {response.status_code}"
    except Exception as e:
        return f"Analysis failed: {str(e)}"

# ============================================================================
# Endpoints
# ============================================================================

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "ollama_url": os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434"),
        "timestamp": datetime.utcnow().isoformat()
    }

@app.post("/browse", response_model=BrowseResponse)
async def browse(request: BrowseRequest):
    """
    Browse a URL, extract content, and optionally analyze with Ollama.
    """
    try:
        from playwright.async_api import async_playwright
        
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            
            # Navigate
            await page.goto(request.url, timeout=request.timeout)
            
            # Wait for selector if specified
            if request.wait_for:
                await page.wait_for_selector(request.wait_for, timeout=request.timeout)
            
            # Get title and content
            title = await page.title()
            content = await page.inner_text("body")
            
            # Screenshot if requested
            screenshot_b64 = None
            if request.take_screenshot:
                screenshot = await page.screenshot(full_page=True)
                screenshot_b64 = base64.b64encode(screenshot).decode()
            
            await browser.close()
            
            # Analyze with Ollama if requested
            analysis = None
            if request.use_llm and request.task:
                analysis = await analyze_with_ollama(content, request.task, request.model)
            
            return BrowseResponse(
                success=True,
                url=request.url,
                title=title,
                content=content[:10000],  # Limit content
                analysis=analysis,
                screenshot_b64=screenshot_b64
            )
            
    except Exception as e:
        return BrowseResponse(
            success=False,
            url=request.url,
            error=str(e)
        )

@app.post("/search", response_model=SearchResponse)
async def search(request: SearchRequest):
    """
    Perform a web search using real browser (Playwright).
    Uses DuckDuckGo for stable parsing - provides local results via IP.
    Supports focus modes: general, reddit, news, shopping
    """
    try:
        from playwright.async_api import async_playwright
        from urllib.parse import quote_plus
        
        query = quote_plus(request.query)
        search_engine = request.search_engine.lower()
        
        # Use DuckDuckGo for general searches (more stable HTML)
        if search_engine == "reddit":
            search_url = f"https://www.google.com/search?q=site:reddit.com+{query}"
        elif search_engine == "news":
            search_url = f"https://duckduckgo.com/?q={query}&iar=news&ia=news"
        elif search_engine == "shopping":
            # Use Google Shopping for this
            search_url = f"https://www.google.com/search?q={query}&tbm=shop"
        else:
            search_url = f"https://duckduckgo.com/?q={query}"
        
        async with async_playwright() as p:
            browser = await p.chromium.launch(
                headless=True,
                args=['--disable-blink-features=AutomationControlled', '--no-sandbox']
            )
            
            context = await browser.new_context(
                viewport={'width': 1920, 'height': 1080},
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                locale='en-US'
            )
            
            page = await context.new_page()
            await page.goto(search_url, timeout=30000)
            await page.wait_for_timeout(3000)  # Wait for JS to render
            
            results = []
            
            if search_engine in ["quick", "google", "reddit"]:
                # DuckDuckGo result parsing
                items = await page.query_selector_all('[data-result]')
                if not items:
                    items = await page.query_selector_all('article[data-nrn]')
                if not items:
                    items = await page.query_selector_all('.result')
                
                for item in items[:request.num_results]:
                    try:
                        # Title
                        title_el = await item.query_selector('h2 a, a[data-testid="result-title-a"]')
                        title = await title_el.inner_text() if title_el else ""
                        
                        # URL
                        link_el = await item.query_selector('a[href^="http"]')
                        url = await link_el.get_attribute('href') if link_el else ""
                        
                        # Snippet
                        snippet_el = await item.query_selector('[data-result-snippet], .result__snippet')
                        snippet = await snippet_el.inner_text() if snippet_el else ""
                        
                        if title and url and url.startswith('http'):
                            results.append(SearchResult(title=title, url=url, snippet=snippet))
                    except:
                        continue
            
            elif search_engine == "news":
                # DuckDuckGo News parsing
                items = await page.query_selector_all('[data-nrn="result"]')
                if not items:
                    items = await page.query_selector_all('.result--news')
                
                for item in items[:request.num_results]:
                    try:
                        title_el = await item.query_selector('h2, .result__title')
                        title = await title_el.inner_text() if title_el else ""
                        
                        link_el = await item.query_selector('a[href^="http"]')
                        url = await link_el.get_attribute('href') if link_el else ""
                        
                        snippet_el = await item.query_selector('.result__snippet')
                        snippet = await snippet_el.inner_text() if snippet_el else ""
                        
                        if title:
                            results.append(SearchResult(title=title, url=url or "", snippet=snippet))
                    except:
                        continue
            
            elif search_engine == "shopping":
                # Google Shopping (fallback to getting any product-like results)
                items = await page.query_selector_all('[data-sh-gr], .sh-dgr__content, .pla-unit')
                for item in items[:request.num_results]:
                    try:
                        title_el = await item.query_selector('h3, h4, a[aria-label]')
                        title = await title_el.inner_text() if title_el else await title_el.get_attribute('aria-label') if title_el else ""
                        
                        link_el = await item.query_selector('a[href]')
                        url = await link_el.get_attribute('href') if link_el else ""
                        
                        price_el = await item.query_selector('.a8Pemb, .HRLxBb, span[aria-label*="₹"], span[aria-label*="$"]')
                        price = await price_el.inner_text() if price_el else ""
                        
                        if title:
                            results.append(SearchResult(title=title, url=url or "", snippet=f"Price: {price}" if price else ""))
                    except:
                        continue
            
            await browser.close()
            
            if not results:
                return SearchResponse(
                    success=False,
                    query=request.query,
                    error="No results found. The search engine may have blocked the request."
                )
            
            return SearchResponse(success=True, query=request.query, results=results)
            
    except Exception as e:
        return SearchResponse(success=False, query=request.query, error=str(e))

@app.post("/extract", response_model=ExtractResponse)
async def extract_content(request: ExtractRequest):
    """
    Extract content from a URL using browser rendering.
    Good for JavaScript-heavy pages.
    """
    try:
        from playwright.async_api import async_playwright
        
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            
            await page.goto(request.url, timeout=request.timeout)
            
            if request.wait_for:
                await page.wait_for_selector(request.wait_for, timeout=request.timeout)
            
            if request.extract_type == "text":
                content = await page.inner_text("body")
            elif request.extract_type == "html":
                content = await page.content()
            elif request.extract_type == "screenshot":
                screenshot = await page.screenshot(full_page=True)
                content = base64.b64encode(screenshot).decode()
            else:
                content = await page.inner_text("body")
            
            await browser.close()
            
            return ExtractResponse(
                success=True,
                content=content,
                content_type=request.extract_type
            )
            
    except Exception as e:
        return ExtractResponse(
            success=False,
            error=str(e)
        )

# ============================================================================
# Main
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("BROWSER_SERVICE_PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)
