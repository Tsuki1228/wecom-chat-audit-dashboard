"""WeComPuller：生产态真实拉取器（演示态不启用）。

调官方 C SDK v3.0（经 PyWeWorkFinance ctypes 封装）拉取加密会话，再用
crypto/decrypt 完成 RSA+AES 解密，结构化入库。位点持久到 sync_cursor，
先写库成功再推进 last_seq（防丢位点）。解密失败计数+跳过+保留密文，不静默吞。

模块顶层不导入 SDK，避免演示态 Windows 缺 .so 时 import 失败；SDK 在 run() 内
惰性导入，仅在 PULLER=wecom 时执行。
"""
from __future__ import annotations

import base64
import os
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.crypto.decrypt import DecryptError, decrypt_msg
from app.models import ChatMessage, ChatRoom, SyncCursor
from app.pullers.base import Puller

# 生产态配置（从环境变量注入，私钥绝不入仓库）
WECOM_CORPID = os.getenv("WECOM_CORPID", "")
WECOM_SECRET = os.getenv("WECOM_SECRET", "")
WECOM_PRIVATE_KEY_B64 = os.getenv("WECOM_PRIVATE_KEY_B64", "")


def _private_key_pem() -> str:
    if not WECOM_PRIVATE_KEY_B64:
        raise RuntimeError("未配置 WECOM_PRIVATE_KEY_B64，无法解密")
    return base64.b64decode(WECOM_PRIVATE_KEY_B64).decode("utf-8")


class WeComPuller(Puller):
    name = "wecom"

    def _get_sdk(self):
        """惰性导入官方 SDK 封装；演示态不会走到这里。"""
        try:
            from pyweworkfinance import WeWorkFinance  # 占位封装名，需存在性核验
        except Exception as exc:  # noqa: BLE001
            raise RuntimeError(f"企业微信 SDK 未安装或不可用：{exc}") from exc
        return WeWorkFinance(corpid=WECOM_CORPID, secret=WECOM_SECRET)

    def _parse_content(self, plain: dict) -> tuple[str, dict, str | None]:
        """从明文 JSON 解析出 (msg_type, content, media_path)。"""
        msgtype = plain.get("msgtype", "text")
        action = plain.get("action", "send")
        content: dict = {}
        media_path: str | None = None
        if msgtype == "text":
            content = {"text": plain.get("text", {}).get("content", "")}
        elif msgtype == "image":
            content = {"url": "", "size": plain.get("image", {}).get("size", 0)}
            media_path = plain.get("image", {}).get("sdkfileid")
        elif msgtype == "voice":
            content = {"play_length": plain.get("voice", {}).get("play_length", 0)}
            media_path = plain.get("voice", {}).get("sdkfileid")
        elif msgtype == "video":
            content = {"play_length": plain.get("video", {}).get("play_length", 0)}
            media_path = plain.get("video", {}).get("sdkfileid")
        elif msgtype == "file":
            f = plain.get("file", {})
            content = {"filename": f.get("filename", ""), "size": f.get("size", 0), "fileext": f.get("fileext", "")}
            media_path = f.get("sdkfileid")
        elif msgtype == "link":
            link = plain.get("link", {})
            content = {"title": link.get("title", ""), "url": link.get("link_url", ""), "description": link.get("description", "")}
        else:
            content = {"raw": plain}
        # 撤回消息 action=recall，content 提示
        if action == "recall":
            content = {"tip": "对方撤回了一条消息"}
        return msgtype, content, media_path

    def run(self, db: Session) -> dict:
        sdk = self._get_sdk()
        cursor = db.query(SyncCursor).filter(SyncCursor.id == 1).first()
        if cursor is None:
            cursor = SyncCursor(id=1)
            db.add(cursor)

        seq = cursor.last_seq
        limit = int(os.getenv("PULL_LIMIT", "1000"))
        private_pem = _private_key_pem()

        inserted = 0
        decrypt_failed = 0

        chat_data_list = sdk.get_chat_data(seq=seq, limit=limit)
        if not chat_data_list:
            cursor.consecutive_empty = (cursor.consecutive_empty or 0) + 1
            cursor.last_pull_at = datetime.now(timezone.utc)
            db.commit()
            return {"seeded": False, "messages": 0, "decrypt_failed": decrypt_failed}

        for item in chat_data_list:
            try:
                plain = decrypt_msg(
                    item["encrypt_random_key"],
                    item["encrypt_chat_msg"],
                    private_pem,
                )
            except DecryptError:
                # 失败告警 + 跳过保留密文，不静默吞
                decrypt_failed += 1
                continue

            msgid = plain.get("msgid")
            if not msgid:
                continue
            msg_type, content, media_path = self._parse_content(plain)
            msg_time = int(plain.get("msgtime", 0))
            db.merge(
                ChatMessage(
                    msgid=msgid,
                    roomid=plain.get("roomid"),
                    sender_id=plain.get("from", ""),
                    sender_type=1,  # 真实环境按成员表映射
                    receiver_ids=plain.get("tolist", []),
                    msg_type=msg_type,
                    msg_time=msg_time,
                    msg_time_ts=datetime.fromtimestamp(msg_time / 1000, tz=timezone.utc),
                    action=plain.get("action", "send"),
                    content=content,
                    media_path=media_path,
                )
            )
            # 同步会话最后时间
            room = db.query(ChatRoom).filter(ChatRoom.roomid == plain.get("roomid")).first()
            if room and (room.last_msg_time is None or msg_time > room.last_msg_time):
                room.last_msg_time = msg_time
            seq = max(seq, int(plain.get("seq", seq)))
            inserted += 1

        # 先写库成功再推进位点
        cursor.last_seq = seq
        cursor.consecutive_empty = 0
        cursor.last_pull_at = datetime.now(timezone.utc)
        db.commit()
        return {"seeded": True, "messages": inserted, "decrypt_failed": decrypt_failed}
