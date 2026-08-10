"""统一响应封装：{code, data, message}。

成功 code=0；业务/校验错误 code 非 0。HTTP 状态码与业务 code 解耦，
但 401 鉴权失败返回 HTTP 401，便于前端拦截。
"""
from __future__ import annotations

from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse

CODE_OK = 0
CODE_UNAUTH = 40100
CODE_PARAM = 40000
CODE_NOTFOUND = 40400
CODE_SERVER = 50000


def ok(data=None, message: str = "", code: int = CODE_OK) -> JSONResponse:
    return JSONResponse(
        status_code=200,
        content={"code": code, "data": jsonable_encoder(data), "message": message},
    )


def fail(message: str, code: int = CODE_PARAM, status: int = 400) -> JSONResponse:
    return JSONResponse(
        status_code=status,
        content={"code": code, "data": None, "message": message},
    )
