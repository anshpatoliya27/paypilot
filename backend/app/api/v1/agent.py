from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional

from app.core.database import get_db
from app.agent.engine import AgentEngine

router = APIRouter()

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = "default_session"

@router.post("/chat")
async def chat_with_agent(
    req: ChatRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Streaming Conversational Agent endpoint returning Server-Sent Events (SSE).
    """
    engine = AgentEngine(db=db, merchant_id="merchant_demo_apex_01")
    
    return StreamingResponse(
        engine.stream_chat(user_message=req.message),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
