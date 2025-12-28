"""Test the running browser service"""
import asyncio
import httpx

async def test_browse():
    async with httpx.AsyncClient() as client:
        print("Testing /browse endpoint...")
        response = await client.post(
            'http://localhost:8001/browse',
            json={
                'url': 'https://ollama.com',
                'task': 'tell me what this site is about',
                'use_llm': True
            },
            timeout=120.0
        )
        data = response.json()
        print(f"Success: {data.get('success')}")
        print(f"Title: {data.get('title')}")
        print(f"Content length: {len(data.get('content', ''))}")
        print(f"\nAnalysis:\n{data.get('analysis', 'No analysis')}")

asyncio.run(test_browse())
