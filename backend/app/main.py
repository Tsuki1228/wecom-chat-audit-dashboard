"""FastAPI 入口：仅做装配（创建应用、挂载路由、CORS、启动事件），不含业务逻辑。"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import auth, health, media, members, messages, rooms, search
from app.core.config import settings
from app.core.response import CODE_SERVER, fail
from app.db import SessionLocal, init_db

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger("wecom_audit")


def _auto_seed() -> None:
    """空库时自动注入种子（演示态）。"""
    if not settings.SEED_AUTO:
        return
    db = SessionLocal()
    try:
        from app.pullers import run_seed

        result = run_seed(db)
        db.commit()
        logger.info("种子注入结果：%s", result)
    except Exception as exc:  # noqa: BLE001
        db.rollback()
        logger.warning("启动时种子注入跳过：%s", exc)
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    _auto_seed()
    yield


app = FastAPI(title="企业微信会话内容存档看板", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(rooms.router)
app.include_router(messages.router)
app.include_router(search.router)
app.include_router(members.router)
app.include_router(media.router)


@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc: HTTPException):
    detail = exc.detail
    if isinstance(detail, dict) and "code" in detail and "message" in detail:
        return fail(detail["message"], code=detail["code"], status=exc.status_code)
    return fail(str(detail) if detail else "请求失败", code=exc.status_code, status=exc.status_code)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request, exc: Exception):
    logger.exception("未处理异常：%s", exc)
    return fail("服务器内部错误，请稍后重试", code=CODE_SERVER, status=500)
