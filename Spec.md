# Spec - 企业微信会话内容存档看板 v1.0

> 生成日期：2026-08-10
> 基于：PRD v1.0 + 架构设计 v1.0 + UIUX设计 v1.0（均已用户确认）
> 状态：已确认（Phase 1 用户确认三文档后自动生成）
> 本文档是团队内部契约——锁定范围、功能、API、页面、设计 Token。后续开发以本 Spec 为唯一依据。

---

## 1. 产品定义

- **一句话描述**：把企业微信客户群/外部群的聊天记录（经官方会话内容存档）统一拉取、解密、存储，并用网页（企业微信原生风）查看、检索、筛选。
- **目标用户**：运营/销售主管、合规/风控专员、管理者。
- **核心问题**：查不到（原生无导出）、搜不出（无统一检索）、管不住（无分级权限）。

## 2. MVP 范围（锁定——不在此列表的功能一律不做）

| 优先级 | 功能 | 验收标准摘要 | 来源 |
|--------|------|-------------|------|
| P0 | 会话拉取+解密+存储（数据层） | 增量写入 DB；演示态用 Mock 拉取器注入种子；生产态用官方 SDK | PRD/架构 |
| P0 | 网页会话展示 | 群列 + 时间线气泡 + 常用消息类型渲染 | PRD |
| P0 | 全文检索与筛选 | 关键词 + 群/发送者/类型/时间组合 | PRD |

> 导出、分级权限、敏感词预警、离职继承、AI 分析、移动端原生 App：**明确不做（Backlog）**。架构端点表中 `/export` 标注为后续，MVP 不实现。

## 3. 明确不做（Out-of-Scope — 锁定）

| 不做的功能 | 原因 | 何时考虑 |
|------------|------|----------|
| 导出 CSV/PDF | RICE 低(1.50)，非核心 | v2.0 |
| RBAC 分级权限与操作留痕 | RICE 1.60，演进方向 | 强监管行业需求明确后 |
| 敏感词预警/风控质检 | RICE 1.12 | v2.0 |
| 离职客户对话继承 | RICE 0.52 | v2.0 |
| AI 摘要/语义搜索 | 超出 MVP，需额外模型 | 第二阶段 |
| 移动端原生 App | Web 已覆盖桌面场景 | 移动访问需求明确后 |

## 4. 技术架构（锁定 — 含运行态说明）

> 规则与选型由架构师按项目定；本 Spec 锁定落地栈。**演示态/生产态双模**是 PRD 前置依赖（权限未购、本地无 Linux SDK）下的工程兜底，不偏离 PRD 范围。

| 层 | 技术 | 演示态 | 生产态 |
|----|------|--------|--------|
| 后端框架 | FastAPI (Python 3.13) | 同 | 同 |
| ORM/数据访问 | SQLAlchemy 2.x | SQLite（零依赖可跑） | PostgreSQL 15+（`DATABASE_URL` 切换，JSONB 字段降级为 JSON 字符串存储） |
| 拉取层 | 拉取器抽象 `Puller` | `MockPuller`：注入种子聊天数据，无需权限/Docker | `WeComPuller`：官方 C SDK v3.0 + PyWeWorkFinance，需 Docker(Linux)+私钥 |
| 解密 | `cryptography` 实现 RSA(PKCS1 v1.5,2048)+AES | Mock 路径直接存明文（无密文） | 真实路径：RSA 解密 random_key → AES 解密 chat_msg |
| 定时任务 | APScheduler | 演示用一次性 seed + 可选周期任务 | 1-5 分钟增量拉取 |
| 前端框架 | React 18 + Vite + TypeScript | 同 | 同 |
| 前端样式 | Tailwind CSS + 设计 Token(设计系统) | 同 | 同 |
| 图标库 | **Lucide**（lucide-react，16/20/24px 描边） | 同 | 同（全站唯一，禁止 emoji/混用） |
| 组件库 | 手写组件（Tailwind + Lucide，等效 shadcn 风格，避免 CLI 依赖） | 同 | 同 |
| 认证 | JWT（python-jose），管理后台账号体系 | 同 | 同 |
| 部署 | 后端 `uvicorn`；前端 `vite build` 静态 | 本地 | 后端 Docker/Linux 服务器，前端 Vercel/静态托管 |

## 5. API 端点清单（锁定——开发时以此为唯一依据）

统一响应：`{ "code": 0, "data": {}, "message": "" }`，错误码非 0。认证：`Authorization: Bearer <jwt>`。版本前缀固定 `/api/v1/`。

| Method | Path | 功能 | 认证 | 关键参数 |
|--------|------|------|------|---------|
| POST | `/api/v1/auth/login` | 登录获取 JWT | 否 | `username`, `password` |
| GET | `/api/v1/rooms` | 群聊/会话列表（名称、消息数、最后时间） | Bearer | `?page=&limit=&keyword=` |
| GET | `/api/v1/rooms/:roomid` | 会话详情（成员、基本信息） | Bearer | path roomid |
| GET | `/api/v1/messages` | 消息时间线（分页） | Bearer | `roomid, page, limit, before_msg_time` |
| GET | `/api/v1/messages/:msgid` | 单条消息详情 | Bearer | path msgid |
| GET | `/api/v1/search` | 全文/条件检索消息 | Bearer | `q, roomid, sender_id, msg_type, start, end` |
| GET | `/api/v1/members` | 成员列表（员工/外部联系人） | Bearer | `?keyword=&user_type=` |
| GET | `/api/v1/media` | 媒体文件代理（演示态返回占位/本地路径） | Bearer | `?path=<media_path>` |
| GET | `/api/v1/health` | 服务与拉取位点健康探测 | 内部/Bearer | — |

> 完整 OpenAPI 3.0 由架构师产出 `openapi.yaml` 作为 sidecar，前端据其手写 TS 类型（不依赖代码生成）。

## 6. 数据库表清单（锁定）

> 演示态 SQLite；生产态同名表，JSONB 字段以 JSON 字符串存储（SQLAlchemy `JSON` 类型跨库兼容）。

| 表名 | 核心字段 | 索引 | 关联 |
|------|----------|------|------|
| chat_rooms | roomid(PK), room_name, room_type(1群/2单聊/3外部群), member_count, last_msg_time, last_sync | room_name, last_msg_time | 1:N chat_messages |
| chat_messages | msgid(PK), roomid, sender_id, sender_type(1员工/2外部/3机器人), receiver_ids(JSON), msg_type, msg_time(BIGINT ms), msg_time_ts(UTC), action(send/recall/switch), content(JSON), media_path | (roomid,msg_time_ts DESC), (sender_id,msg_time_ts DESC), gin(content) | N:1 chat_rooms |
| chat_members | user_id, user_type(PK 组合), display_name, corp_name, avatar_path | display_name | — |
| sync_cursor | id(PK=1), last_seq, last_pull_at, consecutive_empty | — | 单实例单游标 |

## 7. 页面清单（锁定）

| 页面 | 路由 | 核心组件 | 对应 API | 设计 Token 主题 |
|------|------|----------|----------|-----------------|
| 群聊列表侧边栏 | `/`(左栏) | 分组头、会话项(Avatar+群名+摘要+时间+类型角标)、搜索框 | /rooms | 企业微信原生风 |
| 聊天时间线视图 | `/room/:roomid`(右主区) | 会话头、日期分割、消息气泡(左白右绿)、撤回系统条、媒体卡、只读条 | /messages,/media | 企业微信原生风 |
| 搜索与筛选面板 | 抽屉/浮层 | 关键词、范围、发送者、类型 Chip、时间范围、应用/重置 | /search | 企业微信原生风 |
| 消息详情与媒体预览 | Lightbox 浮层 | 图片放大、语音/视频播放、文件下载、元信息 | /messages/:id,/media | 企业微信原生风 |

> 导出页（/export 对应 UI）：MVP 不实现。

## 8. 设计 Token（锁定）

> 设计师产出 `design-tokens.json` + `design-tokens.css`，前端 import 引用。**全部颜色经 Token，禁止硬编码（除 #fff/#000 团队红线，本规范一律改用 Token）。**

- **主色**：`--accent: #07C160`（企业微信绿）；本端气泡 `--bubble-sent: #95EC69`；对端气泡 `--bubble-recv: #FFFFFF`。
- **中性**：`--bg: #F2F3F5`, `--surface: #FFFFFF`, `--surface-chat: #EDEDED`, `--fg: #1F1F1F`, `--muted: #6B6F76`, `--border: #E3E5E8`。
- **语义**：`--success:#2BA471 --warn:#E6A23C --danger:#F56C6C --info:#4C8DFF`；外部联系人标签 `--tag-external-bg:#FFF4E5/--tag-external-fg:#B26A00`；撤回 `--tag-recall-bg:#F2F3F5/--tag-recall-fg:#9AA0A6`。
- **字体**：`--font-display/body: "PingFang SC","Microsoft YaHei","Noto Sans SC",sans-serif`；`--font-mono: "JetBrains Mono",monospace`。
- **间距**：4px 网格（--space-1..12）；**圆角** --radius-sm 6 / md 8 / lg 12 / pill 9999；**阴影** 三级；**动效** --motion-fast 120ms / --motion-base 180ms，ease `cubic-bezier(0.2,0,0,1)`（**禁止弹跳缓动**）。
- **图标库**：Lucide（lucide-react），16/20/24px，描边 1.5px，`currentColor` 取色。
- **对标品牌**：企业微信 / 微信原生聊天界面。

## 9. 验收标准（锁定——QA 测试时以此为唯一依据）

| 编号 | 功能 | 格式 | 优先级 |
|------|------|------|--------|
| AC-1 | 数据拉取/种子 | Given 空库启动，When 拉取器运行，Then 种子群聊与多类型消息入库（演示态 Mock 注入；生产态 SDK 增量） | P0 |
| AC-2 | 群聊列表 | Given 有数据，When 打开左栏，Then 按群分组显示名称/消息数/最后时间，可关键词过滤 | P0 |
| AC-3 | 时间线视图 | Given 选中群，When 加载，Then 时间正序气泡，渲染文本/图片/语音/视频/文件/链接/撤回，图片可放大、语音视频可播、文件可下 | P0 |
| AC-4 | 全文检索 | Given 输入关键词，When 提交，Then 返回命中消息(群/发送者/时间)，点击跳转 | P0 |
| AC-5 | 多维筛选 | Given 筛选栏，When 按群+发送者+类型+时间任意组合，Then 时间线仅显符合项，可重置 | P0 |
| AC-6 | 解密正确性(生产) | Given 密文，When RSA+AES 解密，Then 明文与官方一致，乱码/丢字段=失败 | P0(生产) |
| AC-7 | 鉴权 | Given 无 JWT，When 调受保护 API，Then 返回 401 | P0 |

## 10. 边界与约束

- 不支持 IE；兼容 Chrome/Safari/Firefox 最新 2 版。
- 响应式断点：xs<640 / sm≥640 / md≥768 / lg≥1024 / xl≥1280；桌面左 280px 侧栏+右时间线，移动侧栏改底部 Tab。
- 性能：群列首屏 < 3s；列表/检索 API p95 < 500ms；长列表虚拟滚动。
- 5 天数据窗口（生产态）：高频拉取+位点持久+停滞告警+4 天预警（演示态用 seed 体现）。
- 历史盲区：开通前消息官方不回溯，界面如实提示。
- 合规：员工/客户知情同意；客户拒存档仅留员工侧，界面呈现"未授权"。
- 媒体：演示态用占位/本地静态资源；生产态窗口内落地，超期降级 ImageOff。

## 11. 内嵌已知坑（从架构文档拉取）

| 坑 | 技术栈指纹 | 根因 | 修法 |
|----|------------|------|------|
| macOS/Windows 直接跑 SDK | wecom-sdk | 官方仅 Linux .so | 生产用 Docker(Linux)；演示用 Mock 拉取 |
| 位点未持久即前进 | apscheduler+pg | 崩溃丢位点 | 先写 PG 成功再提交 last_seq |
| 解密失败静默吞 | cryptography | 数据黑洞 | 失败告警+跳过保留密文 |
| PKCS1 v1.5 无 sentinel | cryptography | 填充预言攻击 | 解密带 sentinel 校验 |
| random_key 跨消息复用 | cryptography | 解密错乱 | 每条独立 |
| 私钥硬编码 | — | 泄露 | 环境变量/KMS，.env 忽略 |
| IV 取值错误 | cryptography | 取前 16 字节为 IV | 严格按 SDK 约定 |
| msgid 未幂等 | sqlalchemy | 重试重复 | msgid 主键 |
| 跨域直连 DB | — | 安全 | 全走 /api/v1 + JWT |

## 12. 端到端验证步骤（Spec 锁定）

```bash
# 后端（演示态，SQLite + Mock 种子）
cd backend
pip install -r requirements.txt
python seed.py            # 注入种子群聊与多类型消息（空库时自动）
uvicorn app.main:app --reload --port 8000
# 断言：GET /api/v1/health -> {"code":0,...}
# 断言：POST /api/v1/auth/login -> {"code":0,"data":{"token":...}}
# 断言：GET /api/v1/rooms?keyword= -> 返回群列表
# 断言：GET /api/v1/messages?roomid=<id> -> 返回时间线
# 断言：GET /api/v1/search?q=报价 -> 返回命中

# 前端
cd frontend
npm install
npm run dev             # http://localhost:5173 代理 /api/v1 -> :8000
# 断言：左栏显示群列表，点击进入时间线，搜索"报价"命中高亮
```

## 13. 变更记录

| 日期 | 变更内容 | 原因 | 影响范围 |
|------|----------|------|----------|
| 2026-08-10 | v1.0 首版 Spec | Phase 1 三文档确认后生成 | 全 |
| 2026-08-10 | 引入演示态/生产态双模（SQLite+Mock / PG+SDK） | 权限未购、本地无 Linux SDK 的工程兜底 | 后端拉取层、存储 |
