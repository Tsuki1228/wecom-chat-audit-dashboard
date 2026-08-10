"""成员列表端点（Bearer 鉴权）。"""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.response import ok
from app.core.security import require_auth
from app.db import get_db
from app.repositories import members_repo

router = APIRouter(prefix="/api/v1/members", tags=["members"], dependencies=[Depends(require_auth)])


@router.get("")
def list_members(
    keyword: str | None = Query(default=None, description="按显示名过滤"),
    user_type: int | None = Query(default=None, description="1员工 2外部联系人 3机器人"),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),  # noqa: B008
):
    rows, total = members_repo.list_members(db, page, limit, keyword, user_type)
    items = [m.__dict__ for m in rows]
    for item in items:
        item.pop("_sa_instance_state", None)
    return ok({"items": items, "total": total, "page": page, "limit": limit})
