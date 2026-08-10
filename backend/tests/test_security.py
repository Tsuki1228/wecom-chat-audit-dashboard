"""core/security 单元测试：JWT 签发/校验往返、无效 token 返回 None、密码校验。"""
from app.core import security


def test_token_roundtrip():
    tok = security.create_access_token("admin")
    assert isinstance(tok, str)
    assert security.decode_token(tok) == "admin"


def test_decode_invalid_token_returns_none():
    assert security.decode_token("not.a.valid.token") is None
    assert security.decode_token("") is None


def test_verify_password():
    # 演示账号密码来自配置（conftest 固定为 admin123）
    assert security.verify_password("admin123") is True
    assert security.verify_password("wrong-password") is False
