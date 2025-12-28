"""Test to trace OpenAI error in GPT Researcher"""
import asyncio
from dotenv import load_dotenv
load_dotenv()

async def test():
    from gpt_researcher import GPTResearcher
    r = GPTResearcher('test query')
    print("Researcher created, running research...")
    await r.conduct_research()
    print("Research complete!")

asyncio.run(test())
