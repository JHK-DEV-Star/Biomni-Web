"""Conversation management endpoints — 7 endpoints."""

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from models.schemas import (
    ConversationCreate,
    ConversationDetail,
    ConversationSummary,
    RenameRequest,
    StatusResponse,
    TruncateRequest,
)
from services.conversation_service import ConversationService

logger = logging.getLogger("aigen.conversations")

router = APIRouter(prefix="/api", tags=["conversations"])


@router.get("/conversations", response_model=list[ConversationSummary])
async def list_conversations(db: AsyncSession = Depends(get_db)):
    svc = ConversationService(db)
    return await svc.list_conversations()


@router.get("/conversation/{conv_id}", response_model=ConversationDetail)
async def get_conversation(conv_id: UUID, db: AsyncSession = Depends(get_db)):
    svc = ConversationService(db)
    detail = await svc.get_conversation(conv_id)
    if detail is None:
        raise HTTPException(status_code=404, detail=f"Conversation {conv_id} not found")
    return detail


@router.post("/new", response_model=ConversationDetail)
async def create_conversation(
    request: ConversationCreate = None,
    db: AsyncSession = Depends(get_db),
):
    svc = ConversationService(db)
    title = request.title if request else None
    first_message = request.first_message if request else None
    return await svc.create_conversation(title=title, first_message=first_message)


@router.delete("/conversation/{conv_id}", response_model=StatusResponse)
async def delete_conversation(conv_id: UUID, db: AsyncSession = Depends(get_db)):
    svc = ConversationService(db)
    await svc.delete_conversation(conv_id)
    return StatusResponse(status="ok", message="Conversation deleted")


@router.post("/conversation/{conv_id}/rename", response_model=StatusResponse)
async def rename_conversation(
    conv_id: UUID, request: RenameRequest, db: AsyncSession = Depends(get_db)
):
    svc = ConversationService(db)
    await svc.rename_conversation(conv_id, request.title)
    return StatusResponse(status="ok", message="Conversation renamed")


@router.post("/conversation/{conv_id}/truncate", response_model=StatusResponse)
async def truncate_conversation(
    conv_id: UUID, request: TruncateRequest, db: AsyncSession = Depends(get_db)
):
    svc = ConversationService(db)
    success = await svc.truncate_messages(conv_id, request.message_index)
    if not success:
        raise HTTPException(status_code=400, detail="Invalid message index")
    return StatusResponse(status="ok", message="Messages truncated")


@router.post("/conversation/{conv_id}/clear", response_model=StatusResponse)
async def clear_conversation(conv_id: UUID, db: AsyncSession = Depends(get_db)):
    svc = ConversationService(db)
    await svc.clear_conversation(conv_id)
    return StatusResponse(status="ok", message="Conversation cleared")
