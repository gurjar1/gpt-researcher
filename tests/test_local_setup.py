"""
Test script to verify GPT Researcher works with local Ollama + SearXNG
"""
import asyncio
import os
import sys

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

async def test_searxng_connection():
    """Test that SearXNG is accessible"""
    import requests
    
    searx_url = os.environ.get("SEARX_URL", "http://localhost:8888")
    print(f"\n1. Testing SearXNG connection at {searx_url}...")
    
    try:
        response = requests.get(
            f"{searx_url}/search",
            params={"q": "test query", "format": "json"},
            headers={
                "Accept": "application/json",
                "X-Forwarded-For": "127.0.0.1",
                "X-Real-IP": "127.0.0.1"
            },
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ SearXNG working! Found {len(data.get('results', []))} results")
            return True
        else:
            print(f"   ❌ SearXNG returned status {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ SearXNG connection failed: {e}")
        return False

async def test_ollama_connection():
    """Test that Ollama is accessible"""
    import requests
    
    ollama_url = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
    print(f"\n2. Testing Ollama connection at {ollama_url}...")
    
    try:
        # Test basic connection
        response = requests.get(f"{ollama_url}/api/tags", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            models = [m["name"] for m in data.get("models", [])]
            print(f"   ✅ Ollama working! Available models: {', '.join(models[:5])}")
            
            # Check for required models
            required = ["llama3.1", "llama3.2"]
            missing = [m for m in required if not any(m in model for model in models)]
            if missing:
                print(f"   ⚠️  Missing recommended models: {', '.join(missing)}")
                print(f"      Run: ollama pull {missing[0]}")
            return True
        else:
            print(f"   ❌ Ollama returned status {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Ollama connection failed: {e}")
        print(f"      Make sure Ollama is running: ollama serve")
        return False

async def test_llm_provider():
    """Test that we can create an LLM provider with Ollama"""
    print("\n3. Testing LLM Provider with Ollama...")
    
    try:
        from gpt_researcher.llm_provider import GenericLLMProvider
        
        llm_provider = GenericLLMProvider.from_provider(
            "ollama",
            model="llama3.1",
            temperature=0.4
        )
        
        # Simple test prompt
        messages = [{"role": "user", "content": "Say 'Hello World' and nothing else."}]
        response = await llm_provider.get_chat_response(messages, stream=False)
        
        print(f"   ✅ LLM Provider working!")
        print(f"      Response: {response[:100]}...")
        return True
        
    except Exception as e:
        print(f"   ❌ LLM Provider failed: {e}")
        return False

async def test_searx_retriever():
    """Test the SearXNG retriever"""
    print("\n4. Testing SearXNG Retriever...")
    
    try:
        from gpt_researcher.retrievers.searx.searx import SearxSearch
        
        searcher = SearxSearch("latest AI news")
        results = searcher.search(max_results=5)
        
        print(f"   ✅ SearXNG Retriever working! Found {len(results)} results")
        for i, result in enumerate(results[:3], 1):
            print(f"      {i}. {result.get('href', 'No URL')[:60]}...")
        return True
        
    except Exception as e:
        print(f"   ❌ SearXNG Retriever failed: {e}")
        return False

async def main():
    print("=" * 60)
    print("GPT Researcher - Local Setup Verification")
    print("=" * 60)
    
    # Load environment
    print(f"\nConfiguration:")
    print(f"  FAST_LLM: {os.environ.get('FAST_LLM', 'NOT SET')}")
    print(f"  SMART_LLM: {os.environ.get('SMART_LLM', 'NOT SET')}")
    print(f"  RETRIEVER: {os.environ.get('RETRIEVER', 'NOT SET')}")
    print(f"  SEARX_URL: {os.environ.get('SEARX_URL', 'NOT SET')}")
    print(f"  OLLAMA_BASE_URL: {os.environ.get('OLLAMA_BASE_URL', 'NOT SET')}")
    
    results = []
    
    # Run tests
    results.append(await test_searxng_connection())
    results.append(await test_ollama_connection())
    results.append(await test_searx_retriever())
    results.append(await test_llm_provider())
    
    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    
    tests = ["SearXNG", "Ollama", "Retriever", "LLM Provider"]
    all_passed = True
    for name, passed in zip(tests, results):
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"  {name}: {status}")
        if not passed:
            all_passed = False
    
    if all_passed:
        print("\n🎉 All tests passed! GPT Researcher is ready for local use.")
    else:
        print("\n⚠️  Some tests failed. Please fix the issues above.")

if __name__ == "__main__":
    asyncio.run(main())
