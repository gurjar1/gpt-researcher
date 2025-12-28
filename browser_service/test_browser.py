"""
Test script for the browser-use microservice
Using a simpler approach without the full browser-use Agent
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from dotenv import load_dotenv
load_dotenv()

async def test_extract():
    """Test the extract endpoint by fetching a page with Playwright"""
    print("\n" + "="*60)
    print("Browser Service - Extract Test")
    print("="*60)
    
    from playwright.async_api import async_playwright
    
    url = "https://ollama.com/"
    print(f"\nExtracting content from: {url}")
    
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            
            await page.goto(url, timeout=30000)
            content = await page.inner_text("body")
            
            await browser.close()
            
            print(f"✅ Extracted {len(content)} characters")
            print(f"\nFirst 500 chars:\n{content[:500]}...")
            return True
            
    except Exception as e:
        print(f"❌ Extract failed: {e}")
        return False

async def test_browser_automation():
    """Test direct Playwright automation (skip browser-use agent for now)"""
    print("\n" + "="*60)
    print("Browser Automation Test (Direct Playwright)")
    print("="*60)
    
    from playwright.async_api import async_playwright
    
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            
            # Navigate to a search engine
            print("\n1. Navigating to DuckDuckGo...")
            await page.goto("https://duckduckgo.com/", timeout=30000)
            
            # Search for something
            print("2. Searching for 'Ollama AI'...")
            await page.fill('input[name="q"]', 'Ollama AI')
            await page.press('input[name="q"]', 'Enter')
            
            # Wait for results
            await page.wait_for_selector('[data-testid="result"]', timeout=10000)
            
            # Get results
            results = await page.query_selector_all('[data-testid="result"]')
            print(f"3. Found {len(results)} search results")
            
            # Get first result text
            if results:
                first_result = await results[0].inner_text()
                print(f"\nFirst result:\n{first_result[:300]}...")
            
            await browser.close()
            print("\n✅ Browser automation working!")
            return True
            
    except Exception as e:
        print(f"❌ Browser automation failed: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_ollama_connection():
    """Test that Ollama is accessible"""
    print("\n" + "="*60)
    print("Ollama Connection Test")
    print("="*60)
    
    import httpx
    
    ollama_url = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
    print(f"\nTesting Ollama at: {ollama_url}")
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{ollama_url}/api/tags", timeout=10.0)
            if response.status_code == 200:
                data = response.json()
                models = [m["name"] for m in data.get("models", [])]
                print(f"✅ Ollama connected! Models: {', '.join(models[:3])}")
                return True
            else:
                print(f"❌ Ollama returned {response.status_code}")
                return False
    except Exception as e:
        print(f"❌ Ollama connection failed: {e}")
        return False

async def main():
    print("="*60)
    print("Browser Service Tests")
    print("="*60)
    
    results = []
    
    # Test 1: Basic extraction with Playwright
    results.append(("Playwright Extract", await test_extract()))
    
    # Test 2: Browser automation
    results.append(("Browser Automation", await test_browser_automation()))
    
    # Test 3: Ollama connection
    results.append(("Ollama Connection", await test_ollama_connection()))
    
    # Summary
    print("\n" + "="*60)
    print("SUMMARY")
    print("="*60)
    
    all_passed = True
    for name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"  {name}: {status}")
        if not passed:
            all_passed = False
    
    if all_passed:
        print("\n🎉 All browser tests passed!")
        print("\nNote: browser-use Agent integration has a compatibility issue")
        print("with the ChatOllama 'provider' attribute. The microservice will")
        print("use direct Playwright control for now, with Ollama for analysis.")
    else:
        print("\n⚠️  Some tests failed.")
    
    return all_passed

if __name__ == "__main__":
    asyncio.run(main())
