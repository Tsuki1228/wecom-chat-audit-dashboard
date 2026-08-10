"""MockPuller：演示态种子数据注入。

不调用任何企业微信 SDK / 解密模块，直接把明文结构化消息写入数据库。
覆盖 3 类会话（外部群 / 内部群 / 外部单聊），每会话 >=15 条消息，覆盖
text/image/voice/video/file/link/recall 全部类型，并分布"报价/合同/方案"
关键词用于验证检索（AC-4）。

真实毫秒时间戳分布在近期几天，msg_time_ts 由其转换。
"""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models import ChatMember, ChatMessage, ChatRoom
from app.pullers.base import Puller

# 种子基准时间（演示固定，保证每次注入一致）
_BASE = datetime(2026, 8, 10, 18, 0, 0, tzinfo=timezone.utc)


def _ts(minutes_ago: int) -> int:
    """返回基准时间往前 minutes_ago 分钟的毫秒时间戳。"""
    return int((_BASE.timestamp() - minutes_ago * 60) * 1000)


def _ts_dt(minutes_ago: int) -> datetime:
    return datetime.fromtimestamp(_ts(minutes_ago) / 1000, tz=timezone.utc)


# ---- 会话定义 ----
ROOMS = [
    {
        "roomid": "room_ext_group_001",
        "room_name": "华东区客户交流群",
        "room_type": 3,  # 外部群
        "member_count": 5,
    },
    {
        "roomid": "room_internal_001",
        "room_name": "销售一部内部群",
        "room_type": 1,  # 内部群
        "member_count": 3,
    },
    {
        "roomid": "room_single_001",
        "room_name": "与王经理（明远科技）",
        "room_type": 2,  # 外部单聊
        "member_count": 2,
    },
]

# ---- 成员定义 ----
MEMBERS = [
    {"user_id": "zhang_min", "user_type": 1, "display_name": "张敏", "corp_name": None},
    {"user_id": "li_qiang", "user_type": 1, "display_name": "李强", "corp_name": None},
    {"user_id": "wang_fang", "user_type": 1, "display_name": "王芳", "corp_name": None},
    {"user_id": "ext_wang", "user_type": 2, "display_name": "王经理", "corp_name": "明远科技"},
    {"user_id": "ext_chen", "user_type": 2, "display_name": "陈女士", "corp_name": "晨星贸易"},
    {"user_id": "bot_helper", "user_type": 3, "display_name": "会话存档助手", "corp_name": None},
]

# ---- 消息模板：(roomid, sender_id, sender_type, msg_type, minutes_ago, content, action, media_path) ----
# 外部群
EXT_GROUP_MSGS = [
    ("room_ext_group_001", "zhang_min", 1, "text", 6000, {"text": "各位客户朋友好，本周新版本方案已经发布，欢迎提建议。"}, "send", None),
    ("room_ext_group_001", "ext_wang", 2, "text", 5980, {"text": "收到，方案整体思路不错，但报价能否再优惠些？"}, "send", None),
    ("room_ext_group_001", "zhang_min", 1, "text", 5960, {"text": "报价我们根据采购量可以阶梯调整，具体我整理一份报价单发群里。"}, "send", None),
    ("room_ext_group_001", "zhang_min", 1, "file", 5940, {"url": "/api/v1/media?path=sample.pdf", "filename": "明远科技报价单.pdf", "fileext": "pdf", "size": 58234}, "send", "sample.pdf"),
    ("room_ext_group_001", "ext_chen", 2, "text", 5920, {"text": "我们也想了解下合同里的交付周期条款。"}, "send", None),
    ("room_ext_group_001", "li_qiang", 1, "text", 5900, {"text": "合同交付周期默认 15 个工作日，可协商。"}, "send", None),
    ("room_ext_group_001", "ext_wang", 2, "image", 5880, {"url": "/api/v1/media?path=placeholder.png", "size": 145200, "md5": "a1b2c3"}, "send", "placeholder.png"),
    ("room_ext_group_001", "ext_wang", 2, "text", 5860, {"text": "这是我们车间实拍图，方案里能不能加一条现场实施支持？"}, "send", None),
    ("room_ext_group_001", "zhang_min", 1, "text", 5840, {"text": "可以的，方案补充现场实施支持章节，我同步更新版本。"}, "send", None),
    ("room_ext_group_001", "bot_helper", 3, "text", 5830, {"text": "提示：本群为外部客户群，会话内容已按合规要求存档。"}, "send", None),
    ("room_ext_group_001", "ext_chen", 2, "voice", 5800, {"url": "/api/v1/media?path=placeholder.png", "play_length": 12, "size": 28900}, "send", "placeholder.png"),
    ("room_ext_group_001", "ext_chen", 2, "text", 5780, {"text": "语音里说了，合同里的验收标准希望写清楚。"}, "send", None),
    ("room_ext_group_001", "zhang_min", 1, "link", 5760, {"title": "明远科技合作方案 v2", "url": "https://example.com/plan/mingyuan-v2", "description": "含报价、实施与验收条款的最新方案说明。"}, "send", None),
    ("room_ext_group_001", "li_qiang", 1, "text", 5740, {"text": "我把报价和合同条款对齐了一下，没有冲突。"}, "send", None),
    ("room_ext_group_001", "ext_wang", 2, "video", 5720, {"url": "/api/v1/media?path=placeholder.png", "play_length": 18, "size": 1320000}, "send", "placeholder.png"),
    ("room_ext_group_001", "ext_wang", 2, "text", 5700, {"text": "视频是产线演示，方案里引用这个没问题吧？"}, "send", None),
    ("room_ext_group_001", "zhang_min", 1, "text", 200, {"text": "没问题，正式合同今天就能出初稿。"}, "send", None),
    ("room_ext_group_001", "ext_wang", 2, "text", 120, {"text": "好的，那我先撤回刚才那条，重新发一版报价咨询。"}, "recall", None),
    ("room_ext_group_001", "ext_wang", 2, "text", 110, {"text": "重新问：整体报价打包价能给到多少？"}, "send", None),
]

# 内部群
INTERNAL_MSGS = [
    ("room_internal_001", "li_qiang", 1, "text", 5000, {"text": "华东客户群里王经理在催报价，大家看怎么回？"}, "send", None),
    ("room_internal_001", "zhang_min", 1, "text", 4980, {"text": "我整理了一份分阶段报价方案，按采购量给阶梯折扣。"}, "send", None),
    ("room_internal_001", "wang_fang", 1, "text", 4960, {"text": "合同条款记得加数据保密和验收标准，避免后续扯皮。"}, "send", None),
    ("room_internal_001", "wang_fang", 1, "file", 4940, {"url": "/api/v1/media?path=sample.txt", "filename": "内部评审-合同模板.txt", "fileext": "txt", "size": 12340}, "send", "sample.txt"),
    ("room_internal_001", "li_qiang", 1, "text", 4920, {"text": "方案里实施支持的成本要不要单列？"}, "send", None),
    ("room_internal_001", "zhang_min", 1, "text", 4900, {"text": "单列，现场实施支持按人天计，写进方案附件。"}, "send", None),
    ("room_internal_001", "wang_fang", 1, "text", 4860, {"text": "合同交付周期建议写 15 个工作日，留缓冲。"}, "send", None),
    ("room_internal_001", "li_qiang", 1, "link", 4840, {"title": "报价测算表", "url": "https://intra.example.com/price/mingyuan", "description": "内部报价测算与毛利分析。"}, "send", None),
    ("room_internal_001", "zhang_min", 1, "text", 4820, {"text": "收到，我把合同和方案打包同步给客户群。"}, "send", None),
    ("room_internal_001", "wang_fang", 1, "image", 4800, {"url": "/api/v1/media?path=placeholder.png", "size": 98200, "md5": "d4e5f6"}, "send", "placeholder.png"),
    ("room_internal_001", "wang_fang", 1, "text", 4780, {"text": "截图是客户产线，方案里引用了。"}, "send", None),
    ("room_internal_001", "li_qiang", 1, "voice", 4760, {"url": "/api/v1/media?path=placeholder.png", "play_length": 9, "size": 21000}, "send", "placeholder.png"),
    ("room_internal_001", "li_qiang", 1, "text", 4740, {"text": "语音同步：主管说合同先走法务。"}, "send", None),
    ("room_internal_001", "zhang_min", 1, "text", 4720, {"text": "好，方案今天就定稿，合同初稿同步出。"}, "send", None),
    ("room_internal_001", "wang_fang", 1, "text", 300, {"text": "提醒：报价和合同条款要和对外群保持一致，别写岔了。"}, "send", None),
    ("room_internal_001", "li_qiang", 1, "text", 150, {"text": "明白，已对照过，没有冲突。"}, "send", None),
]

# 外部单聊
SINGLE_MSGS = [
    ("room_single_001", "zhang_min", 1, "text", 4000, {"text": "王经理好，单独跟您同步下明远项目的报价细节。"}, "send", None),
    ("room_single_001", "ext_wang", 2, "text", 3980, {"text": "好，整体报价能不能再压一点？"}, "send", None),
    ("room_single_001", "zhang_min", 1, "text", 3960, {"text": "单聊给您专属价：年度框架合同可享 9 折，方案里已标注。"}, "send", None),
    ("room_single_001", "zhang_min", 1, "file", 3940, {"url": "/api/v1/media?path=sample.pdf", "filename": "明远专属报价单.pdf", "fileext": "pdf", "size": 61002}, "send", "sample.pdf"),
    ("room_single_001", "ext_wang", 2, "text", 3920, {"text": "合同交付周期能写 10 个工作日吗？我们赶上线。"}, "send", None),
    ("room_single_001", "zhang_min", 1, "text", 3900, {"text": "可以，合同交付周期按 10 个工作日写，方案同步更新。"}, "send", None),
    ("room_single_001", "ext_wang", 2, "image", 3880, {"url": "/api/v1/media?path=placeholder.png", "size": 120300, "md5": "b7c8d9"}, "send", "placeholder.png"),
    ("room_single_001", "ext_wang", 2, "text", 3860, {"text": "这是盖章页样例，方案附件引用下。"}, "send", None),
    ("room_single_001", "zhang_min", 1, "link", 3840, {"title": "明远专属方案", "url": "https://example.com/plan/mingyuan-vip", "description": "含专属报价与交付条款。"}, "send", None),
    ("room_single_001", "ext_wang", 2, "voice", 3820, {"url": "/api/v1/media?path=placeholder.png", "play_length": 15, "size": 33000}, "send", "placeholder.png"),
    ("room_single_001", "ext_wang", 2, "text", 3800, {"text": "语音里确认了验收标准，麻烦合同写清楚。"}, "send", None),
    ("room_single_001", "zhang_min", 1, "text", 3780, {"text": "已写入合同验收标准章节，方案一并更新。"}, "send", None),
    ("room_single_001", "ext_wang", 2, "video", 3760, {"url": "/api/v1/media?path=placeholder.png", "play_length": 22, "size": 1560000}, "send", "placeholder.png"),
    ("room_single_001", "ext_wang", 2, "text", 3740, {"text": "产线演示视频，方案引用没问题吧？"}, "send", None),
    ("room_single_001", "zhang_min", 1, "text", 250, {"text": "没问题，合同初稿今天给到您。"}, "send", None),
    ("room_single_001", "ext_wang", 2, "text", 180, {"text": "合作愉快，那我先撤回刚才重复的问价。"}, "recall", None),
    ("room_single_001", "ext_wang", 2, "text", 170, {"text": "重新确认：框架合同 9 折这个方案我接受。"}, "send", None),
]

ALL_MSGS = EXT_GROUP_MSGS + INTERNAL_MSGS + SINGLE_MSGS


class MockPuller(Puller):
    name = "mock"

    def run(self, db: Session) -> dict:
        existing = db.query(func.count(ChatRoom.roomid)).scalar() or 0
        if existing > 0:
            return {"seeded": False, "rooms": existing}

        for r in ROOMS:
            db.add(
                ChatRoom(
                    roomid=r["roomid"],
                    room_name=r["room_name"],
                    room_type=r["room_type"],
                    member_count=r["member_count"],
                    last_sync=datetime.now(timezone.utc),
                )
            )
        for m in MEMBERS:
            db.add(ChatMember(**m))

        msg_count = 0
        for idx, (roomid, sender_id, sender_type, msg_type, mins, content, action, media_path) in enumerate(
            ALL_MSGS
        ):
            msg_time = _ts(mins)
            db.add(
                ChatMessage(
                    msgid=f"msg_{idx:05d}_{roomid}",
                    roomid=roomid,
                    sender_id=sender_id,
                    sender_type=sender_type,
                    receiver_ids=[],
                    msg_type=msg_type,
                    msg_time=msg_time,
                    msg_time_ts=_ts_dt(mins),
                    action=action,
                    content=content,
                    media_path=media_path,
                )
            )
            msg_count += 1

        # 刷入内存中的新增对象，使后续聚合查询可见
        db.flush()

        # 回填每个会话的最后消息时间
        for r in ROOMS:
            last = (
                db.query(func.max(ChatMessage.msg_time))
                .filter(ChatMessage.roomid == r["roomid"])
                .scalar()
            )
            room = db.query(ChatRoom).filter(ChatRoom.roomid == r["roomid"]).one()
            room.last_msg_time = last

        return {"seeded": True, "rooms": len(ROOMS), "messages": msg_count}
