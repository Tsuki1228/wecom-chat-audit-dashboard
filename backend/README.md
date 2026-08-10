# 企业微信会话内容存档看板 - 后端（MVP 演示态）

FastAPI 后端，提供会话列表、消息时间线、全文检索、成员列表、媒体代理与鉴权。
演示态使用 SQLite + Mock 拉取器注入种子数据，无需企业微信权限、无需 Docker、无需 Linux SDK。

## 目录结构

```
backend/
  app/
    main.py            # 入口：创建 FastAPI、挂载路由、CORS、启动自动 seed
    core/
      config.py        # 环境变量：DATABASE_URL / JWT_SECRET / PULLER / SEED_AUTO
      security.py      # JWT 签发校验(python-jose) + 密码校验(passlib)
      response.py      # 统一响应封装 {code,data,message}
    db.py              # SQLAlchemy engine/session（SQLite 演示）
    models.py          # 4 表 ORM
    schemas.py         # Pydantic 响应模型
    pullers/
      base.py          # 拉取器抽象基类
      mock.py          # MockPuller：种子多群多类型消息
      wecom.py         # WeComPuller：真实 SDK 拉取+解密（演示不启用）
    crypto/
      decrypt.py       # RSA PKCS1 v1.5 + AES 解密（带 sentinel 校验）
    repositories/      # rooms / messages / members / search
    services/          # auth / rooms / messages / search
    api/routes/        # auth / rooms / messages / search / members / media / health
  static/              # 占位媒体：placeholder.png、sample.txt、sample.pdf
  seed.py              # 空库时注入种子
  requirements.txt
  README.md
```

## 快速启动（演示态）

```bash
cd backend

# 1. 创建虚拟环境（Python 3.13 已验证）
python -m venv .venv
.venv/Scripts/pip install -r requirements.txt   # Windows
# .venv/bin/pip install -r requirements.txt      # Linux/macOS

# 2. 注入种子（空库时自动；也可手动执行）
.venv/Scripts/python seed.py

# 3. 启动服务
.venv/Scripts/python -m uvicorn app.main:app --reload --port 8000
```

启动后访问：http://localhost:8000/api/v1/health

也可以通过根路径查看自动生成的 OpenAPI 文档：http://localhost:8000/docs

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| DATABASE_URL | sqlite:///./wecom_audit.db | 演示态 SQLite；生产态改 PostgreSQL 连接串 |
| JWT_SECRET | dev-mvp-secret-change-me | JWT 签名密钥，生产态务必替换 |
| PULLER | mock | mock=演示种子；wecom=真实 SDK 拉取（需 Docker+私钥） |
| SEED_AUTO | true | 空库启动时是否自动注入种子 |
| ADMIN_USERNAME / ADMIN_PASSWORD | admin / admin123 | 演示登录账号 |

## 演示账号

- 用户名：`admin`
- 密码：`admin123`

## API 端点（统一响应 {code,data,message}）

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| POST | /api/v1/auth/login | 否 | 登录获取 JWT |
| GET | /api/v1/rooms | Bearer | 会话列表（消息数/最后时间），支持 keyword 过滤 |
| GET | /api/v1/rooms/{roomid} | Bearer | 会话详情（成员 + 基本信息） |
| GET | /api/v1/messages | Bearer | 时间线（按时间升序分页），支持 before_msg_time |
| GET | /api/v1/messages/{msgid} | Bearer | 单条消息详情 |
| GET | /api/v1/search | Bearer | 关键词 + 群/发送者/类型/时间组合检索 |
| GET | /api/v1/members | Bearer | 成员列表，支持 keyword / user_type |
| GET | /api/v1/media | Bearer | 媒体代理（演示返回 static 占位资源） |
| GET | /api/v1/health | 否 | 健康检查 |

## 验证示例

```bash
# 健康检查
curl http://localhost:8000/api/v1/health

# 登录获取 token
TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | python -c "import sys,json;print(json.load(sys.stdin)['data']['token'])")

# 会话列表
curl -H "Authorization: Bearer $TOKEN" "http://localhost:8000/api/v1/rooms"

# 消息时间线
curl -H "Authorization: Bearer $TOKEN" "http://localhost:8000/api/v1/messages?roomid=room_ext_group_001"

# 检索“报价”
curl -H "Authorization: Bearer $TOKEN" "http://localhost:8000/api/v1/search?q=%E6%8A%A5%E4%BB%B7"

# 成员列表
curl -H "Authorization: Bearer $TOKEN" "http://localhost:8000/api/v1/members"
```

## 解密模块（生产态）

`app/crypto/decrypt.py` 实现真实链路：Base64 解码 random_key → RSA PKCS1 v1.5 解密
AES 密钥（带 sentinel 校验）→ 取前 16 字节为 IV → AES 解密 chat_msg → 明文 JSON。
`WeComPuller` 复用该模块；演示态由 `MockPuller` 直接写入明文，不调用解密。

## 已知限制

- 演示态数据为 Mock 种子，非真实企业微信消息。
- 生产态需 Docker(Linux) + 官方 C SDK + RSA 私钥（环境变量注入，绝不入仓库）。
- SQLite 全文检索为 JSON 文本模糊匹配；生产态 PostgreSQL 建议改用 tsvector / GIN。
