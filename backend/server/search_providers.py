"""
Multi-Provider Search System
Distributes queries across SearXNG, DDG, and paid APIs with round-robin + quota tracking.
"""

import os
import json
import httpx
from typing import List, Dict, Any, Optional
from datetime import datetime
from pathlib import Path
from dataclasses import dataclass, field

# ============================================================================
# Configuration
# ============================================================================

@dataclass
class SearchProvider:
    """Represents a search provider with quota tracking"""
    id: str
    provider_type: str  # searxng, ddg, tavily, brave, serper
    api_key: Optional[str] = None
    url: Optional[str] = None
    limit: Optional[int] = None  # None = unlimited
    used: int = 0

# ============================================================================
# Provider Manager
# ============================================================================

class SearchProviderManager:
    """Manages multiple search providers with round-robin distribution"""
    
    USAGE_FILE = Path(__file__).parent / "search_usage.json"
    
    def __init__(self):
        self.providers: List[SearchProvider] = []
        self.current_index = 0
        self._init_providers()
        self._load_usage()
    
    def _init_providers(self):
        """Initialize providers from environment variables"""
        
        # SearXNG (unlimited, always available)
        searx_url = os.environ.get("SEARX_URL")
        if searx_url:
            self.providers.append(SearchProvider(
                id="searxng",
                provider_type="searxng",
                url=searx_url,
                limit=None
            ))
        
        # Note: DDG Instant Answer API removed - only works for encyclopedia-style queries
        # Using SearXNG as primary unlimited provider
        
        # Tavily (1000/month per key)
        tavily_keys = os.environ.get("TAVILY_API_KEYS", "").split(",")
        for i, key in enumerate(tavily_keys):
            key = key.strip()
            if key:
                self.providers.append(SearchProvider(
                    id=f"tavily_{i+1}",
                    provider_type="tavily",
                    api_key=key,
                    limit=1000
                ))
        
        # Brave (2000/month per key)
        brave_keys = os.environ.get("BRAVE_API_KEYS", "").split(",")
        for i, key in enumerate(brave_keys):
            key = key.strip()
            if key:
                self.providers.append(SearchProvider(
                    id=f"brave_{i+1}",
                    provider_type="brave",
                    api_key=key,
                    limit=2000
                ))
        
        # Serper (2500 signup credits per key)
        serper_keys = os.environ.get("SERPER_API_KEYS", "").split(",")
        for i, key in enumerate(serper_keys):
            key = key.strip()
            if key:
                self.providers.append(SearchProvider(
                    id=f"serper_{i+1}",
                    provider_type="serper",
                    api_key=key,
                    limit=2500
                ))
        
        # Exa.ai (1000/month per key)
        exa_keys = os.environ.get("EXA_API_KEYS", "").split(",")
        for i, key in enumerate(exa_keys):
            key = key.strip()
            if key:
                self.providers.append(SearchProvider(
                    id=f"exa_{i+1}",
                    provider_type="exa",
                    api_key=key,
                    limit=1000
                ))
        
        # Linkup (free tier available)
        linkup_keys = os.environ.get("LINKUP_API_KEYS", "").split(",")
        for i, key in enumerate(linkup_keys):
            key = key.strip()
            if key:
                self.providers.append(SearchProvider(
                    id=f"linkup_{i+1}",
                    provider_type="linkup",
                    api_key=key,
                    limit=1000  # Adjust based on your plan
                ))
        
        print(f"[SearchProviders] Initialized {len(self.providers)} providers: {[p.id for p in self.providers]}")
    
    def _load_usage(self):
        """Load usage from JSON file, reset if new month"""
        try:
            if self.USAGE_FILE.exists():
                with open(self.USAGE_FILE) as f:
                    data = json.load(f)
                
                # Reset if new month
                current_month = datetime.now().strftime("%Y-%m")
                if data.get("month") != current_month:
                    print(f"[SearchProviders] New month, resetting usage")
                    self._save_usage()
                    return
                
                # Restore usage counters
                for provider in self.providers:
                    provider.used = data.get("usage", {}).get(provider.id, 0)
        except Exception as e:
            print(f"[SearchProviders] Error loading usage: {e}")
    
    def _save_usage(self):
        """Save usage to JSON file"""
        try:
            data = {
                "month": datetime.now().strftime("%Y-%m"),
                "usage": {p.id: p.used for p in self.providers if p.limit}
            }
            with open(self.USAGE_FILE, "w") as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            print(f"[SearchProviders] Error saving usage: {e}")
    
    def _get_next_provider(self) -> SearchProvider:
        """Get next available provider using round-robin with quota skip"""
        attempts = 0
        while attempts < len(self.providers):
            provider = self.providers[self.current_index % len(self.providers)]
            self.current_index += 1
            attempts += 1
            
            # Unlimited providers always available
            if provider.limit is None:
                return provider
            
            # Skip if quota exhausted
            if provider.used >= provider.limit:
                print(f"[SearchProviders] Skipping {provider.id} (quota exhausted: {provider.used}/{provider.limit})")
                continue
            
            return provider
        
        # All APIs exhausted - return SearXNG as fallback
        return next(p for p in self.providers if p.provider_type == "searxng")
    
    async def search(self, query: str, num_results: int = 5, focus_mode: str = "quick") -> List[Dict[str, Any]]:
        """Execute search using next available provider with focus mode support"""
        
        # Focus modes that need specific engines (only SearXNG supports this)
        filtered_modes = {"reddit", "news", "shopping"}
        
        if focus_mode in filtered_modes:
            # For filtered searches, prefer SearXNG first
            searxng_provider = next((p for p in self.providers if p.provider_type == "searxng"), None)
            if searxng_provider:
                print(f"[SearchProviders] Using SearXNG for {focus_mode} mode: {query[:50]}...")
                results = await self._search_searxng(searxng_provider, query, num_results, focus_mode)
                if results:
                    return results
                # If SearXNG fails, fall through to round-robin
                print(f"[SearchProviders] SearXNG returned no results for {focus_mode}, falling back to round-robin")
        
        # Regular round-robin for quick mode or if filtered search failed
        provider = self._get_next_provider()
        print(f"[SearchProviders] Using {provider.id} for query: {query[:50]}... (mode: {focus_mode})")
        
        try:
            if provider.provider_type == "searxng":
                results = await self._search_searxng(provider, query, num_results, focus_mode)
            elif provider.provider_type == "ddg":
                results = await self._search_ddg(query, num_results)
            elif provider.provider_type == "tavily":
                results = await self._search_tavily(provider, query, num_results)
            elif provider.provider_type == "brave":
                results = await self._search_brave(provider, query, num_results)
            elif provider.provider_type == "serper":
                results = await self._search_serper(provider, query, num_results)
            elif provider.provider_type == "exa":
                results = await self._search_exa(provider, query, num_results)
            elif provider.provider_type == "linkup":
                results = await self._search_linkup(provider, query, num_results)
            else:
                results = []
            
            # Increment usage for API providers
            if provider.limit and results:
                provider.used += 1
                self._save_usage()
            
            return results
            
        except Exception as e:
            print(f"[SearchProviders] Error with {provider.id}: {e}")
            # Try SearXNG as final fallback
            searxng_fallback = next((p for p in self.providers if p.provider_type == "searxng"), None)
            if searxng_fallback and provider.id != "searxng":
                try:
                    print(f"[SearchProviders] Retrying with SearXNG fallback")
                    return await self._search_searxng(searxng_fallback, query, num_results, focus_mode)
                except Exception as e2:
                    print(f"[SearchProviders] SearXNG fallback also failed: {e2}")
            # Try a different API provider if available
            for alt_provider in self.providers:
                if alt_provider.id != provider.id and alt_provider.provider_type not in ["searxng", "ddg"]:
                    if alt_provider.limit is None or alt_provider.used < alt_provider.limit:
                        try:
                            print(f"[SearchProviders] Trying alternative provider: {alt_provider.id}")
                            if alt_provider.provider_type == "tavily":
                                return await self._search_tavily(alt_provider, query, num_results)
                            elif alt_provider.provider_type == "serper":
                                return await self._search_serper(alt_provider, query, num_results)
                            elif alt_provider.provider_type == "exa":
                                return await self._search_exa(alt_provider, query, num_results)
                        except Exception:
                            continue
            return []
    
    # ========================================================================
    # Provider-specific search implementations
    # ========================================================================
    
    async def _search_searxng(self, provider: SearchProvider, query: str, num_results: int, focus_mode: str = "quick") -> List[Dict]:
        """Search using SearXNG with focus mode support"""
        # Build params based on focus mode
        params = {"q": query, "format": "json"}
        
        if focus_mode == "reddit":
            params["engines"] = "reddit"
        elif focus_mode == "news":
            params["categories"] = "news"
        elif focus_mode == "shopping":
            params["engines"] = "google shopping"
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{provider.url}/search",
                params=params,
                headers={"Accept": "application/json"},
                timeout=30.0
            )
            if response.status_code == 200:
                data = response.json()
                return [
                    {"title": r.get("title", ""), "url": r.get("url", ""), "snippet": r.get("content", "")}
                    for r in data.get("results", [])[:num_results]
                ]
        return []
    
    async def _search_ddg(self, query: str, num_results: int) -> List[Dict]:
        """Search using DuckDuckGo Instant Answer API"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.duckduckgo.com/",
                params={"q": query, "format": "json", "no_html": 1},
                timeout=30.0
            )
            if response.status_code == 200:
                data = response.json()
                results = []
                
                # Abstract result
                if data.get("AbstractText"):
                    results.append({
                        "title": data.get("Heading", query),
                        "url": data.get("AbstractURL", ""),
                        "snippet": data.get("AbstractText", "")
                    })
                
                # Related topics
                for topic in data.get("RelatedTopics", [])[:num_results-len(results)]:
                    if isinstance(topic, dict) and topic.get("Text"):
                        results.append({
                            "title": topic.get("Text", "")[:100],
                            "url": topic.get("FirstURL", ""),
                            "snippet": topic.get("Text", "")
                        })
                
                return results
        return []
    
    async def _search_tavily(self, provider: SearchProvider, query: str, num_results: int) -> List[Dict]:
        """Search using Tavily API"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.tavily.com/search",
                json={
                    "api_key": provider.api_key,
                    "query": query,
                    "max_results": num_results,
                    "include_answer": False
                },
                timeout=30.0
            )
            if response.status_code == 200:
                data = response.json()
                return [
                    {"title": r.get("title", ""), "url": r.get("url", ""), "snippet": r.get("content", "")}
                    for r in data.get("results", [])[:num_results]
                ]
        return []
    
    async def _search_brave(self, provider: SearchProvider, query: str, num_results: int) -> List[Dict]:
        """Search using Brave Search API"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.search.brave.com/res/v1/web/search",
                params={"q": query, "count": num_results},
                headers={"X-Subscription-Token": provider.api_key},
                timeout=30.0
            )
            if response.status_code == 200:
                data = response.json()
                return [
                    {"title": r.get("title", ""), "url": r.get("url", ""), "snippet": r.get("description", "")}
                    for r in data.get("web", {}).get("results", [])[:num_results]
                ]
        return []
    
    async def _search_serper(self, provider: SearchProvider, query: str, num_results: int) -> List[Dict]:
        """Search using Serper API (Google SERP)"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://google.serper.dev/search",
                json={"q": query, "num": num_results},
                headers={"X-API-KEY": provider.api_key},
                timeout=30.0
            )
            if response.status_code == 200:
                data = response.json()
                return [
                    {"title": r.get("title", ""), "url": r.get("link", ""), "snippet": r.get("snippet", "")}
                    for r in data.get("organic", [])[:num_results]
                ]
        return []
    
    async def _search_exa(self, provider: SearchProvider, query: str, num_results: int) -> List[Dict]:
        """Search using Exa.ai API (semantic search)"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.exa.ai/search",
                json={
                    "query": query,
                    "numResults": num_results,
                    "useAutoprompt": True,
                    "type": "neural"
                },
                headers={
                    "x-api-key": provider.api_key,
                    "Content-Type": "application/json"
                },
                timeout=30.0
            )
            if response.status_code == 200:
                data = response.json()
                return [
                    {"title": r.get("title", ""), "url": r.get("url", ""), "snippet": r.get("text", "")}
                    for r in data.get("results", [])[:num_results]
                ]
        return []
    
    async def _search_linkup(self, provider: SearchProvider, query: str, num_results: int) -> List[Dict]:
        """Search using Linkup API (web search with AI context)"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.linkup.so/v1/search",
                json={
                    "q": query,
                    "depth": "standard",
                    "outputType": "searchResults",
                    "maxResults": num_results
                },
                headers={
                    "Authorization": f"Bearer {provider.api_key}",
                    "Content-Type": "application/json"
                },
                timeout=30.0
            )
            if response.status_code == 200:
                data = response.json()
                return [
                    {"title": r.get("name", r.get("title", "")), "url": r.get("url", ""), "snippet": r.get("content", r.get("snippet", ""))}
                    for r in data.get("results", [])[:num_results]
                ]
        return []
    
    def get_usage_stats(self) -> Dict[str, Any]:
        """Get current usage statistics"""
        return {
            "month": datetime.now().strftime("%Y-%m"),
            "providers": [
                {
                    "id": p.id,
                    "type": p.provider_type,
                    "used": p.used,
                    "limit": p.limit,
                    "remaining": (p.limit - p.used) if p.limit else "unlimited"
                }
                for p in self.providers
            ]
        }


# Singleton instance
_manager: Optional[SearchProviderManager] = None

def get_search_manager() -> SearchProviderManager:
    """Get or create the search provider manager singleton"""
    global _manager
    if _manager is None:
        _manager = SearchProviderManager()
    return _manager
