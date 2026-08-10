"""检索仓储：关键词 + 群/发送者/类型/时间范围组合（只读）。"""
from __future__ import annotations

from sqlalchemy import String, cast, func, or_, select
from sqlalchemy.orm import Session

from app.models import ChatMessage, ChatRoom


def search_messages(
    db: Session,
    q: str | None,
    roomid: str | None,
    sender_id: str | None,
    msg_type: str | None,
    start: int | None,
    end: int | None,
    page: int,
    limit: int,
):
    """组合检索消息。q 在 content JSON 文本中模糊匹配（SQLite/PG 兼容）。"""
    stmt = select(ChatMessage, ChatRoom.room_name).join(
        ChatRoom, ChatRoom.roomid == ChatMessage.roomid, isouter=True
    )
    if roomid:
        stmt = stmt.where(ChatMessage.roomid == roomid)
    if sender_id:
        stmt = stmt.where(ChatMessage.sender_id == sender_id)
    if msg_type:
        stmt = stmt.where(ChatMessage.msg_type == msg_type)
    if start is not None:
        stmt = stmt.where(ChatMessage.msg_time >= start)
    if end is not None:
        stmt = stmt.where(ChatMessage.msg_time <= end)
    if q:
        # content 为 JSON，转字符串后做包含匹配，覆盖文本/文件名/标题等
        content_like = cast(ChatMessage.content, String).ilike(f"%{q}%")
        # 同时匹配房间名，便于按群名检索
        room_like = ChatRoom.room_name.ilike(f"%{q}%")
        stmt = stmt.where(or_(content_like, room_like))

    stmt = stmt.order_by(ChatMessage.msg_time_ts.desc())
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.execute(stmt.limit(limit).offset((page - 1) * limit)).all()
    return rows, total
