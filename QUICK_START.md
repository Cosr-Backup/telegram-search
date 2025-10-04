# 🚀 快速部署指南 (Quick Deployment Guide)

## 一键部署到 Netlify (One-Click Deploy to Netlify)

### 方法 1: 使用 Deploy Button
点击下面的按钮一键部署：

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/Cosr-Backup/telegram-search&branch=netlify-deployment)

### 方法 2: 使用 Netlify CLI

```bash
# 1. 安装 Netlify CLI
npm install -g netlify-cli

# 2. 登录
netlify login

# 3. 初始化项目
netlify init

# 4. 部署
netlify deploy --prod
```

### 方法 3: 通过 Dashboard

1. 访问 https://app.netlify.com
2. 点击 "Add new site" → "Import an existing project"
3. 连接 GitHub 仓库
4. 选择 `copilot/fix-6687c94c-6860-4695-beb0-05ed6c312fdb` 或 `netlify-deployment` 分支
5. 点击 "Deploy site"

## 📋 部署检查清单 (Deployment Checklist)

在部署前：
- [ ] 运行验证脚本: `node scripts/verify-netlify-deployment.mjs`
- [ ] 确认构建成功: `VITE_WITH_CORE=true pnpm run web:build`
- [ ] 检查文档: 阅读 NETLIFY_DEPLOYMENT_CN.md

部署后：
- [ ] 访问站点 URL
- [ ] 检查浏览器控制台
- [ ] 测试登录功能
- [ ] 测试消息同步
- [ ] 查看 Functions 日志

## 🔍 快速验证 (Quick Verification)

### 1. 验证构建
```bash
node scripts/verify-netlify-deployment.mjs
```

期望输出：
```
✓ All checks passed! Ready for Netlify deployment.
```

### 2. 测试 Health Check
```bash
curl https://your-site.netlify.app/api/health
```

期望响应：
```json
{
  "success": true,
  "message": "Server is running",
  "dbInitialized": true
}
```

### 3. 检查浏览器日志
打开浏览器控制台，期望看到：
```
[CoreBridge] Database initialized successfully
```

## 📖 完整文档 (Full Documentation)

- **英文指南**: [NETLIFY_DEPLOYMENT.md](./NETLIFY_DEPLOYMENT.md)
- **中文指南**: [NETLIFY_DEPLOYMENT_CN.md](./NETLIFY_DEPLOYMENT_CN.md)
- **测试指南**: [TESTING_GUIDE.md](./TESTING_GUIDE.md)
- **分支说明**: [README_NETLIFY_BRANCH.md](./README_NETLIFY_BRANCH.md)
- **最终报告**: [FINAL_REPORT.md](./FINAL_REPORT.md)

## ⚙️ 环境变量 (Environment Variables)

### 必需 (Required) - 已在 netlify.toml 配置
```
VITE_WITH_CORE=true
NODE_VERSION=22.20.0
PNPM_VERSION=10.17.1
```

### 可选 (Optional) - 可在 Netlify Dashboard 配置
```
VITE_TELEGRAM_APP_ID=your_app_id
VITE_TELEGRAM_APP_HASH=your_app_hash
```

## 🆘 常见问题 (Common Issues)

### 构建失败
```bash
# 检查 Node.js 版本
node --version  # 应该 >= 22.20.0

# 清理并重新构建
pnpm clean
pnpm install
VITE_WITH_CORE=true pnpm run packages:build
VITE_WITH_CORE=true pnpm run web:build
```

### 数据库初始化失败
- 清除浏览器缓存
- 清除 IndexedDB
- 在隐私/无痕模式下测试

### 登录失败
- 确认 Telegram API 凭证正确
- 检查手机号格式 (+国家码 号码)
- 确认接收到 Telegram 验证码

## 📞 技术支持 (Support)

- **GitHub Issues**: https://github.com/Cosr-Backup/telegram-search/issues
- **Discord**: https://discord.gg/NzYsmJSgCT
- **Telegram**: https://t.me/+Gs3SH2qAPeFhYmU9

## 📊 项目状态 (Project Status)

✅ **已完成** (Completed):
- 前端构建 (17.77 MB)
- Functions 配置
- 数据库初始化
- 文档完整
- 验证通过

🚀 **准备就绪** (Ready for Deployment)

---

**开始部署吧！** 🎉
