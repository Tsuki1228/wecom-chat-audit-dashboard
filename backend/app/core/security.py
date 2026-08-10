"""鉴权：JWT 签发/校验（python-jose）与演示账号密码校验（passlib）。

演示态账号体系未落库（Spec 仅 4 张业务表），账号从配置读取。生产态应改为
用户表 + 密码哈希存储，本模块预留校验接口即可平滑替换。
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings
from app.core.response import CODE_UNAUTH

_pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")

# 演示账号哈希（运行期按配置明文计算，避免硬编码密文）
_EXPECTED_HASH = _pwd.hash(settings.ADMIN_PASSWORD)

_bearer = HTTPBearer(auto_error=False)


def verify_password(plain: str) -> bool:
    return _pwd.verify(plain, _EXPECTED_HASH)


def create_access_token(subject: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": subject, "exp": expire}
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> str | None:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        return payload.get("sub")
    except JWTError:
        return None


async def require_auth(
    cred: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> str:
    """Bearer 鉴权依赖：无 token 或 token 非法返回 401。"""
    if cred is None or not cred.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": CODE_UNAUTH, "message": "未提供访问凭证，请先登录"},
        )
    subject = decode_token(cred.credentials)
    if subject is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": CODE_UNAUTH, "message": "凭证无效或已过期，请重新登录"},
        )
    return subject
