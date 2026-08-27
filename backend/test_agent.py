import asyncio
import sys
import io
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')
from app.core.database import AsyncSessionLocal
from app.agent.engine import AgentEngine

async def test_agent():
    print("Testing Agent conversation engine...")
    async with AsyncSessionLocal() as session:
        engine = AgentEngine(db=session, merchant_id="merchant_demo_apex_01")
        
        print("\n--- Test Query 1: 'Who owes me money and what is pending?' ---")
        async for chunk in engine.stream_chat("Who owes me money and what is pending?"):
            print(chunk.strip())

        print("\n--- Test Query 2: 'Prepare reminders for ABC Ltd' ---")
        async for chunk in engine.stream_chat("Prepare reminders for ABC Ltd"):
            print(chunk.strip())

if __name__ == "__main__":
    asyncio.run(test_agent())
