"""消息仓储：时间线分页与单条详情（只读）。

排序：按 msg_time_ts 升序返回（AC-3 时间正序展示）。before_msg_time 用于向前
翻页（取早于该时间的消息）。plain 分页按偏移。
"""
from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import ChatMessage


def list_messages(
    db: Session,
    roomid: str,
    page: int,
    limit: int,
    before_msg_time: int | None = None,
):
    """某会话时间线，按时间升序。"""
    base = select(ChatMessage).where(ChatMessage.roomid == roomid)
    if before_msg_time is not None:
        base = base.where(ChatMessage.msg_time < before_msg_time)
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    stmt = base.order_by(ChatMessage.msg_time_ts.asc()).limit(limit).offset((page - 1) * limit)
    rows = db.execute(stmt).scalars().all()
    return rows, total


def get_message(db: Session, msgid: str) -> ChatMessage | None:
    return db.get(ChatMessage, msgid)
