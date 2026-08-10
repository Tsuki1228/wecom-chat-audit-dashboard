"""消息时间线与单条详情端点（Bearer 鉴权）。"""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.response import CODE_NOTFOUND, fail, ok
from app.core.security import require_auth
from app.db import get_db
from app.services import messages_service

router = APIRouter(prefix="/api/v1/messages", tags=["messages"], dependencies=[Depends(require_auth)])


@router.get("")
def list_messages(
    roomid: str = Query(..., description="会话 ID，必填"),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    before_msg_time: int | None = Query(default=None, description="仅返回该时间戳之前的消息，用于向前翻页"),
    db: Session = Depends(get_db),  # noqa: B008
):
    if not roomid:
        return fail("缺少 roomid 参数")
    data = messages_service.list_messages(db, roomid, page, limit, before_msg_time)
    return ok(data)


@router.get("/{msgid}")
def message_detail(msgid: str, db: Session = Depends(get_db)):  # noqa: B008
    data = messages_service.get_message(db, msgid)
    if data is None:
        return fail("消息不存在", code=CODE_NOTFOUND, status=404)
    return ok(data.model_dump())
