"""会话列表与详情端点（Bearer 鉴权）。"""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.response import CODE_NOTFOUND, fail, ok
from app.core.security import require_auth
from app.db import get_db
from app.services import rooms_service

router = APIRouter(prefix="/api/v1/rooms", tags=["rooms"], dependencies=[Depends(require_auth)])


@router.get("")
def list_rooms(
    keyword: str | None = Query(default=None, description="按会话名过滤"),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),  # noqa: B008
):
    data = rooms_service.list_rooms(db, page, limit, keyword)
    return ok(data)


@router.get("/{roomid}")
def room_detail(roomid: str, db: Session = Depends(get_db)):  # noqa: B008
    data = rooms_service.get_room_detail(db, roomid)
    if data is None:
        return fail("会话不存在", code=CODE_NOTFOUND, status=404)
    return ok(data)
