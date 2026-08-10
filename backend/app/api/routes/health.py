"""健康检查端点（无需鉴权）。"""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.response import ok
from app.db import get_db
from app.models import ChatMessage, ChatRoom
from app.schemas import HealthData

router = APIRouter(prefix="/api/v1/health", tags=["health"])


@router.get("")
def health(db: Session = Depends(get_db)):  # noqa: B008
    rooms = db.query(func.count(ChatRoom.roomid)).scalar() or 0
    messages = db.query(func.count(ChatMessage.msgid)).scalar() or 0
    data = HealthData(
        status="ok",
        puller=settings.PULLER,
        db="connected",
        rooms=rooms,
        messages=messages,
    )
    return ok(data.model_dump())
