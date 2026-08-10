# Vercel 部署指南（前后端分离）

本项目的 GitHub 已就绪（`main` 分支，测试全绿）。Vercel 需要**两个独立项目**：
一个部署前端（`/frontend`），一个部署后端（`/backend`）。

> 已知限制：Vercel Serverless 文件系统是临时/只读的，**SQLite 无法持久化**。
> 因此后端在 Vercel 上**只能跑 `mock` 演示模式**（自动注入种子数据），
> 真实企业微信拉取（`PULLER=wecom`）需要 Docker + SDK + 私钥，必须放在
> Railway / Render / 自建服务器等能跑容器的地方。本指南部署的是可公开访问的演示版。

---

## 0. 前置：准备一个外部 Postgres（必做）

Vercel 后端不能用 SQLite，需要外部数据库。推荐 **Neon 免费层**（无需信用卡）：

1. 打开 https://neon.tech ，用 GitHub 登录，新建一个 Project。
2. 在 Dashboard 找到 **Connection String**（类似）：
   ```
   postgresql://user:password@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require
   ```
3. 复制整串，下一步会用作 `DATABASE_URL`。

（Supabase 免费层也行，同样取 Connection URI，末尾加 `?sslmode=require`。）

---

## 1. 安装 Vercel CLI 并登录

```bash
npm i -g vercel        # 或每次用 npx vercel
vercel login           # 浏览器授权（本项目无法代你完成这步）
```

登录后，在**本仓库根目录**下分别进入两个子目录部署，或用 `--cwd` 指定。

---

## 2. 部署后端（rootDirectory = backend）

在仓库根目录执行（CLI 会以 `backend/` 为项目根）：

```bash
vercel --cwd backend --confirm
```

首次会交互式问几个问题，建议回答：
- **Link to existing project?** No（新建）
- **What's your project name?** `wecom-audit-backend`
- **Framework Preset?** Other
- **Root Directory?** `backend`（关键，让 `api/index.py` 处于项目根的 `api/` 下）
- **Build Command?** 留空（Vercel 用 requirements.txt 自动装依赖）
- **Output / Install Command?** 留空

部署成功后，到 Vercel 控制台 → `wecom-audit-backend` → **Settings → Environment Variables** 添加：

| Key | Value | 说明 |
|-----|-------|------|
| `DATABASE_URL` | `postgresql://...?sslmode=require` | 第 0 步拿到的 Neon 串 |
| `JWT_SECRET`  | `openssl rand -hex 32` 生成的随机串 | 务必替换，不要用默认值 |
| `PULLER`      | `mock` | Vercel 只能跑 mock |
| `ADMIN_USERNAME` | `admin` | 演示账号 |
| `ADMIN_PASSWORD`  | 自定义强密码 | 演示账号密码 |
| `SEED_AUTO`   | `true` | 空库自动注入种子 |

添加完变量后，**Redeploy**（触发重新构建，让 `DATABASE_URL` 生效并建表 + 灌种子）。

健康检查：`https://<backend>.vercel.app/api/v1/health` 应返回 `{"code":0,...}`。

> 注意：`backend/vercel.json` 已设 `maxDuration: 30`。Hobby 套餐函数超时上限可能低于 Pro，
> 若部署报超时相关错误，把 `maxDuration` 改小或升级 Pro 即可。

---

## 3. 部署前端（rootDirectory = frontend）

拿到后端域名后（形如 `https://wecom-audit-backend.vercel.app`），部署前端：

```bash
vercel --cwd frontend --confirm
```

交互回答：
- **Root Directory?** `frontend`
- **Framework Preset?** Vite
- **Build Command?** `npm run build`（已写在 `frontend/vercel.json`）
- **Output Directory?** `dist`（已写）

部署成功后，到 Vercel 控制台 → `wecom-audit-frontend` → **Environment Variables** 添加：

| Key | Value | 说明 |
|-----|-------|------|
| `VITE_API_BASE` | `https://<backend>.vercel.app/api/v1` | **必须以 `/api/v1` 结尾** |

> 为什么是 `/api/v1` 结尾？
> - 后端函数挂在 Vercel 的 `/api`（由 `api/index.py` 决定），请求到达 ASGI 时路径仍是完整 `/api/v1/...`。
> - 前端 `http.ts` 里 `API_BASE = VITE_API_BASE || '/api/v1'`，拼接 `/auth/login` 得到完整路径。
> - 所以生产态 `VITE_API_BASE` 必须包含 `/api/v1`，否则会 404。
> - 若个别旧版 Vercel runtime 行为不同导致 404，备选值为 `https://<backend>.vercel.app/api/api/v1`（极少遇到）。

添加 `VITE_API_BASE` 后 **Redeploy** 前端（环境变量在构建期注入，必须重建）。

最终访问：`https://<frontend>.vercel.app`，用 `admin / <你设的密码>` 登录，看到演示数据即成功。

---

## 4. 本地预览生产态（可选）

```bash
cd backend && uvicorn app.main:app --port 8000
cd frontend && VITE_API_BASE=http://localhost:8000/api/v1 npm run build && npm run preview
```

---

## 5. 常见问题

- **登录后白屏 / 接口 404**：99% 是 `VITE_API_BASE` 没加 `/api/v1` 结尾，或前端没 Redeploy。
- **后端 500 / 表不存在**：`DATABASE_URL` 没配或没 Redeploy，导致仍用默认 SQLite（Vercel 上不可写）。
- **CORS 报错**：后端 `main.py` 的 `allow_origins` 已含 `*`（带凭据反射），正常情况下 Vercel 前后端跨域可用；若自定了严格来源，把前端域名加进 `allow_origins`。
- **冷启动慢**：Hobby 套餐首次访问会冷启动（数秒），属正常。
