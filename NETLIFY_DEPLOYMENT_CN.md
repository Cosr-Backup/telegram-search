# Netlify 部署完整指南

本指南提供将 Telegram Search 部署到 Netlify 的完整说明（中文版）。

## 架构说明

Netlify 部署使用**纯浏览器模式**：
- 前端完全在浏览器中运行（Vue 3）
- 数据库使用 PGlite（基于 WASM 的 PostgreSQL）运行在浏览器中
- 所有数据存储在浏览器的 IndexedDB 中
- 不需要后端服务器

## 快速部署步骤

### 1. 准备工作

确认你在正确的分支上：
```bash
git checkout netlify-deployment
```

### 2. 部署到 Netlify

#### 方式 A：通过 Netlify CLI 部署

1. 安装 Netlify CLI：
```bash
npm install -g netlify-cli
```

2. 登录 Netlify：
```bash
netlify login
```

3. 初始化并部署：
```bash
netlify init
netlify deploy --prod
```

#### 方式 B：通过 Netlify UI 部署

1. 访问 [Netlify](https://app.netlify.com)
2. 点击 "Add new site" → "Import an existing project"
3. 连接你的 Git 仓库
4. 选择 `netlify-deployment` 分支（或 `main` 分支）
5. 配置构建设置：
   - **Base directory（基础目录）**: `.` (根目录 - 重要!)
   - **Build command（构建命令）**: 从 `netlify.toml` 自动检测
   - **Publish directory（发布目录）**: `apps/web/dist`
   - **Functions directory（函数目录）**: `netlify/functions`
6. **重要**: 如果询问 "Package directory（包目录）"，设置为 `.` (根目录)
7. 点击 "Deploy site"

> **注意**: Package directory 必须设置为 `.`（根目录），因为这是一个 monorepo，Netlify Functions 需要访问 workspace 依赖。详见 [NETLIFY_PACKAGE_DIRECTORY.md](./NETLIFY_PACKAGE_DIRECTORY.md)。

### 3. 配置环境变量（可选）

应用使用默认的 Telegram API 凭证，但你可以设置自己的：

1. 访问 [Telegram Apps](https://my.telegram.org/apps)
2. 创建新应用获取 API ID 和 API Hash
3. 在 Netlify 控制台中，进入 "Site settings" → "Environment variables"
4. 添加以下变量：
   - `VITE_TELEGRAM_APP_ID`: 你的 Telegram API ID
   - `VITE_TELEGRAM_APP_HASH`: 你的 Telegram API Hash

### 4. 验证部署

部署完成后：
1. 访问你的 Netlify 站点 URL
2. 应该看到 Telegram Search 界面
3. 点击"登录"进行 Telegram 认证
4. 数据将存储在浏览器本地

## 部署验证

运行验证脚本检查部署是否正确：
```bash
node scripts/verify-netlify-deployment.mjs
```

该脚本会检查：
- ✅ 前端构建输出正确
- ✅ Netlify 配置正确
- ✅ Functions 配置正确
- ✅ 环境变量设置正确
- ✅ PGlite 文件包含在构建中

## 测试部署

详细的测试步骤请参考 [TESTING_GUIDE.md](./TESTING_GUIDE.md)

### 基础测试清单

1. **站点加载**
   - ✅ 访问 Netlify URL
   - ✅ 页面正常加载
   - ✅ 无 JavaScript 错误

2. **数据库初始化**
   - ✅ 打开浏览器控制台
   - ✅ 查看初始化日志
   - ✅ 确认数据库连接成功

3. **登录测试**
   - ✅ 输入手机号
   - ✅ 接收验证码
   - ✅ 成功登录

4. **消息同步**
   - ✅ 开始同步消息
   - ✅ 查看同步进度
   - ✅ 确认消息写入数据库

5. **Functions 日志**
   - ✅ 在 Netlify 控制台查看 Functions 日志
   - ✅ 确认健康检查端点响应正常
   - ✅ 验证日志输出正确

## 功能说明

### 支持的功能
- ✅ 前端应用（Vue 3）
- ✅ Telegram 认证
- ✅ 消息同步
- ✅ 本地数据库（浏览器中的 PGlite）
- ✅ 全文搜索
- ✅ 向量搜索（如果配置了 embedding API）
- ✅ 消息过滤和排序

### 与标准部署的区别
- ⚠️ 无 WebSocket 实时更新（使用轮询代替）
- ⚠️ 数据存储在浏览器本地（不跨设备共享）
- ⚠️ 每个浏览器会话有自己的数据库
- ⚠️ 清除浏览器数据会删除所有消息

## 配置说明

### 浏览器模式

部署到 Netlify 时，应用自动运行在浏览器模式。这由 `netlify.toml` 中的 `VITE_WITH_CORE` 环境变量控制。

### 数据库

使用 PGlite 作为数据库，完全在浏览器中运行。所有数据存储在 IndexedDB 中。

### Telegram API

应用使用默认的 Telegram API 凭证用于测试。生产环境建议：
1. 从 https://my.telegram.org/apps 获取自己的凭证
2. 在 Netlify 中设置环境变量

## 常见问题

### 1. 构建失败

如果构建失败：
1. 检查 Netlify 控制台中的构建日志
2. 确认 Node.js 版本为 22.20.0 或更高
3. 检查所有依赖是否正确安装
4. 验证构建命令正确

### 2. 数据库初始化失败

如果看到数据库错误：
1. 清除浏览器缓存和 IndexedDB
2. 刷新页面
3. 检查浏览器控制台的详细错误信息

### 3. 登录问题

如果无法登录：
1. 确认使用有效的 Telegram API 凭证
2. 检查手机号格式正确（+国家码 号码）
3. 验证是否收到 Telegram 验证码
4. 尝试使用不同的浏览器

### 4. 消息不同步

如果消息不同步：
1. 检查浏览器控制台的错误信息
2. 验证认证成功
3. 检查网络标签查看失败的请求
4. 尝试注销并重新登录

### 5. Functions 日志查看

在 Netlify 控制台中查看 Functions 日志：
1. 进入 Netlify 控制台
2. 选择你的站点
3. 导航到 "Functions" 标签
4. 查看实时日志

## 性能指标

预期性能：

| 指标 | 目标 | 可接受 |
|------|------|--------|
| 首次页面加载 | < 2秒 | < 3秒 |
| 可交互时间 | < 3秒 | < 5秒 |
| 搜索响应时间 | < 1秒 | < 2秒 |
| 消息同步(100条) | < 5秒 | < 10秒 |

## 监控和日志

### 查看 Functions 日志

1. Netlify 控制台 → Functions → 选择函数
2. 查看实时日志
3. 预期看到：
   ```
   [netlify:server] Request received - path: /api/health
   [netlify:server] Database initialized successfully
   ```

### 浏览器控制台日志

1. 打开开发者工具（F12）
2. 进入 Console 标签
3. 查找应用日志：
   - `[CoreBridge]` - 核心桥接日志
   - `[MessageHandler]` - 消息处理日志
   - `[StorageHandler]` - 存储日志
   - `[AuthHandler]` - 认证日志

## 成功标准

部署成功的标志：

- ✅ 站点可通过 Netlify URL 访问
- ✅ 前端加载无错误
- ✅ 数据库初始化成功
- ✅ 用户可以使用 Telegram 登录
- ✅ 消息正确同步
- ✅ 消息写入本地数据库
- ✅ 搜索功能正常工作
- ✅ Functions 日志显示成功请求
- ✅ 浏览器控制台无严重错误
- ✅ 所有测试在多个浏览器上通过

## 技术支持

- **项目问题**: https://github.com/Cosr-Backup/telegram-search/issues
- **Discord**: https://discord.gg/NzYsmJSgCT
- **Telegram**: https://t.me/+Gs3SH2qAPeFhYmU9

## 进阶配置

### 自定义域名

1. 在 Netlify 控制台配置自定义域名
2. 更新 DNS 设置
3. 验证 SSL 证书

### 向量搜索

启用语义搜索：

1. 获取 OpenAI 或其他 embedding 提供商的 API 密钥
2. 在 Netlify 中添加环境变量：
   - `VITE_EMBEDDING_API_KEY`: API 密钥
   - `VITE_EMBEDDING_BASE_URL`: API URL（可选）
   - `VITE_EMBEDDING_PROVIDER`: 提供商名称（可选）
   - `VITE_EMBEDDING_MODEL`: 模型名称（可选）

### 代理配置

如果需要使用代理连接 Telegram：

1. 在 Netlify 中添加环境变量：
   - `VITE_PROXY_URL`: 代理 URL（如：`socks5://user:pass@host:port`）

## 文件说明

### 关键文件

- `netlify.toml` - Netlify 配置文件
- `netlify/functions/server.ts` - API 函数
- `netlify/functions/ws.ts` - WebSocket 存根函数
- `.env.netlify` - Netlify 环境变量示例
- `NETLIFY_DEPLOYMENT.md` - 部署文档（英文）
- `TESTING_GUIDE.md` - 测试指南（英文）
- `scripts/verify-netlify-deployment.mjs` - 部署验证脚本

## 注意事项

1. **数据隔离**: 每个浏览器的数据是独立的，不会在设备间同步
2. **存储限制**: 浏览器 IndexedDB 有存储限制，大量消息可能受影响
3. **清除数据**: 清除浏览器数据会删除所有消息，需重新同步
4. **性能**: 大数据集可能影响浏览器性能

## 下一步

部署成功后：

1. 测试所有功能
2. 配置自定义域名（可选）
3. 启用监控和分析
4. 与用户分享应用链接
5. 收集反馈并改进
