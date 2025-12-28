"""
Browser Service Client
Client module for GPT Researcher to communicate with the browser-use microservice.
"""

import os
import httpx
from typing import Optional, List, Dict, Any

BROWSER_SERVICE_URL = os.environ.get("BROWSER_SERVICE_URL", "http://localhost:8001")
DEFAULT_TIMEOUT = 120.0  # Browser tasks can take time


class BrowserServiceClient:
    """Client for the browser-use microservice"""
    
    def __init__(self, base_url: str = None):
        self.base_url = base_url or BROWSER_SERVICE_URL
        
    async def health_check(self) -> Dict[str, Any]:
        """Check if the browser service is healthy"""
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{self.base_url}/health", timeout=10.0)
            return response.json()
    
    async def browse(
        self,
        task: str,
        url: Optional[str] = None,
        max_steps: int = 10,
        use_vision: bool = False,
        headless: bool = True,
        model: str = "llama3.1"
    ) -> Dict[str, Any]:
        """
        Execute a browsing task using the browser agent.
        
        Args:
            task: Natural language description of what to do
            url: Optional starting URL
            max_steps: Maximum browser actions to take
            use_vision: Whether to use vision model for screenshots
            headless: Run browser without visible window
            model: Ollama model to use
            
        Returns:
            Dict with success, result, error, steps_taken, urls_visited
        """
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/browse",
                json={
                    "task": task,
                    "url": url,
                    "max_steps": max_steps,
                    "use_vision": use_vision,
                    "headless": headless,
                    "model": model
                },
                timeout=DEFAULT_TIMEOUT
            )
            return response.json()
    
    async def extract(
        self,
        url: str,
        extract_type: str = "text",
        wait_for: Optional[str] = None,
        timeout: int = 30000
    ) -> Dict[str, Any]:
        """
        Extract content from a URL using browser rendering.
        
        Args:
            url: URL to extract from
            extract_type: 'text', 'html', or 'screenshot'
            wait_for: CSS selector to wait for before extracting
            timeout: Page load timeout in milliseconds
            
        Returns:
            Dict with success, content, content_type, error
        """
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/extract",
                json={
                    "url": url,
                    "extract_type": extract_type,
                    "wait_for": wait_for,
                    "timeout": timeout
                },
                timeout=DEFAULT_TIMEOUT
            )
            return response.json()
    
    async def list_profiles(self) -> List[Dict[str, Any]]:
        """List available browser profiles"""
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{self.base_url}/profiles", timeout=10.0)
            return response.json()
    
    async def create_profile(
        self,
        name: str,
        description: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create a new browser profile for persistent sessions"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/profiles",
                json={"name": name, "description": description},
                timeout=10.0
            )
            return response.json()


# Convenience function for quick access
async def browser_browse(task: str, url: str = None, **kwargs) -> Dict[str, Any]:
    """Quick function to execute a browser task"""
    client = BrowserServiceClient()
    return await client.browse(task, url, **kwargs)


async def browser_extract(url: str, **kwargs) -> Dict[str, Any]:
    """Quick function to extract content from a URL"""
    client = BrowserServiceClient()
    return await client.extract(url, **kwargs)
