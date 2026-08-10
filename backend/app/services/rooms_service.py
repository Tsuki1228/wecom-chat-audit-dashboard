"""会话服务：列表与详情组装。"""
from __future__ import annotations

from sqlalchemy.orm import Session

from app.repositories import rooms_repo
from app.schemas import MemberOut, RoomOut


def list_rooms(db: Session, page: int, limit: int, keyword: str | None):
    rows, total = rooms_repo.list_rooms(db, page, limit, keyword)
    items = [
        RoomOut(
            roomid=room.roomid,
            room_name=room.room_name,
            room_type=room.room_type,
            member_count=room.member_count,
            last_msg_time=last_msg_time,
            message_count=message_count or 0,
        )
        for room, message_count, last_msg_time in rows
    ]
    return {"items": items, "total": total, "page": page, "limit": limit}


def get_room_detail(db: Session, roomid: str):
    row = rooms_repo.get_room_row(db, roomid)
    if row is None:
        return None
    room, message_count, last_msg_time = row
    members = rooms_repo.get_room_members(db, roomid)
    return {
        "room": RoomOut(
            roomid=room.roomid,
            room_name=room.room_name,
            room_type=room.room_type,
            member_count=room.member_count,
            last_msg_time=last_msg_time,
            message_count=message_count or 0,
        ),
        "members": [MemberOut.model_validate(m.__dict__) for m in members],
    }
