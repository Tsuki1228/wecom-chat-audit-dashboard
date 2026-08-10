"""媒体代理端点（Bearer 鉴权）：演示态返回 static 下占位资源。

生产态 media_path 为相对路径，经 MEDIA_BASE_URL 抽象访问；演示态直接读
backend/static 下文件。未提供 path 或文件缺失时返回占位图，避免前端破图。
"""
from __future__ import annotations


from fastapi import APIRouter, Depends, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import require_auth
from app.db import get_db

router = APIRouter(prefix="/api/v1/media", tags=["media"], dependencies=[Depends(require_auth)])

_PLACEHOLDER = settings.STATIC_DIR / "placeholder.png"


@router.get("")
def media(path: str | None = Query(default=None, description="媒体相对路径"), db: Session = Depends(get_db)):  # noqa: B008
    if not path:
        return FileResponse(str(_PLACEHOLDER))
    # 防目录穿越：仅允许 static 目录内的文件
    target = (settings.STATIC_DIR / path).resolve()
    if not str(target).startswith(str(settings.STATIC_DIR.resolve())) or not target.is_file():
        return FileResponse(str(_PLACEHOLDER))
    return FileResponse(str(target))
