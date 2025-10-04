# Netlify Deployment Guide

This guide explains how to deploy Telegram Search to Netlify.

## Architecture

The Netlify deployment uses a **browser-only mode** where:
- The frontend runs entirely in the browser using Vue 3
- The database uses PGlite (a WASM-based PostgreSQL) running in the browser
- All data is stored locally in the browser's IndexedDB
- No backend server is required

This is different from the standard deployment which uses:
- A Node.js backend server
- WebSocket connections for real-time communication
- PostgreSQL database

## Deployment Steps

### 1. Prepare Your Repository

Make sure you're on the `netlify-deployment` branch:
```bash
git checkout netlify-deployment
```

### 2. Deploy to Netlify

#### Option A: Deploy via Netlify CLI

1. Install Netlify CLI:
```bash
npm install -g netlify-cli
```

2. Login to Netlify:
```bash
netlify login
```

3. Initialize and deploy:
```bash
netlify init
netlify deploy --prod
```

#### Option B: Deploy via Netlify UI

1. Go to [Netlify](https://app.netlify.com)
2. Click "Add new site" → "Import an existing project"
3. Connect your Git repository
4. Select the `netlify-deployment` branch (or `main` branch)
5. Configure build settings:
   - **Base directory**: `.` (root directory - IMPORTANT!)
   - **Build command**: Auto-detected from `netlify.toml`
   - **Publish directory**: `apps/web/dist`
   - **Functions directory**: `netlify/functions`
6. **IMPORTANT**: If asked for "Package directory", set it to `.` (root directory)
7. Click "Deploy site"

> **Note**: The Package directory must be set to `.` (root) because this is a monorepo and Netlify Functions need access to workspace dependencies. See [NETLIFY_PACKAGE_DIRECTORY.md](./NETLIFY_PACKAGE_DIRECTORY.md) for details.

### 3. Configure Environment Variables (Optional)

The application works with default Telegram API credentials, but you can set your own:

1. Go to [Telegram Apps](https://my.telegram.org/apps)
2. Create a new application to get your API ID and API Hash
3. In Netlify dashboard, go to "Site settings" → "Environment variables"
4. Add the following variables:
   - `VITE_TELEGRAM_APP_ID`: Your Telegram API ID
   - `VITE_TELEGRAM_APP_HASH`: Your Telegram API Hash

### 4. Verify Deployment

After deployment:
1. Visit your Netlify site URL
2. You should see the Telegram Search interface
3. Click "Login" to authenticate with Telegram
4. Your data will be stored locally in your browser

## Features

### What Works
- ✅ Frontend application (Vue 3)
- ✅ Telegram authentication
- ✅ Message synchronization
- ✅ Local database (PGlite in browser)
- ✅ Full-text search
- ✅ Vector search (if embedding API is configured)
- ✅ Message filtering and sorting

### What's Different
- ⚠️ No WebSocket real-time updates (uses polling instead)
- ⚠️ Data is stored locally in browser (not shared across devices)
- ⚠️ Each browser session has its own database
- ⚠️ Clearing browser data will delete all messages

## Configuration

### Browser-Only Mode

The application automatically runs in browser-only mode when deployed to Netlify. This is controlled by the `VITE_WITH_CORE` environment variable in `netlify.toml`.

### Database

PGlite is used as the database, which runs entirely in the browser using WebAssembly. All data is stored in IndexedDB.

### Telegram API

The application uses default Telegram API credentials that work for testing. For production use, you should:
1. Get your own API credentials from https://my.telegram.org/apps
2. Set them as environment variables in Netlify

## Troubleshooting

### Build Fails

If the build fails:
1. Check that Node.js version is 22.20.0 or higher
2. Check that pnpm version is 10.17.1 or higher
3. Review build logs in Netlify dashboard
4. Ensure all dependencies are properly installed

### Database Initialization Fails

If you see database errors:
1. Clear browser cache and IndexedDB
2. Refresh the page
3. Check browser console for detailed error messages

### Login Issues

If you can't login to Telegram:
1. Make sure you're using valid Telegram API credentials
2. Check that your phone number is correct
3. Verify you're receiving the authentication code
4. Try using a different browser

## Advanced Configuration

### Custom Embedding Provider

If you want to enable semantic search with embeddings:

1. Get an API key from OpenAI or another embedding provider
2. Add environment variables in Netlify:
   - `VITE_EMBEDDING_API_KEY`: Your API key
   - `VITE_EMBEDDING_BASE_URL`: API base URL (optional)
   - `VITE_EMBEDDING_PROVIDER`: Provider name (optional)
   - `VITE_EMBEDDING_MODEL`: Model name (optional)

### Proxy Configuration

If you need to use a proxy for Telegram connections:

1. Add environment variable in Netlify:
   - `VITE_PROXY_URL`: Your proxy URL (e.g., `socks5://user:pass@host:port`)

## Monitoring

### Function Logs

Netlify Functions are included but not actively used in browser-only mode. You can view function logs in the Netlify dashboard under "Functions" → "Function log".

### Browser Console

For debugging issues, check the browser console:
1. Open Developer Tools (F12)
2. Go to "Console" tab
3. Look for error messages or warnings

## Migration from Standard Deployment

If you're migrating from a standard deployment with a backend server:

1. **Data is not automatically migrated** - PGlite database is separate from PostgreSQL
2. You'll need to re-sync your messages after deployment
3. Login again with your Telegram account
4. The sync process will download messages to your local browser database

## Performance

Browser-only mode has some performance characteristics:

- **Initial Sync**: First-time message sync may take longer
- **Database Size**: Large message histories may slow down browser
- **Memory Usage**: Browser memory limits may affect large datasets
- **Search Speed**: PGlite is fast but may be slower than PostgreSQL for very large datasets

## Security

- All data is stored locally in your browser
- No data is sent to any server (except Telegram API for message sync)
- Authentication tokens are stored in browser local storage
- IndexedDB data is accessible only to your browser session

## Support

For issues or questions:
- GitHub Issues: https://github.com/Cosr-Backup/telegram-search/issues
- Discord: https://discord.gg/NzYsmJSgCT
- Telegram: https://t.me/+Gs3SH2qAPeFhYmU9
