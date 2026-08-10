"""拉取器工厂：按配置返回 Mock 或 WeCom 拉取器。"""
from __future__ import annotations

from sqlalchemy.orm import Session

from app.core.config import settings
from app.pullers.base import Puller


def get_puller() -> Puller:
    if settings.PULLER == "wecom":
        from app.pullers.wecom import WeComPuller

        return WeComPuller()
    from app.pullers.mock import MockPuller

    return MockPuller()


def run_seed(db: Session) -> dict:
    """执行一次拉取（演示态即种子注入）。"""
    return get_puller().run(db)
