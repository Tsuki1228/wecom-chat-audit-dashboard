"""会话仓储：群聊/会话列表与详情查询（只读）。"""
from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import ChatMember, ChatMessage, ChatRoom


def _base_list_stmt(keyword: str | None):
    stmt = (
        select(
            ChatRoom,
            func.count(ChatMessage.msgid).label("message_count"),
            func.max(ChatMessage.msg_time).label("last_msg_time"),
        )
        .outerjoin(ChatMessage, ChatRoom.roomid == ChatMessage.roomid)
        .group_by(ChatRoom.roomid)
    )
    if keyword:
        stmt = stmt.where(ChatRoom.room_name.ilike(f"%{keyword}%"))
    return stmt


def list_rooms(db: Session, page: int, limit: int, keyword: str | None = None):
    """分页会话列表，带每会话消息数与最后消息时间。"""
    stmt = _base_list_stmt(keyword).order_by(ChatRoom.last_msg_time.is_(None), ChatRoom.last_msg_time.desc())
    total = len(db.execute(stmt).all())
    rows = db.execute(stmt.limit(limit).offset((page - 1) * limit)).all()
    return rows, total


def get_room_row(db: Session, roomid: str):
    """返回 (room, message_count, last_msg_time) 或 None。"""
    stmt = _base_list_stmt(None).where(ChatRoom.roomid == roomid)
    row = db.execute(stmt).first()
    return row


def get_room_members(db: Session, roomid: str) -> list[ChatMember]:
    """返回会话关联成员：外部群/内部群取全部成员；单聊取双方。

    演示态成员不分房间，按类型返回相关成员，保证前端展示完整。
    """
    room = db.get(ChatRoom, roomid)
    if room is None:
        return []
    if room.room_type == 2:  # 单聊：员工 + 对应外部联系人
        return db.execute(
            select(ChatMember).where(ChatMember.user_type.in_([1, 2]))
        ).scalars().all()
    return db.execute(select(ChatMember)).scalars().all()
