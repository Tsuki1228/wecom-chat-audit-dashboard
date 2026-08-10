"""运行态配置：环境变量读取与默认值。

演示态与生产态通过环境变量切换；演示态默认 SQLite + Mock 拉取器，
无需企业微信权限、无需 Docker、无需 Linux SDK。
"""
from __future__ import annotations

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent  # backend/


def _default_database_url() -> str:
    """数据库地址解析优先级：

    1. 显式 DATABASE_URL（生产态 Postgres / 本地自定义 SQLite）
    2. Vercel 等无持久化文件系统的环境 → /tmp 下的 SQLite（冷启动自动重新灌种子）
    3. 本地默认 → backend 目录下的 wecom_audit.db
    """
    explicit = os.getenv("DATABASE_URL")
    if explicit:
        return explicit
    if os.getenv("VERCEL"):
        # Vercel 函数环境项目目录只读，仅 /tmp 可写；四个斜杠表示绝对路径
        return "sqlite:////tmp/wecom_audit.db"
    return "sqlite:///" + str(BASE_DIR / "wecom_audit.db")


class Settings:
    """集中读取运行态配置。"""

    def __init__(self) -> None:
        self.DATABASE_URL: str = os.getenv("DATABASE_URL", _default_database_url())
        self.JWT_SECRET: str = os.getenv("JWT_SECRET", "dev-mvp-secret-change-me")
        self.JWT_ALGORITHM: str = "HS256"
        self.ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("JWT_EXPIRE_MINUTES", "900"))
        # mock | wecom：演示态用 mock，避免 Windows 缺 .so 报错
        self.PULLER: str = os.getenv("PULLER", "mock")
        # 空库启动时是否自动注入种子
        self.SEED_AUTO: bool = os.getenv("SEED_AUTO", "true").lower() in ("1", "true", "yes")
        # 管理后台演示账号
        self.ADMIN_USERNAME: str = os.getenv("ADMIN_USERNAME", "admin")
        self.ADMIN_PASSWORD: str = os.getenv("ADMIN_PASSWORD", "admin123")
        # 媒体静态目录
        self.STATIC_DIR: Path = BASE_DIR / "static"


settings = Settings()
