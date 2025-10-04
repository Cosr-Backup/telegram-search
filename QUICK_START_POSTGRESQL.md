# Quick Start: PostgreSQL + Netlify Deployment

## 🎯 什么改变了？ (What Changed?)

现在可以在 Netlify 上使用 PostgreSQL 数据库后端，而不是仅限于浏览器内的 PGlite 数据库！

Now you can use PostgreSQL database backend on Netlify instead of just the browser-only PGlite database!

## 🚀 快速部署 (Quick Deployment)

### 选项 1: 浏览器模式（默认）(Option 1: Browser Mode - Default)

无需额外配置，数据存储在浏览器中。

No extra configuration needed. Data stored in browser.

```bash
# 直接部署 (Deploy directly)
netlify deploy --prod
```

### 选项 2: PostgreSQL 模式 (Option 2: PostgreSQL Mode)

需要 PostgreSQL 数据库。推荐使用 Supabase 或 Neon 免费套餐。

Requires PostgreSQL database. Recommended: Supabase or Neon free tier.

#### 步骤 (Steps):

1. **获取 PostgreSQL 数据库 (Get PostgreSQL Database)**
   
   免费选项 (Free options):
   - [Supabase](https://supabase.com) 
   - [Neon](https://neon.tech)
   - [Railway](https://railway.app)

2. **设置环境变量 (Set Environment Variables)**
   
   在 Netlify Dashboard → Site settings → Environment variables:
   
   ```
   DATABASE_TYPE=postgres
   DATABASE_URL=postgresql://username:password@host:port/database
   ```

3. **部署 (Deploy)**
   
   ```bash
   netlify deploy --prod
   ```

4. **验证 (Verify)**
   
   访问 (Visit): `https://your-site.netlify.app/api/health`
   
   应该看到 (Should see):
   ```json
   {
     "success": true,
     "dbType": "postgres",
     "dbInitialized": true
   }
   ```

## 📡 实时更新 (Real-time Updates)

由于 Netlify 不支持 WebSocket，系统使用 HTTP 轮询：

Since Netlify doesn't support WebSocket, the system uses HTTP polling:

- **轮询间隔 (Polling interval)**: 2 秒 (2 seconds)
- **自动切换 (Auto-switching)**: 前端会自动检测环境并选择合适的方式

## 🔧 配置对比 (Configuration Comparison)

| 功能 Feature | PGlite 模式 | PostgreSQL 模式 |
|--------------|-------------|-----------------|
| 数据存储位置 Storage | 浏览器 IndexedDB | PostgreSQL 服务器 |
| 多设备同步 Multi-device | ❌ 否 No | ✅ 是 Yes |
| 数据持久化 Persistence | ⚠️ 浏览器本地 Browser local | ✅ 服务器 Server |
| 需要数据库 Requires DB | ❌ 否 No | ✅ 是 Yes |
| 实时更新 Real-time | - | HTTP 轮询 Polling |

## 📝 环境变量清单 (Environment Variables Checklist)

### 必需（PostgreSQL 模式）(Required for PostgreSQL Mode)
- [x] `DATABASE_TYPE=postgres`
- [x] `DATABASE_URL=postgresql://...`

### 可选 (Optional)
- [ ] `VITE_TELEGRAM_APP_ID` - 自定义 Telegram API ID
- [ ] `VITE_TELEGRAM_APP_HASH` - 自定义 Telegram API Hash
- [ ] `DATABASE_DEBUG=true` - 启用数据库调试日志

## 🧪 测试端点 (Test Endpoints)

部署后测试这些端点 (Test these endpoints after deployment):

1. **健康检查 (Health Check)**
   ```
   GET /api/health
   ```

2. **数据库测试 (Database Test)**
   ```
   GET /api/db-test
   ```

3. **轮询端点 (Polling Endpoint)**
   ```
   GET /ws?sessionId=test
   ```

## ⚠️ 重要提示 (Important Notes)

1. **PGlite vs PostgreSQL**: 默认使用 PGlite（浏览器模式）。只有设置了 `DATABASE_URL` 才会使用 PostgreSQL。

2. **WebSocket 限制**: Netlify Functions 不支持持久 WebSocket 连接。系统自动使用 HTTP 轮询作为替代。

3. **函数超时**: Netlify Functions 有 10 秒超时限制。确保数据库查询足够快。

4. **冷启动**: 首次请求可能较慢，因为需要初始化数据库连接。

## 📚 详细文档 (Detailed Documentation)

查看完整指南 (See full guide):
- [NETLIFY_POSTGRESQL_GUIDE.md](./NETLIFY_POSTGRESQL_GUIDE.md) - 详细部署指南
- [NETLIFY_DEPLOYMENT.md](./NETLIFY_DEPLOYMENT.md) - 原始 Netlify 部署文档

## 🆘 需要帮助？ (Need Help?)

- 📖 查看详细文档
- 🐛 提交 GitHub Issue  
- 💬 加入社区讨论

## 🎉 就这些！(That's it!)

现在你可以在 Netlify 上使用 PostgreSQL 数据库了！

Now you can use PostgreSQL database on Netlify!
