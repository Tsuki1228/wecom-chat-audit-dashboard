"""种子脚本：空库时注入 Mock 演示数据。

用法（在 backend 目录）：
    python seed.py

等价于启动事件的自动 seed；也可单独执行以重置演示数据。
"""
from __future__ import annotations

import sys
from pathlib import Path

# 把 backend 目录加入导入路径，支持直接 python seed.py 运行
BACKEND_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BACKEND_DIR))

from app.db import SessionLocal, init_db  # noqa: E402
from app.pullers import run_seed  # noqa: E402


def main() -> None:
    init_db()
    db = SessionLocal()
    try:
        result = run_seed(db)
        db.commit()
        print("种子执行完成：", result)
    finally:
        db.close()


if __name__ == "__main__":
    main()
