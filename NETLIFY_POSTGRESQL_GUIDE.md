# Netlify + PostgreSQL Deployment Guide

## 概述 (Overview)

本指南介绍如何将 Telegram Search 部署到 Netlify，并使用 PostgreSQL 数据库后端，而不是浏览器内的 PGlite 数据库。

This guide explains how to deploy Telegram Search to Netlify with PostgreSQL database backend instead of the browser-only PGlite database.

## 架构 (Architecture)

### 浏览器模式 (Browser-Only Mode) - 默认
- 前端完全在浏览器中运行
- 使用 PGlite (WebAssembly PostgreSQL) 作为数据库
- 所有数据存储在浏览器的 IndexedDB 中
- 不需要后端服务器

### PostgreSQL 模式 (PostgreSQL Mode) - 新功能
- 前端通过 Netlify Functions 连接到 PostgreSQL 数据库
- 支持持久化存储
- 支持多用户/多设备访问
- 使用 HTTP 轮询实现实时更新（Netlify 不支持持久 WebSocket）

## 部署步骤 (Deployment Steps)

### 1. 准备 PostgreSQL 数据库 (Prepare PostgreSQL Database)

你需要一个可访问的 PostgreSQL 数据库。推荐选项：

You need an accessible PostgreSQL database. Recommended options:

- **Supabase** (https://supabase.com) - 免费套餐 Free tier
- **Neon** (https://neon.tech) - 免费套餐 Free tier
- **Railway** (https://railway.app) - 免费试用 Free trial
- **Amazon RDS** - 付费 Paid
- **自托管 PostgreSQL** - Self-hosted PostgreSQL

#### 数据库要求 (Database Requirements)
- PostgreSQL 版本 12 或更高
- 支持 pgvector 扩展（用于语义搜索）
- 可通过互联网访问

### 2. 配置 Netlify 环境变量 (Configure Netlify Environment Variables)

在 Netlify 控制台中，设置以下环境变量：

In the Netlify dashboard, set the following environment variables:

**必需变量 (Required Variables):**
```
DATABASE_TYPE=postgres
DATABASE_URL=postgresql://username:password@host:port/database
```

**可选变量 (Optional Variables):**
```
DATABASE_DEBUG=false
VITE_TELEGRAM_APP_ID=YOUR_TELEGRAM_API_ID
VITE_TELEGRAM_APP_HASH=YOUR_TELEGRAM_API_HASH
```

#### 设置步骤 (Setup Steps):
1. 登录 Netlify Dashboard
2. 选择你的站点 (Select your site)
3. 进入 "Site settings" → "Environment variables"
4. 点击 "Add a variable"
5. 添加上述变量

### 3. 部署到 Netlify (Deploy to Netlify)

#### 方法 1: 通过 GitHub (Via GitHub)
1. 将代码推送到 GitHub 仓库
2. 在 Netlify 中连接 GitHub 仓库
3. Netlify 会自动检测配置并开始构建

#### 方法 2: 通过 Netlify CLI (Via Netlify CLI)
```bash
# 安装 Netlify CLI
npm install -g netlify-cli

# 登录 Netlify
netlify login

# 初始化站点
netlify init

# 部署
netlify deploy --prod
```

### 4. 验证部署 (Verify Deployment)

部署完成后，访问以下端点验证：

After deployment, verify by visiting these endpoints:

#### 健康检查 (Health Check)
```
https://your-site.netlify.app/api/health
```

预期响应 (Expected response):
```json
{
  "success": true,
  "message": "Server is running",
  "dbInitialized": true,
  "dbType": "postgres",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### 数据库测试 (Database Test)
```
https://your-site.netlify.app/api/db-test
```

预期响应 (Expected response):
```json
{
  "success": true,
  "message": "Database connection successful",
  "dbType": "postgres",
  "result": [{"test": 1}]
}
```

## 实时更新机制 (Real-time Updates)

由于 Netlify Functions 不支持持久 WebSocket 连接，系统使用 **HTTP 轮询** 作为替代方案。

Since Netlify Functions don't support persistent WebSocket connections, the system uses **HTTP polling** as an alternative.

### 轮询端点 (Polling Endpoint)

**获取事件 (Get Events):**
```
GET /ws?sessionId=YOUR_SESSION_ID&lastEventId=0
```

**发送事件 (Send Events):**
```
POST /ws
Content-Type: application/json

{
  "type": "event-type",
  "data": { ... }
}
```

### 前端集成 (Frontend Integration)

前端会自动检测运行环境并选择合适的通信方式：
- 本地开发：使用 WebSocket
- Netlify 部署：使用 HTTP 轮询

The frontend automatically detects the environment and chooses the appropriate communication method:
- Local development: WebSocket
- Netlify deployment: HTTP polling

## API 端点 (API Endpoints)

### 基础端点 (Basic Endpoints)

| 端点 Endpoint | 方法 Method | 描述 Description |
|---------------|-------------|------------------|
| `/api/health` | GET | 健康检查 Health check |
| `/api/db-test` | GET | 数据库连接测试 Database connection test |
| `/api/v1/auth-status` | GET | 认证状态 Authentication status |
| `/api/v1/sessions` | GET | 会话列表 Session list |
| `/ws` | GET | 轮询事件 Poll for events |
| `/ws` | POST | 发送事件 Send events |

## 环境变量参考 (Environment Variables Reference)

### 数据库配置 (Database Configuration)

| 变量 Variable | 类型 Type | 默认值 Default | 描述 Description |
|---------------|-----------|----------------|------------------|
| `DATABASE_TYPE` | string | `pglite` | 数据库类型：`postgres` 或 `pglite` |
| `DATABASE_URL` | string | - | PostgreSQL 连接字符串 |
| `DATABASE_DEBUG` | boolean | `false` | 启用数据库调试日志 |

### Telegram API 配置 (Telegram API Configuration)

| 变量 Variable | 类型 Type | 描述 Description |
|---------------|-----------|------------------|
| `VITE_TELEGRAM_APP_ID` | string | Telegram API ID |
| `VITE_TELEGRAM_APP_HASH` | string | Telegram API Hash |

### 构建配置 (Build Configuration)

| 变量 Variable | 类型 Type | 默认值 Default | 描述 Description |
|---------------|-----------|----------------|------------------|
| `NODE_VERSION` | string | `22.20.0` | Node.js 版本 |
| `PNPM_VERSION` | string | `10.17.1` | pnpm 版本 |
| `VITE_WITH_CORE` | boolean | `true` | 启用浏览器内核心功能 |

## 故障排除 (Troubleshooting)

### 数据库连接失败 (Database Connection Fails)

**问题 (Problem):** API 返回 500 错误，日志显示 "Failed to connect to database"

**解决方案 (Solutions):**
1. 验证 `DATABASE_URL` 格式是否正确
2. 确认数据库主机可以从互联网访问
3. 检查数据库用户名和密码
4. 验证数据库是否已创建
5. 检查防火墙规则

### 函数超时 (Function Timeout)

**问题 (Problem):** Netlify Functions 超时（10秒限制）

**解决方案 (Solutions):**
1. 优化数据库查询
2. 添加数据库连接池
3. 考虑使用后台函数（Background Functions）
4. 分解大型操作为多个小型请求

### CORS 错误 (CORS Errors)

**问题 (Problem):** 浏览器控制台显示 CORS 错误

**解决方案 (Solutions):**
1. 检查 netlify.toml 中的 CORS 头配置
2. 确认所有 API 响应都包含 `Access-Control-Allow-Origin` 头
3. 验证 OPTIONS 请求处理正确

## 性能优化 (Performance Optimization)

### 数据库优化 (Database Optimization)

1. **连接池 (Connection Pooling)**
   - 使用 PgBouncer 或类似工具
   - 配置合适的连接池大小

2. **索引 (Indexes)**
   - 为常用查询字段添加索引
   - 使用 pgvector 索引优化向量搜索

3. **缓存 (Caching)**
   - 使用 Redis 缓存频繁访问的数据
   - 实现客户端缓存策略

### Netlify 优化 (Netlify Optimization)

1. **函数冷启动 (Cold Starts)**
   - 保持函数代码简洁
   - 延迟加载大型依赖
   - 使用 Netlify 的函数预热功能

2. **轮询频率 (Polling Frequency)**
   - 根据实际需求调整轮询间隔
   - 使用指数退避策略减少负载

## 安全建议 (Security Recommendations)

1. **数据库安全 (Database Security)**
   - 使用强密码
   - 启用 SSL/TLS 连接
   - 限制数据库访问 IP
   - 定期更新数据库密码

2. **API 安全 (API Security)**
   - 实现身份验证和授权
   - 使用 API 密钥保护敏感端点
   - 实施速率限制
   - 验证所有输入数据

3. **环境变量安全 (Environment Variable Security)**
   - 不要在代码中硬编码密钥
   - 使用 Netlify 的环境变量管理
   - 定期轮换密钥和令牌

## 成本估算 (Cost Estimation)

### Netlify 成本 (Netlify Costs)
- 免费套餐：100GB 带宽/月，125,000 函数调用/月
- Pro 套餐：$19/月起

### 数据库成本 (Database Costs)
- Supabase 免费套餐：500MB 数据库，2GB 转发
- Neon 免费套餐：3GB 存储，计算按小时计费

### 预估总成本 (Estimated Total Cost)
- 小型项目：$0-20/月（使用免费套餐）
- 中型项目：$50-100/月
- 大型项目：根据使用量定制

## 技术支持 (Technical Support)

如有问题，请：
- 查看项目文档
- 在 GitHub 上提交 Issue
- 加入社区讨论

For issues, please:
- Check the project documentation
- Submit an issue on GitHub
- Join the community discussion

## 相关文档 (Related Documentation)

- [Netlify Functions 文档](https://docs.netlify.com/functions/overview/)
- [PostgreSQL 文档](https://www.postgresql.org/docs/)
- [Telegram API 文档](https://core.telegram.org/api)
- [项目主 README](../README.md)
