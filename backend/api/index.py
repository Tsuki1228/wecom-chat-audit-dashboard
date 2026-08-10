"""Vercel Python Serverless 入口（ASGI）。

Vercel 的 Python runtime 会加载 `api/index.py` 中顶层名为 `app` 的 ASGI 应用。
部署时把项目 rootDirectory 设为 backend/，requirements.txt 含 fastapi/uvicorn/sqlalchemy 等。
生产态必须设置环境变量：
  - DATABASE_URL  外部 Postgres 连接串（如 Neon，SQLite 在函数环境无法持久化）
  - JWT_SECRET    强随机签名密钥
  - PULLER        mock（演示）| wecom（真实，需 Docker+SDK+私钥，Vercel 上仅能跑 mock）
"""
from app.main import app

__all__ = ["app"]
