"""拉取器抽象基类。

演示态用 MockPuller 注入种子；生产态用 WeComPuller 调官方 SDK。
两者实现统一接口：run(session) 负责把数据写入数据库（幂等，按 msgid 主键去重）。
"""
from __future__ import annotations

from abc import ABC, abstractmethod

from sqlalchemy.orm import Session


class Puller(ABC):
    name: str = "base"

    @abstractmethod
    def run(self, db: Session) -> dict:
        """执行一次拉取并落库，返回统计信息（rooms/messages 数量等）。"""
        raise NotImplementedError
