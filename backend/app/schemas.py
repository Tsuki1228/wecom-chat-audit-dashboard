"""Pydantic 响应模型（输出契约）。

请求体仅登录一处，其余为查询参数。content 为按消息类型变化的 JSON，
因此用宽松 dict 承载。响应统一由 core/response 包裹为 {code,data,message}。
"""
from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginData(BaseModel):
    token: str
    token_type: str = "Bearer"
    expire_minutes: int


class RoomOut(BaseModel):
    roomid: str
    room_name: str | None = None
    room_type: int
    member_count: int = 0
    last_msg_time: int | None = None
    message_count: int = 0


class PagedRooms(BaseModel):
    items: list[RoomOut] = Field(default_factory=list)
    total: int = 0
    page: int = 1
    limit: int = 20


class MessageOut(BaseModel):
    msgid: str
    roomid: str | None = None
    sender_id: str
    sender_type: int
    sender_name: str | None = None
    sender_corp: str | None = None
    receiver_ids: list[Any] | None = None
    msg_type: str
    msg_time: int
    msg_time_ts: datetime
    action: str = "send"
    content: dict[str, Any]
    media_path: str | None = None


class PagedMessages(BaseModel):
    items: list[MessageOut] = Field(default_factory=list)
    total: int = 0
    page: int = 1
    limit: int = 20


class MemberOut(BaseModel):
    user_id: str
    user_type: int
    display_name: str | None = None
    corp_name: str | None = None
    avatar_path: str | None = None


class PagedMembers(BaseModel):
    items: list[MemberOut] = Field(default_factory=list)
    total: int = 0
    page: int = 1
    limit: int = 20


class SearchHit(BaseModel):
    msgid: str
    roomid: str | None = None
    room_name: str | None = None
    sender_id: str
    sender_type: int
    sender_name: str | None = None
    sender_corp: str | None = None
    msg_type: str
    msg_time: int
    msg_time_ts: datetime
    action: str = "send"
    content: dict[str, Any]
    media_path: str | None = None


class PagedSearch(BaseModel):
    items: list[SearchHit] = Field(default_factory=list)
    total: int = 0
    page: int = 1
    limit: int = 20


class HealthData(BaseModel):
    status: str = "ok"
    puller: str
    db: str = "connected"
    rooms: int = 0
    messages: int = 0
