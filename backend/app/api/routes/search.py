"""全文/条件检索端点（Bearer 鉴权）。"""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.security import require_auth
from app.core.response import ok
from app.db import get_db
from app.services import search_service

router = APIRouter(prefix="/api/v1/search", tags=["search"], dependencies=[Depends(require_auth)])


@router.get("")
def search(
    q: str | None = Query(default=None, description="关键词，匹配消息正文/文件名/标题/群名"),
    roomid: str | None = Query(default=None),
    sender_id: str | None = Query(default=None),
    msg_type: str | None = Query(default=None),
    start: int | None = Query(default=None, description="消息时间下界(毫秒)"),
    end: int | None = Query(default=None, description="消息时间上界(毫秒)"),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),  # noqa: B008
):
    data = search_service.search(db, q, roomid, sender_id, msg_type, start, end, page, limit)
    return ok(data)
