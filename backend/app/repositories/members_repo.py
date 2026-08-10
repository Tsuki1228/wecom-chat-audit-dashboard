"""成员仓储：成员列表与映射查询（只读）。"""
from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import ChatMember


def list_members(db: Session, page: int, limit: int, keyword: str | None = None, user_type: int | None = None):
    stmt = select(ChatMember)
    if keyword:
        stmt = stmt.where(ChatMember.display_name.ilike(f"%{keyword}%"))
    if user_type is not None:
        stmt = stmt.where(ChatMember.user_type == user_type)
    stmt = stmt.order_by(ChatMember.user_type, ChatMember.display_name)
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.execute(stmt.limit(limit).offset((page - 1) * limit)).scalars().all()
    return rows, total


def member_map(db: Session) -> dict[tuple[str, int], ChatMember]:
    """(user_id, user_type) -> ChatMember 映射，供消息富化发送者信息。"""
    rows = db.execute(select(ChatMember)).scalars().all()
    return {(m.user_id, m.user_type): m for m in rows}
