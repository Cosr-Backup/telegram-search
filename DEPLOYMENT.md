# Docker Deployment Guide

This document explains how the Docker deployment works and how to use it effectively.

## Architecture

The Docker deployment runs a unified server that handles both backend API and frontend static files on a single port (3000 internally, mapped to 3333 on host).

```
Docker Container (Internal Port 3000)
├── Backend Server (h3/listhen)
│   ├── /api/health - Health check endpoint
│   ├── /api/* - API endpoints
│   ├── /ws - WebSocket endpoint for real-time communication
│   └── /* - Static frontend files with SPA routing
└── Exposed as Host Port 3333
```

## Database Modes

### 1. PGlite Mode (Default)

**Use case**: Single machine, quick start, no external dependencies

```bash
docker run -d --name telegram-search \
  -p 3333:3000 \
  -v telegram-search-data:/app/data \
  ghcr.io/groupultra/telegram-search:latest
```

**Characteristics**:
- Uses embedded PGlite database (similar to SQLite)
- Data stored in Docker volume `/app/data`
- No external database required
- Data persists across container restarts
- **Not suitable for multi-machine synchronization**

### 2. PostgreSQL Mode (External Database)

**Use case**: Multiple machines/browsers, data synchronization, production deployment

```bash
docker run -d --name telegram-search \
  -p 3333:3000 \
  -v telegram-search-data:/app/data \
  -e DATABASE_TYPE=postgres \
  -e DATABASE_URL=postgresql://user:password@postgres-host:5432/telegram_search \
  ghcr.io/groupultra/telegram-search:latest
```

**Characteristics**:
- Uses external PostgreSQL database
- Data synchronized across all instances
- Requires PostgreSQL server (with pgvector extension)
- **Enables multi-machine/browser data sharing**

### 3. Docker Compose Mode (Recommended)

**Use case**: Complete setup with database, easiest way to get started with PostgreSQL

```bash
# Clone the repository
git clone https://github.com/Cosr-Backup/telegram-search.git
cd telegram-search

# Start all services
docker compose up -d

# Access at http://localhost:3333
```

**Characteristics**:
- Automatically sets up PostgreSQL with pgvector
- Includes health checks and dependencies
- Data persists in named Docker volumes
- Best for production-like environment

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Internal server port |
| `DATABASE_TYPE` | `pglite` | Database type: `pglite` or `postgres` |
| `DATABASE_URL` | `""` | PostgreSQL connection string (required when DATABASE_TYPE=postgres) |
| `TELEGRAM_API_ID` | `611335` | Telegram API ID from my.telegram.org |
| `TELEGRAM_API_HASH` | `d524b414...` | Telegram API Hash |
| `EMBEDDING_API_KEY` | `sk-proj-...` | OpenAI or compatible API key for embeddings |
| `EMBEDDING_BASE_URL` | `https://api.openai.com/v1` | Embedding API base URL |
| `EMBEDDING_PROVIDER` | `openai` | Provider: `openai` or `ollama` |
| `PROXY_URL` | `""` | Proxy configuration (socks5://..., http://..., etc.) |

## How It Works

### 1. Container Startup

The Docker container:
1. Installs dependencies (pnpm install)
2. Builds packages (`pnpm run packages:build`)
3. Builds frontend (`pnpm run web:build`) → `apps/web/dist`
4. Starts backend server (`pnpm run server:dev`)
5. Backend server serves both API and static files

### 2. Request Routing

When a request comes to the server:

```
Request to http://localhost:3333/
  ↓
Server on port 3000
  ↓
  ├─ /api/* → API handler
  ├─ /ws → WebSocket handler
  └─ /* → Static file handler
       ├─ File exists? → Serve file
       └─ File missing? → Serve index.html (SPA routing)
```

### 3. Data Flow

```
Frontend (Browser)
  ↓ WebSocket (/ws)
Backend Server
  ↓
Database (PGlite or PostgreSQL)
  ↓
Telegram API
```

## Troubleshooting

### Issue: Application uses IndexedDB instead of PostgreSQL

**Symptom**: Data is not synchronized across machines even with DATABASE_TYPE=postgres

**Solution**: 
1. Verify DATABASE_TYPE is set to `postgres`
2. Verify DATABASE_URL is correctly formatted and accessible
3. Check backend logs: `docker logs telegram-search`
4. Ensure PostgreSQL has pgvector extension installed

### Issue: WebSocket connection fails

**Symptom**: Authentication or message sync doesn't work

**Solution**:
1. Check if port 3333 is accessible
2. Verify health check: `curl http://localhost:3333/api/health`
3. Check WebSocket endpoint: Browser console should show WebSocket connection
4. Review server logs for errors

### Issue: Static files not served

**Symptom**: Blank page or 404 errors

**Solution**:
1. Verify web build completed: Check if `apps/web/dist` exists in container
2. Check server logs for "Serving static files from:" message
3. Rebuild Docker image: `docker build -t telegram-search .`

## Port Mapping Explanation

The `-p 3333:3000` flag means:
- **3333**: Port on your host machine (what you access in browser)
- **3000**: Port inside Docker container (where server runs)

You can change the host port:
- `-p 8080:3000` → Access at `http://localhost:8080`
- `-p 80:3000` → Access at `http://localhost` (requires root/admin)

## Data Persistence

### PGlite Mode
- Data location: Docker volume `telegram-search-data` → `/app/data` in container
- View data: `docker volume inspect telegram-search-data`
- Backup data: `docker run --rm -v telegram-search-data:/data -v $(pwd):/backup alpine tar czf /backup/backup.tar.gz /data`

### PostgreSQL Mode
- Data location: PostgreSQL database
- Backup: Use standard PostgreSQL backup tools (`pg_dump`)

## Security Considerations

1. **API Keys**: Never commit API keys to repository
2. **Database URL**: Use strong passwords for PostgreSQL
3. **Network**: Consider using Docker networks for isolation
4. **Volumes**: Restrict volume access permissions
5. **HTTPS**: Use reverse proxy (nginx/traefik) for HTTPS in production

## Advanced Usage

### Custom Port Configuration

```bash
docker run -d --name telegram-search \
  -p 8080:3000 \
  -e PORT=3000 \
  -v telegram-search-data:/app/data \
  ghcr.io/groupultra/telegram-search:latest
```

### With Reverse Proxy (Nginx)

```nginx
server {
    listen 80;
    server_name telegram-search.example.com;

    location / {
        proxy_pass http://localhost:3333;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Health Check

The application exposes a health check endpoint at `/api/health`:

```bash
curl http://localhost:3333/api/health
# Response: {"success":true}
```

## Migration from Old Setup

If you were running frontend and backend separately:

1. **Stop old containers**:
   ```bash
   docker stop telegram-search-frontend telegram-search-backend
   ```

2. **Backup data** (if using PostgreSQL):
   ```bash
   pg_dump telegram_search > backup.sql
   ```

3. **Start new unified container**:
   ```bash
   docker run -d --name telegram-search \
     -p 3333:3000 \
     -e DATABASE_TYPE=postgres \
     -e DATABASE_URL=postgresql://... \
     ghcr.io/groupultra/telegram-search:latest
   ```

## Development vs Production

### Development
- Uses `pnpm run server:dev` (vite-node with hot reload)
- TypeScript files run directly
- Includes dev tools and source maps

### Production (TODO)
Future improvements could include:
- Compiled JavaScript instead of TypeScript
- Production-optimized server binary
- Smaller Docker image
- Multi-stage build optimization

## Support

For issues or questions:
- GitHub Issues: https://github.com/Cosr-Backup/telegram-search/issues
- Documentation: See README.md and README_CN.md
