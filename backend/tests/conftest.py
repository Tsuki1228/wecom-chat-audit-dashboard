"""测试夹具：在导入任何 app 模块之前，把 DATABASE_URL 指向临时 SQLite，
保证测试与本地 wecom_audit.db 完全隔离；并自动注入 mock 种子。
"""
import os
import sys
import tempfile
from pathlib import Path

# 临时数据库（Windows 路径转正斜杠，避免 sqlite URL 解析歧义）
_db_fd, _db_path = tempfile.mkstemp(suffix=".db")
os.close(_db_fd)
os.environ["DATABASE_URL"] = "sqlite:///" + _db_path.replace("\\", "/")
os.environ["SEED_AUTO"] = "true"
os.environ["JWT_SECRET"] = "test-secret-jwt-not-real"
os.environ["ADMIN_USERNAME"] = "admin"
os.environ["ADMIN_PASSWORD"] = "admin123"

# 确保 backend/ 在 sys.path，便于 import app
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402


@pytest.fixture(scope="module")
def client():
    """模块级 TestClient：with 块触发 lifespan（建表 + 种子注入）。"""
    with TestClient(app) as c:
        yield c


@pytest.fixture
def auth_headers(client):
    """登录拿 token，返回带 Bearer 的请求头。"""
    resp = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "admin123"},
    )
    assert resp.status_code == 200
    token = resp.json()["data"]["token"]
    return {"Authorization": f"Bearer {token}"}
