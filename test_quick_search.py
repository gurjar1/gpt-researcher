"""Test quick search API"""
import httpx
import asyncio

async def test_quick_search():
    print("Testing Quick Search API...")
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "http://localhost:8000/api/quick-search-sync",
            json={"query": "What is Ollama AI?", "num_results": 3},
            timeout=120.0
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"\n✅ Quick Search Success!")
            print(f"Query: {data['query']}")
            print(f"\nSources ({len(data['sources'])}):")
            for i, s in enumerate(data['sources'], 1):
                print(f"  [{i}] {s['title'][:50]}... - {s['url'][:50]}...")
            print(f"\nAnswer:\n{data['answer'][:500]}...")
        else:
            print(f"❌ Error: {response.status_code}")
            print(response.text)

asyncio.run(test_quick_search())
