# Telegram Search - Netlify Deployment Branch

This branch contains all necessary configurations and documentation for deploying Telegram Search to Netlify.

## 🎯 What's New in This Branch

This branch adapts the project for Netlify deployment with the following changes:

### 1. Browser-Only Mode
- Frontend runs entirely in the browser using Vue 3
- Database uses PGlite (WASM-based PostgreSQL) instead of PostgreSQL
- All data stored locally in browser IndexedDB
- No backend server required

### 2. Netlify Configuration
- `netlify.toml` - Complete Netlify configuration
- Serverless Functions for API endpoints
- Build optimization for static deployment
- Environment variable configuration

### 3. Documentation
- 📖 `NETLIFY_DEPLOYMENT.md` - English deployment guide
- 📖 `NETLIFY_DEPLOYMENT_CN.md` - 中文部署指南
- 📖 `TESTING_GUIDE.md` - Comprehensive testing procedures
- 🔧 `scripts/verify-netlify-deployment.mjs` - Deployment verification script

## 🚀 Quick Start

### Prerequisites
- Node.js 22.20.0 or higher
- pnpm 10.17.1 or higher
- Netlify account

### Deploy Now

**Option 1: Using Netlify CLI**
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy
netlify init
netlify deploy --prod
```

**Option 2: Using Netlify Dashboard**
1. Go to https://app.netlify.com
2. Click "Add new site" → "Import an existing project"
3. Connect your GitHub repository
4. Select this branch (`netlify-deployment`)
5. Click "Deploy site"

### Verify Deployment

Run the verification script:
```bash
node scripts/verify-netlify-deployment.mjs
```

## 📁 File Structure

```
.
├── netlify.toml                      # Netlify configuration
├── netlify/
│   └── functions/                    # Serverless functions
│       ├── server.ts                 # API function
│       ├── ws.ts                     # WebSocket stub
│       ├── package.json              # Functions dependencies
│       └── tsconfig.json             # TypeScript config
├── .env.netlify                      # Environment variables example
├── NETLIFY_DEPLOYMENT.md             # Deployment guide (English)
├── NETLIFY_DEPLOYMENT_CN.md          # 部署指南（中文）
├── TESTING_GUIDE.md                  # Testing procedures
└── scripts/
    └── verify-netlify-deployment.mjs # Verification script
```

## ✨ Key Features

### What Works
- ✅ Full frontend functionality (Vue 3)
- ✅ Telegram authentication
- ✅ Message synchronization
- ✅ Local database (PGlite in browser)
- ✅ Full-text search
- ✅ Vector search (with embedding API)
- ✅ Message filtering and sorting
- ✅ Serverless Functions for health checks

### Differences from Standard Deployment
- ⚠️ No WebSocket real-time updates (uses polling)
- ⚠️ Data stored locally per browser (not shared across devices)
- ⚠️ Each browser session has independent database
- ⚠️ Clearing browser data removes all messages

## 🧪 Testing

### Pre-Deployment
```bash
# Run verification
node scripts/verify-netlify-deployment.mjs

# Build locally
VITE_WITH_CORE=true pnpm run packages:build
VITE_WITH_CORE=true pnpm run web:build

# Preview
pnpm run web:preview
```

### Post-Deployment
Follow the comprehensive testing guide in `TESTING_GUIDE.md`:
1. Basic functionality tests
2. Database initialization tests
3. Authentication tests
4. Message sync tests
5. Search functionality tests
6. Functions tests
7. Performance tests

## 📊 Build Information

### Build Command
```bash
VITE_WITH_CORE=true pnpm run packages:build && VITE_WITH_CORE=true pnpm run web:build
```

### Build Output
- Location: `apps/web/dist/`
- Size: ~18MB (includes PGlite WASM files)
- Contents: Static HTML, CSS, JS, and WASM files

### Environment Variables
```
NODE_VERSION=22.20.0
PNPM_VERSION=10.17.1
VITE_WITH_CORE=true
VITE_TELEGRAM_APP_ID=611335
VITE_TELEGRAM_APP_HASH=d524b414d21f4d37f08684c1df41ac9c
```

## 🔍 Verification Checklist

Before deploying, ensure:
- ✅ All packages build successfully
- ✅ Frontend builds with `VITE_WITH_CORE=true`
- ✅ Verification script passes all checks
- ✅ No TypeScript errors
- ✅ PGlite files included in build output

After deploying, verify:
- ✅ Site loads without errors
- ✅ Database initializes successfully
- ✅ Login works with Telegram
- ✅ Messages sync and store locally
- ✅ Search functionality works
- ✅ Functions return correct responses
- ✅ Logs show in Netlify dashboard

## 📝 Functions

### Health Check Function
```bash
curl https://your-site.netlify.app/api/health
```

Expected response:
```json
{
  "success": true,
  "message": "Server is running",
  "dbInitialized": true,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### WebSocket Stub
```bash
curl https://your-site.netlify.app/ws
```

Returns message indicating browser-only mode is active.

## 🐛 Troubleshooting

### Build Fails
- Check Node.js version (22.20.0+)
- Verify all dependencies installed
- Check build logs in Netlify dashboard

### Database Issues
- Clear browser cache and IndexedDB
- Check browser console for errors
- Verify PGlite files in build

### Login Issues
- Verify Telegram API credentials
- Check phone number format (+country_code number)
- Ensure receiving Telegram messages

### Messages Not Syncing
- Check browser console for errors
- Verify authentication succeeded
- Check network tab for failed requests

## 📚 Documentation

- `NETLIFY_DEPLOYMENT.md` - Full deployment guide with step-by-step instructions
- `NETLIFY_DEPLOYMENT_CN.md` - 完整的中文部署指南
- `TESTING_GUIDE.md` - Comprehensive testing procedures and troubleshooting
- `scripts/verify-netlify-deployment.mjs` - Automated verification script

## 🔗 Resources

- **Netlify Documentation**: https://docs.netlify.com/
- **Project Repository**: https://github.com/Cosr-Backup/telegram-search
- **Discord**: https://discord.gg/NzYsmJSgCT
- **Telegram**: https://t.me/+Gs3SH2qAPeFhYmU9

## 🎓 Learn More

### About PGlite
PGlite is a WASM PostgreSQL build that runs in the browser:
- Full PostgreSQL compatibility
- Runs entirely in browser
- Data stored in IndexedDB
- No server required

### About Browser-Only Mode
In browser-only mode:
- All code runs in the browser
- Database is PGlite (WASM PostgreSQL)
- No backend server needed
- Perfect for static hosting (Netlify, Vercel, etc.)

## ⚙️ Configuration

### Optional: Custom Telegram API Credentials
1. Get credentials from https://my.telegram.org/apps
2. Set in Netlify: `VITE_TELEGRAM_APP_ID`, `VITE_TELEGRAM_APP_HASH`

### Optional: Embedding API for Semantic Search
Set in Netlify:
- `VITE_EMBEDDING_API_KEY`
- `VITE_EMBEDDING_BASE_URL`
- `VITE_EMBEDDING_PROVIDER`
- `VITE_EMBEDDING_MODEL`

### Optional: Proxy Configuration
Set in Netlify:
- `VITE_PROXY_URL` (e.g., `socks5://user:pass@host:port`)

## 🎉 Success Criteria

Deployment is successful when:
- ✅ Site accessible via Netlify URL
- ✅ Frontend loads without errors
- ✅ Database initializes in browser
- ✅ Telegram login works
- ✅ Messages sync correctly
- ✅ Data persists in browser
- ✅ Search functions properly
- ✅ Functions respond correctly
- ✅ Logs visible in Netlify dashboard
- ✅ All tests pass

## 🚀 Next Steps

After successful deployment:
1. ✅ Test all functionality thoroughly
2. ✅ Configure custom domain (optional)
3. ✅ Enable Netlify Analytics (optional)
4. ✅ Share deployment URL with users
5. ✅ Monitor performance and errors
6. ✅ Gather user feedback

## 📞 Support

For issues or questions:
- Open an issue: https://github.com/Cosr-Backup/telegram-search/issues
- Join Discord: https://discord.gg/NzYsmJSgCT
- Telegram group: https://t.me/+Gs3SH2qAPeFhYmU9

---

**Note**: This branch is specifically configured for Netlify deployment. For other deployment methods, see the main branch documentation.
