"""ORM 模型：4 张核心表（chat_rooms / chat_messages / chat_members / sync_cursor）。

时间字段统一 UTC；msg_time 为企业微信毫秒时间戳原值，msg_time_ts 为其转换后的
可索引 DateTime。演示态 SQLite 与 生产态 PostgreSQL 共用同一套字段定义。
"""
from __future__ import annotations

import json
from datetime import datetime

from sqlalchemy import (
    BIGINT,
    SMALLINT,
    DateTime,
    Index,
    Integer,
    PrimaryKeyConstraint,
    String,
    Text,
)
from sqlalchemy.types import TypeDecorator
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class JSONText(TypeDecorator):
    """跨库兼容的 JSON 存储：以 TEXT 落地，ensure_ascii=False 保留中文原文。

    演示态 SQLite 与生产态 PostgreSQL 均按字符串存储，便于 content 全文检索
    （LIKE）命中中文关键词；避免 SQLAlchemy JSON 默认把中文转义为 \\uXXXX。
    """

    impl = Text
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        return json.dumps(value, ensure_ascii=False)

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        return json.loads(value)


class ChatRoom(Base):
    __tablename__ = "chat_rooms"

    roomid: Mapped[str] = mapped_column(String(64), primary_key=True)
    room_name: Mapped[str | None] = mapped_column(String(256), nullable=True)
    room_type: Mapped[int] = mapped_column(SMALLINT, default=1, nullable=False)  # 1群 2单聊 3外部群
    member_count: Mapped[int] = mapped_column(Integer, default=0)
    last_msg_time: Mapped[int | None] = mapped_column(BIGINT, nullable=True)
    last_sync: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("idx_rooms_name", "room_name"),
        Index("idx_rooms_last_msg", "last_msg_time"),
    )


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    msgid: Mapped[str] = mapped_column(String(128), primary_key=True)
    roomid: Mapped[str | None] = mapped_column(String(64), nullable=True)
    sender_id: Mapped[str] = mapped_column(String(64), nullable=False)
    sender_type: Mapped[int] = mapped_column(SMALLINT, nullable=False)  # 1员工 2外部 3机器人
    receiver_ids: Mapped[list | None] = mapped_column(JSONText, nullable=True)
    msg_type: Mapped[str] = mapped_column(String(32), nullable=False)
    msg_time: Mapped[int] = mapped_column(BIGINT, nullable=False)  # 企业微信毫秒时间戳
    msg_time_ts: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    action: Mapped[str] = mapped_column(String(16), default="send", nullable=False)  # send/recall/switch
    content: Mapped[dict] = mapped_column(JSONText, nullable=False)
    media_path: Mapped[str | None] = mapped_column(String(512), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("idx_messages_room_time", "roomid", "msg_time_ts"),
        Index("idx_messages_sender", "sender_id", "msg_time_ts"),
    )


class ChatMember(Base):
    __tablename__ = "chat_members"

    user_id: Mapped[str] = mapped_column(String(64), nullable=False)
    user_type: Mapped[int] = mapped_column(SMALLINT, nullable=False)  # 1员工 2外部 3机器人
    display_name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    corp_name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    avatar_path: Mapped[str | None] = mapped_column(String(512), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        PrimaryKeyConstraint("user_id", "user_type"),
        Index("idx_members_name", "display_name"),
    )


class SyncCursor(Base):
    __tablename__ = "sync_cursor"

    id: Mapped[int] = mapped_column(SMALLINT, primary_key=True, default=1)
    last_seq: Mapped[int] = mapped_column(BIGINT, default=0)
    last_pull_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    consecutive_empty: Mapped[int] = mapped_column(Integer, default=0)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
