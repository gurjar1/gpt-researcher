"""
End-to-end test of GPT Researcher with local Ollama + SearXNG
"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

async def run_research():
    """Run a simple research query"""
    from gpt_researcher import GPTResearcher
    
    query = "What are the latest developments in local AI models like Ollama?"
    
    print("=" * 70)
    print("GPT Researcher - End-to-End Test")
    print("=" * 70)
    print(f"\nQuery: {query}")
    print(f"Report Type: research_report")
    print(f"LLM: {os.environ.get('SMART_LLM', 'NOT SET')}")
    print(f"Retriever: {os.environ.get('RETRIEVER', 'NOT SET')}")
    print("\n" + "-" * 70)
    print("Starting research... (this may take a few minutes)")
    print("-" * 70 + "\n")
    
    try:
        # Create researcher instance
        researcher = GPTResearcher(
            query=query,
            report_type="research_report",
            report_source="web"
        )
        
        # Conduct research
        research_result = await researcher.conduct_research()
        
        print("\n" + "-" * 70)
        print("Research completed! Generating report...")
        print("-" * 70 + "\n")
        
        # Generate report
        report = await researcher.write_report()
        
        print("\n" + "=" * 70)
        print("FINAL REPORT")
        print("=" * 70)
        print(report)
        
        # Get sources
        sources = researcher.get_source_urls()
        print("\n" + "-" * 70)
        print(f"Sources Used ({len(sources)} total):")
        print("-" * 70)
        for i, url in enumerate(sources[:10], 1):
            print(f"  {i}. {url[:80]}...")
        
        # Save report
        with open("test_report.md", "w", encoding="utf-8") as f:
            f.write(report)
            f.write("\n\n## Sources\n")
            for url in sources:
                f.write(f"- {url}\n")
        
        print(f"\n✅ Report saved to test_report.md")
        return True
        
    except Exception as e:
        print(f"\n❌ Research failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = asyncio.run(run_research())
    exit(0 if success else 1)
