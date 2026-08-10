"""登录端点（无需鉴权）：用户名密码换取 JWT。"""
from __future__ import annotations

from fastapi import APIRouter

from app.core.response import fail, ok
from app.schemas import LoginRequest
from app.services import auth_service
from app.services.auth_service import AuthError

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.post("/login")
def login(req: LoginRequest):
    try:
        data = auth_service.login(req.username, req.password)
    except AuthError as exc:
        return fail(str(exc), code=exc.code, status=401)
    return ok(data)
