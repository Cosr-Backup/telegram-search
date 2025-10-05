# Docker 部署问题解决方案

## 问题描述

用户反馈通过 Docker 部署后，应用使用的是浏览器内置的 IndexedDB 数据库，而不是 PostgreSQL，导致无法在不同机器或浏览器间同步数据。

## 根本原因分析

经过详细分析，发现了以下几个问题：

### 1. 端口配置问题
- **后端服务器**运行在容器内的 3000 端口
- **前端服务**运行在容器内的 3333 端口  
- Docker 只暴露了 3333 端口
- 结果：前端无法访问后端服务器

### 2. 网络路由问题
- 前端开发模式（dev）有代理配置，可以转发 `/api` 和 `/ws` 请求到后端
- 前端预览模式（preview）**没有**代理配置
- Docker 使用预览模式运行前端
- 结果：WebSocket 和 API 请求失败

### 3. 数据库回退机制
- 当前端无法连接到后端时，会自动回退到浏览器的 PGlite（类似 SQLite）
- PGlite 数据存储在浏览器的 IndexedDB 中
- 结果：用户看到的是 IndexedDB，而不是 PostgreSQL

## 解决方案

### 核心改进

我们重新设计了 Docker 部署架构，采用**单服务器模式**：

```
Docker 容器（内部端口 3000）
├── 后端服务器 (h3/listhen)
│   ├── /api/* - API 接口
│   ├── /ws - WebSocket 实时通信
│   └── /* - 前端静态文件（支持 SPA 路由）
└── 映射到主机端口 3333
```

### 具体修改

1. **apps/server/src/app.ts**
   - 添加静态文件服务功能
   - 支持 SPA（单页应用）路由
   - `/api` 和 `/ws` 请求由后端处理
   - 其他请求返回静态文件或 index.html

2. **Dockerfile**
   - 只启动后端服务器（`pnpm run server:dev`）
   - 暴露端口 3000（而不是 3333）
   - 后端自动提供前端静态文件

3. **docker-compose.yml**
   - 更新端口映射为 `3333:3000`（主机:容器）
   - 更新健康检查端点为 `/api/health`

4. **文档更新**
   - README.md 和 README_CN.md
   - 添加数据库模式说明
   - 添加部署架构说明

5. **新增 DEPLOYMENT.md**
   - 完整的部署指南
   - 故障排查说明
   - 安全注意事项

## 数据库模式说明

### 模式 1：PGlite（默认，单机模式）

```bash
docker run -d --name telegram-search \
  -p 3333:3000 \
  -v telegram-search-data:/app/data \
  ghcr.io/groupultra/telegram-search:latest
```

**特点：**
- ✅ 无需外部数据库
- ✅ 快速启动
- ✅ 数据持久化在 Docker 卷中
- ❌ **不支持多机器同步**

**适用场景：** 个人使用，单台机器

### 模式 2：PostgreSQL（多机器同步）

```bash
docker run -d --name telegram-search \
  -p 3333:3000 \
  -v telegram-search-data:/app/data \
  -e DATABASE_TYPE=postgres \
  -e DATABASE_URL=postgresql://user:pass@postgres-host:5432/telegram_search \
  ghcr.io/groupultra/telegram-search:latest
```

**特点：**
- ✅ 支持多机器/浏览器数据同步
- ✅ 数据存储在外部 PostgreSQL
- ✅ 适合生产环境
- ⚠️ 需要单独的 PostgreSQL 服务器（需安装 pgvector 扩展）

**适用场景：** 多台机器访问，团队使用

### 模式 3：Docker Compose（推荐，一键部署）

```bash
git clone https://github.com/Cosr-Backup/telegram-search.git
cd telegram-search
docker compose up -d
```

**特点：**
- ✅ 自动配置 PostgreSQL + pgvector
- ✅ 支持多机器同步
- ✅ 包含健康检查和依赖管理
- ✅ 最完整的部署方案

**适用场景：** 推荐的生产部署方式

## 迁移指南

### 如果您之前使用的是默认模式（IndexedDB）

您的数据现在存储在浏览器中，需要：

1. **导出现有数据**（如果有导出功能）
2. **启动新的 Docker 容器**（使用 PostgreSQL 模式）
3. **重新登录 Telegram**
4. **同步消息**

### 如果您想在多台机器间同步

**必须使用 PostgreSQL 模式**：

```bash
# 方式一：使用 Docker Compose（最简单）
docker compose up -d

# 方式二：连接到现有 PostgreSQL
docker run -d --name telegram-search \
  -p 3333:3000 \
  -e DATABASE_TYPE=postgres \
  -e DATABASE_URL=postgresql://user:pass@your-postgres-host:5432/telegram_search \
  ghcr.io/groupultra/telegram-search:latest
```

## 验证部署是否成功

### 1. 检查健康状态

```bash
curl http://localhost:3333/api/health
# 应该返回: {"success":true}
```

### 2. 检查 WebSocket 连接

打开浏览器控制台（F12），查看网络标签，应该能看到：
- WebSocket 连接到 `ws://localhost:3333/ws`
- 状态：已连接（绿色）

### 3. 检查数据库模式

查看 Docker 日志：
```bash
docker logs telegram-search
```

应该看到：
- `Using database type: postgres` 或 `Using database type: pglite`
- `Database initialized successfully`
- `Serving static files from: ...`

## 常见问题

### Q1: 为什么还是显示 IndexedDB？

**A:** 检查以下几点：
1. 确认设置了 `DATABASE_TYPE=postgres`
2. 确认 `DATABASE_URL` 配置正确
3. 检查 PostgreSQL 是否可访问
4. 重启 Docker 容器
5. 查看容器日志排查错误

### Q2: 多台机器如何共享数据？

**A:** 
1. 使用 **PostgreSQL 模式**（不是 PGlite）
2. 确保所有容器连接到**同一个** PostgreSQL 数据库
3. 使用相同的 `DATABASE_URL`

### Q3: Docker Compose 模式下如何配置？

**A:** 编辑 `docker-compose.yml`：
```yaml
environment:
  DATABASE_TYPE: postgres
  DATABASE_URL: 'postgresql://postgres:123456@pgvector:5432/postgres'
  TELEGRAM_API_ID: 'your-api-id'
  TELEGRAM_API_HASH: 'your-api-hash'
```

### Q4: 端口映射是什么意思？

**A:** 
- `-p 3333:3000` 表示：
  - `3333` = 主机端口（浏览器访问）
  - `3000` = 容器内部端口（服务器监听）
- 可以修改主机端口：`-p 8080:3000` → 访问 `http://localhost:8080`

## 技术细节

### 请求路由流程

```
浏览器请求 http://localhost:3333/
    ↓
主机端口 3333 → 容器端口 3000
    ↓
后端服务器 (h3)
    ↓
    ├─ /api/* → API 处理器
    ├─ /ws → WebSocket 处理器
    └─ /* → 静态文件处理器
         ├─ 文件存在？ → 返回文件
         └─ 文件不存在？ → 返回 index.html（SPA 路由）
```

### 数据流

```
前端 (浏览器)
  ↓ WebSocket (/ws)
后端服务器
  ↓
数据库 (PGlite 或 PostgreSQL)
  ↓
Telegram API
```

## 总结

这次修复解决了 Docker 部署的核心问题：

✅ **统一服务架构**：后端服务器同时处理 API 和前端
✅ **正确的端口配置**：使用 `3333:3000` 端口映射
✅ **清晰的数据库模式**：提供三种模式供选择
✅ **完整的文档**：包括故障排查和最佳实践

现在，您可以：
- 使用默认模式快速开始（PGlite，单机）
- 使用 PostgreSQL 模式实现多机器同步
- 使用 Docker Compose 获得完整的部署方案

如有其他问题，请查看 `DEPLOYMENT.md` 或提交 GitHub Issue。
