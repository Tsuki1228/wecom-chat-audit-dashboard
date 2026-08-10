"""鉴权服务：演示账号登录与 JWT 签发。"""
from __future__ import annotations

from app.core.config import settings
from app.core.response import CODE_PARAM
from app.core.security import create_access_token, verify_password


class AuthError(Exception):
    def __init__(self, message: str, code: int = CODE_PARAM) -> None:
        super().__init__(message)
        self.code = code


def login(username: str, password: str) -> dict:
    """校验演示账号，成功返回 token 信息。"""
    if username != settings.ADMIN_USERNAME or not verify_password(password):
        raise AuthError("用户名或密码错误")
    token = create_access_token(subject=settings.ADMIN_USERNAME)
    return {
        "token": token,
        "token_type": "Bearer",
        "expire_minutes": settings.ACCESS_TOKEN_EXPIRE_MINUTES,
    }
