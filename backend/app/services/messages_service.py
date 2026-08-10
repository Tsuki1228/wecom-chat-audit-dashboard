"""消息服务：时间线分页与单条详情，富化发送者信息。"""
from __future__ import annotations

from sqlalchemy.orm import Session

from app.models import ChatMessage
from app.repositories import members_repo, messages_repo
from app.schemas import MessageOut


def _enrich(msg: ChatMessage, mmap: dict) -> MessageOut:
    member = mmap.get((msg.sender_id, msg.sender_type))
    return MessageOut(
        msgid=msg.msgid,
        roomid=msg.roomid,
        sender_id=msg.sender_id,
        sender_type=msg.sender_type,
        sender_name=member.display_name if member else None,
        sender_corp=member.corp_name if member else None,
        receiver_ids=msg.receiver_ids,
        msg_type=msg.msg_type,
        msg_time=msg.msg_time,
        msg_time_ts=msg.msg_time_ts,
        action=msg.action,
        content=msg.content,
        media_path=msg.media_path,
    )


def list_messages(db: Session, roomid: str, page: int, limit: int, before_msg_time: int | None):
    rows, total = messages_repo.list_messages(db, roomid, page, limit, before_msg_time)
    mmap = members_repo.member_map(db)
    items = [_enrich(m, mmap) for m in rows]
    return {"items": items, "total": total, "page": page, "limit": limit}


def get_message(db: Session, msgid: str):
    msg = messages_repo.get_message(db, msgid)
    if msg is None:
        return None
    mmap = members_repo.member_map(db)
    return _enrich(msg, mmap)
