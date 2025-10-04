# Architecture Comparison: PGlite vs PostgreSQL on Netlify

## 架构对比图 (Architecture Comparison)

### 1. 原始架构 - PGlite 浏览器模式 (Original - Browser-Only Mode)

```
┌─────────────────────────────────────────┐
│         Netlify Static Hosting          │
│  ┌───────────────────────────────────┐  │
│  │      Vue 3 Frontend (SPA)         │  │
│  │  ┌─────────────────────────────┐  │  │
│  │  │   @tg-search/core           │  │  │
│  │  │   (Browser Mode)            │  │  │
│  │  └──────────┬──────────────────┘  │  │
│  │             │                      │  │
│  │             ▼                      │  │
│  │  ┌─────────────────────────────┐  │  │
│  │  │   PGlite (WASM)             │  │  │
│  │  │   PostgreSQL in Browser     │  │  │
│  │  └──────────┬──────────────────┘  │  │
│  │             │                      │  │
│  │             ▼                      │  │
│  │  ┌─────────────────────────────┐  │  │
│  │  │   IndexedDB                 │  │  │
│  │  │   (Browser Storage)         │  │  │
│  │  └─────────────────────────────┘  │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘

特点 (Features):
✅ 无需后端服务器
✅ 无需数据库配置
✅ 完全本地运行
❌ 数据仅存储在单个浏览器
❌ 无法多设备同步
❌ 清除浏览器数据会丢失所有数据
```

### 2. 新架构 - PostgreSQL 后端模式 (New - PostgreSQL Backend Mode)

```
┌──────────────────────────────────────────────────────────┐
│              Netlify Platform                            │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │        Static Hosting (Frontend)                   │ │
│  │  ┌──────────────────────────────────────────────┐  │ │
│  │  │      Vue 3 Frontend (SPA)                    │  │ │
│  │  │                                              │  │ │
│  │  │  HTTP Polling (2s interval)                  │  │ │
│  │  └──────────┬───────────────────────────────────┘  │ │
│  └─────────────┼───────────────────────────────────────┘ │
│                │                                          │
│  ┌─────────────▼───────────────────────────────────────┐ │
│  │        Netlify Functions (Serverless)              │ │
│  │                                                     │ │
│  │  ┌─────────────────┐  ┌──────────────────────┐    │ │
│  │  │  server.ts      │  │     ws.ts            │    │ │
│  │  │  - /api/health  │  │  - GET /ws (poll)    │    │ │
│  │  │  - /api/db-test │  │  - POST /ws (send)   │    │ │
│  │  └────────┬────────┘  └──────────┬───────────┘    │ │
│  │           │                      │                 │ │
│  │  ┌────────▼──────────────────────▼────────┐       │ │
│  │  │         api.ts                         │       │ │
│  │  │  - /api/v1/auth-status                 │       │ │
│  │  │  - /api/v1/sessions                    │       │ │
│  │  │  - Core Instance Management            │       │ │
│  │  └────────┬───────────────────────────────┘       │ │
│  │           │                                        │ │
│  │           │ @tg-search/core                        │ │
│  │           │ initDrizzle()                          │ │
│  └───────────┼────────────────────────────────────────┘ │
└──────────────┼──────────────────────────────────────────┘
               │
               │ PostgreSQL Connection
               │ (DATABASE_URL)
               ▼
    ┌──────────────────────────┐
    │   PostgreSQL Database    │
    │   (External Service)     │
    │                          │
    │  - Supabase             │
    │  - Neon                 │
    │  - Railway              │
    │  - Self-hosted          │
    └──────────────────────────┘

特点 (Features):
✅ 数据持久化存储在 PostgreSQL
✅ 支持多设备/多用户访问
✅ 数据不依赖浏览器
✅ 支持实时更新（通过 HTTP 轮询）
⚠️ 需要配置 PostgreSQL 数据库
⚠️ HTTP 轮询有轻微延迟（2秒）
⚠️ Netlify Functions 有 10 秒超时限制
```

## 数据流对比 (Data Flow Comparison)

### PGlite 模式 (PGlite Mode)
```
User Action
    ↓
Vue Frontend
    ↓
@tg-search/core (Browser)
    ↓
PGlite (WASM)
    ↓
IndexedDB (Browser Storage)
```

### PostgreSQL 模式 (PostgreSQL Mode)
```
User Action
    ↓
Vue Frontend (HTTP Request)
    ↓
Netlify Function (server.ts / api.ts)
    ↓
@tg-search/core (Server)
    ↓
Drizzle ORM
    ↓
PostgreSQL Database (External)

Real-time Updates:
Vue Frontend ← (HTTP Polling 2s) ← ws.ts ← Event Store
```

## 关键文件说明 (Key Files Explanation)

### 前端 (Frontend)
| 文件 | 用途 |
|------|------|
| `apps/web/` | Vue 3 前端应用 |
| `packages/client/src/adapters/websocket.ts` | WebSocket/轮询适配器 |

### 后端函数 (Backend Functions)
| 文件 | 用途 | 端点 |
|------|------|------|
| `netlify/functions/server.ts` | 主服务器函数 | `/api/*` |
| `netlify/functions/api.ts` | 核心 API 操作 | `/api/v1/*` |
| `netlify/functions/ws.ts` | 轮询端点 | `/ws` |

### 配置 (Configuration)
| 文件 | 用途 |
|------|------|
| `netlify.toml` | Netlify 部署配置 |
| `.env.netlify` | 环境变量模板 |
| `netlify/functions/package.json` | Functions 依赖 |

### 核心库 (Core Libraries)
| 文件 | 用途 |
|------|------|
| `packages/core/src/db/index.ts` | 数据库初始化 |
| `packages/core/src/db/pg.ts` | PostgreSQL 驱动 |
| `packages/core/src/db/pglite.browser.ts` | PGlite 浏览器驱动 |

## 环境变量映射 (Environment Variable Mapping)

### 浏览器模式 (Browser Mode)
```bash
# 前端构建时
VITE_WITH_CORE=true

# 运行时（浏览器）
# 无需后端环境变量
```

### PostgreSQL 模式 (PostgreSQL Mode)
```bash
# 前端构建时（可选，如果前端也要连数据库）
VITE_WITH_CORE=true

# 后端 Netlify Functions
DATABASE_TYPE=postgres
DATABASE_URL=postgresql://user:pass@host:port/db

# 可选
DATABASE_DEBUG=true
```

## 请求流程示例 (Request Flow Examples)

### 示例 1: 健康检查 (Health Check)
```
浏览器 → GET /api/health
  → Netlify Functions (server.ts)
  → handler()
  → ensureDbInitialized()
  → 返回状态 JSON

响应:
{
  "success": true,
  "dbType": "postgres",
  "dbInitialized": true
}
```

### 示例 2: 轮询更新 (Poll Updates)
```
浏览器 → GET /ws?sessionId=abc&lastEventId=123456789
  → Netlify Functions (ws.ts)
  → handler()
  → 查询 eventStore
  → 过滤新事件
  → 返回事件列表

响应:
{
  "success": true,
  "events": [...],
  "lastEventId": 123456790
}

浏览器每 2 秒重复此请求
```

### 示例 3: 发送事件 (Send Event)
```
浏览器 → POST /ws
  → Body: { type: "auth:login", data: {...} }
  → Netlify Functions (ws.ts)
  → handler()
  → 处理事件
  → 存储响应到 eventStore
  → 返回确认

响应:
{
  "success": true,
  "sessionId": "abc"
}
```

## 性能考虑 (Performance Considerations)

### PGlite 模式
- ✅ 超快速（本地 WASM）
- ✅ 无网络延迟
- ❌ 首次加载需下载 WASM（~3-5MB）
- ❌ 受浏览器性能限制

### PostgreSQL 模式
- ✅ 服务器级性能
- ✅ 支持大规模数据
- ⚠️ 网络延迟（取决于数据库位置）
- ⚠️ Netlify Functions 冷启动（~500ms-2s）
- ⚠️ HTTP 轮询开销

## 成本对比 (Cost Comparison)

### PGlite 模式
- ✅ **完全免费**（Netlify 免费套餐）
- 无数据库成本
- 无服务器成本

### PostgreSQL 模式
- Netlify: 免费套餐（125,000 函数调用/月）
- PostgreSQL:
  - Supabase: 免费（500MB）
  - Neon: 免费（3GB 存储 + 192 小时计算）
  - Railway: $5/月起
  - Self-hosted: 取决于托管成本

## 迁移路径 (Migration Path)

从 PGlite 迁移到 PostgreSQL:

1. 导出当前数据（如果需要）
2. 在 Netlify 设置环境变量
3. 重新部署
4. 数据库自动迁移
5. 验证功能

**注意**: PGlite 和 PostgreSQL 模式的数据不会自动同步。

## 选择建议 (Recommendations)

### 使用 PGlite 模式当:
- ✅ 个人使用
- ✅ 不需要多设备同步
- ✅ 想要零成本部署
- ✅ 注重隐私（数据仅在本地）

### 使用 PostgreSQL 模式当:
- ✅ 多用户/多设备访问
- ✅ 需要数据持久化和备份
- ✅ 需要服务器端处理
- ✅ 数据量较大（>100MB）
- ✅ 需要团队协作

## 技术栈总结 (Tech Stack Summary)

### 前端 (Frontend)
- Vue 3 + TypeScript
- Vite
- Pinia (State Management)
- UnoCSS

### 后端 (Backend - Netlify Functions)
- Node.js 22+
- TypeScript
- @netlify/functions

### 数据库 (Database)
- **PGlite**: WebAssembly PostgreSQL
- **PostgreSQL**: 标准 PostgreSQL 14+

### ORM & 工具 (ORM & Tools)
- Drizzle ORM
- postgres.js (PostgreSQL client)
- @electric-sql/pglite

### 实时通信 (Real-time Communication)
- ~~WebSocket~~ (不支持 Not supported on Netlify)
- HTTP Polling (轮询替代方案)
