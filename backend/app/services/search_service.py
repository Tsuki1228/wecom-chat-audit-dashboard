"""检索服务：组合条件检索消息，富化发送者信息与房间名。"""
from __future__ import annotations

from sqlalchemy.orm import Session

from app.repositories import members_repo, search_repo
from app.schemas import SearchHit


def search(
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
    rows, total = search_repo.search_messages(
        db, q, roomid, sender_id, msg_type, start, end, page, limit
    )
    mmap = members_repo.member_map(db)
    items = []
    for msg, room_name in rows:
        member = mmap.get((msg.sender_id, msg.sender_type))
        items.append(
            SearchHit(
                msgid=msg.msgid,
                roomid=msg.roomid,
                room_name=room_name,
                sender_id=msg.sender_id,
                sender_type=msg.sender_type,
                sender_name=member.display_name if member else None,
                sender_corp=member.corp_name if member else None,
                msg_type=msg.msg_type,
                msg_time=msg.msg_time,
                msg_time_ts=msg.msg_time_ts,
                action=msg.action,
                content=msg.content,
                media_path=msg.media_path,
            )
        )
    return {"items": items, "total": total, "page": page, "limit": limit}
