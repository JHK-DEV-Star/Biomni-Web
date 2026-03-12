"""Chat endpoints with SSE streaming — 4 endpoints."""

import json
import logging

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from models.schemas import (
    ChatRequest,
    RetryStepRequest,
    StatusResponse,
    StepQuestionRequest,
    StopRequest,
)
from services.chat_handler import ChatHandler

logger = logging.getLogger("aigen.chat_sse")
router = APIRouter(tags=["chat"])


def _get_handler() -> ChatHandler:
    return ChatHandler.get_instance()


async def _sse_generator(event_stream):
    """Convert ChatEvent async generator to SSE text/event-stream format."""
    try:
        async for event in event_stream:
            payload = {"type": event.type, **event.data}
            yield f"data: {json.dumps(payload, ensure_ascii=False, default=str)}\n\n"
    except Exception as e:
        logger.exception("SSE stream error")
        yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"


def _streaming_response(event_stream) -> StreamingResponse:
    return StreamingResponse(
        _sse_generator(event_stream),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/api/chat")
async def chat(request: ChatRequest, db: AsyncSession = Depends(get_db)):
    """SSE streaming chat — main entry point."""
    handler = _get_handler()
    return _streaming_response(handler.handle_chat(request, db))


@router.post("/step_question")
async def step_question(
    request: StepQuestionRequest, db: AsyncSession = Depends(get_db)
):
    """User question during plan execution."""
    handler = _get_handler()
    return _streaming_response(handler.handle_step_question(request, db))


@router.post("/retry_step")
async def retry_step(
    request: RetryStepRequest, db: AsyncSession = Depends(get_db)
):
    """Retry a specific plan step."""
    handler = _get_handler()
    return _streaming_response(handler.handle_retry_step(request, db))


@router.post("/api/stop", response_model=StatusResponse)
async def stop_generation(request: StopRequest):
    """Stop streaming for a conversation."""
    handler = _get_handler()
    stopped = handler.stop(request.conv_id)
    return StatusResponse(
        status="ok" if stopped else "not_found",
        message="Generation stopped" if stopped else "Conversation not found",
    )
