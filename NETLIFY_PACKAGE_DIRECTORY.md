# Netlify Package Directory Configuration

## 问题 (Issue)

在 Netlify 部署时，您可能会遇到关于 "Package directory" 选项应该选择哪个目录的问题。

When deploying to Netlify, you may encounter questions about which directory to select for the "Package directory" option.

## 解决方案 (Solution)

**Package directory 应该设置为 `.` (根目录)**

**The Package directory should be set to `.` (root directory)**

### 为什么？(Why?)

1. **Monorepo 架构** - 这个项目是一个 monorepo，所有依赖都在根目录管理
   - **Monorepo Architecture** - This project is a monorepo with all dependencies managed at the root level

2. **Workspace 依赖** - Netlify Functions 需要访问 workspace 依赖（`@tg-search/common`, `@tg-search/core`）
   - **Workspace Dependencies** - Netlify Functions need access to workspace dependencies (`@tg-search/common`, `@tg-search/core`)

3. **pnpm Workspace** - 项目使用 pnpm workspace 协议，所有包都链接到根目录
   - **pnpm Workspace** - The project uses pnpm workspace protocol, all packages are linked to root

## Netlify 配置步骤 (Netlify Configuration Steps)

### 通过 Netlify UI 配置 (Configure via Netlify UI)

1. 登录 Netlify Dashboard → 选择你的站点
   - Login to Netlify Dashboard → Select your site

2. 进入 **Site settings** → **Build & deploy** → **Build settings**
   - Go to **Site settings** → **Build & deploy** → **Build settings**

3. 设置以下值 (Set the following values):
   ```
   Base directory: .
   Build command: (自动从 netlify.toml 读取 / auto-detected from netlify.toml)
   Publish directory: apps/web/dist
   Functions directory: netlify/functions
   ```

4. **重要**: 在 "Package directory" 字段中输入 `.`
   - **Important**: Enter `.` in the "Package directory" field

### 通过 netlify.toml 配置 (Configure via netlify.toml)

项目已经配置好了 `netlify.toml` 文件，它包含了所有必要的设置：

The project already has a configured `netlify.toml` file with all necessary settings:

```toml
[build]
  # Base directory for build - this is the root of the monorepo
  base = "."
  command = "VITE_WITH_CORE=true pnpm run packages:build && VITE_WITH_CORE=true pnpm run web:build"
  publish = "apps/web/dist"
  functions = "netlify/functions"
```

## 环境变量 (Environment Variables)

确保在 Netlify UI 中设置以下环境变量：

Make sure to set the following environment variables in Netlify UI:

### 必需 (Required)
- `NODE_VERSION`: `22.20.0`
- `PNPM_VERSION`: `10.17.1`
- `VITE_WITH_CORE`: `true`
- `VITE_TELEGRAM_APP_ID`: 你的 Telegram API ID / Your Telegram API ID
- `VITE_TELEGRAM_APP_HASH`: 你的 Telegram API Hash / Your Telegram API Hash

### 可选 (Optional - for PostgreSQL backend)
- `DATABASE_TYPE`: `postgres` (如果使用 PostgreSQL / if using PostgreSQL)
- `DATABASE_URL`: PostgreSQL 连接字符串 / PostgreSQL connection string

## 故障排查 (Troubleshooting)

### 错误: "Could not resolve @tg-search/common"

**原因**: Package directory 设置不正确或有独立的 functions package.json
- **Cause**: Package directory not set correctly or separate functions package.json exists

**解决方案**:
1. 确保 Package directory 设置为 `.` (根目录)
   - Ensure Package directory is set to `.` (root)
2. 确保 `netlify/functions/package.json` 不存在（已被删除）
   - Ensure `netlify/functions/package.json` does not exist (has been removed)
3. 重新部署
   - Redeploy

### 错误: "Dependencies installation error"

**原因**: Netlify 尝试从错误的目录安装依赖
- **Cause**: Netlify trying to install dependencies from wrong directory

**解决方案**:
1. 在 Netlify UI 中检查 "Base directory" 设置为 `.`
   - Check "Base directory" is set to `.` in Netlify UI
2. 确保 `netlify.toml` 中的 `base = "."` 配置存在
   - Ensure `base = "."` is present in `netlify.toml`

## 验证部署 (Verify Deployment)

部署成功后，可以通过以下方式验证：

After successful deployment, verify by:

1. 访问你的 Netlify 站点 URL
   - Visit your Netlify site URL

2. 检查浏览器控制台是否有错误
   - Check browser console for errors

3. 测试 API 端点: `https://your-site.netlify.app/api/health`
   - Test API endpoint: `https://your-site.netlify.app/api/health`

4. 查看 Netlify Functions 日志
   - Check Netlify Functions logs

## 更多信息 (More Information)

- [NETLIFY_DEPLOYMENT.md](./NETLIFY_DEPLOYMENT.md) - 完整部署指南 / Complete deployment guide
- [NETLIFY_DEPLOYMENT_CN.md](./NETLIFY_DEPLOYMENT_CN.md) - 中文部署指南 / Chinese deployment guide
- [TESTING_GUIDE.md](./TESTING_GUIDE.md) - 测试指南 / Testing guide
