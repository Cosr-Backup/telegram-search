![preview](./assets/preview.png)

---

<p align="center">
  <a href="https://trendshift.io/repositories/13868" target="_blank"><img src="https://trendshift.io/api/badge/repositories/13868" alt="groupultra%2Ftelegram-search | Trendshift" style="width: 250px; height: 55px;" width="250" height="55"/></a>
</p>

<p align="center">
  [<a href="https://search.lingogram.app">Live Demo</a>] [<a href="../README.md">简体中文</a>] [<a href="./README_JA.md">日本語</a>]
</p>

<p align="center">
  <a href="https://discord.gg/NzYsmJSgCT">
    <img alt="Discord" src="https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fdiscord.com%2Fapi%2Finvites%2FNzYsmJSgCT%3Fwith_counts%3Dtrue&query=%24.approximate_member_count&suffix=%20members&logo=discord&logoColor=white&label=%20&color=7389D8&labelColor=6A7EC2" />
  </a>
  <a href="https://t.me/+Gs3SH2qAPeFhYmU9">
    <img alt="Telegram" src="https://img.shields.io/badge/Telegram-%235AA9E6?logo=telegram&labelColor=FFFFFF" />
  </a>
  <a href="https://deepwiki.com/groupultra/telegram-search">
    <img alt="DeepWiki" src="https://deepwiki.com/badge.svg" />
  </a>
  <br>
  <a href="https://github.com/groupultra/telegram-search/releases">
    <img alt="GitHub Package Version" src="https://img.shields.io/github/package-json/v/groupultra/telegram-search?style=flat&colorA=080f12&colorB=1fa669" />
  </a>
  <a href="https://github.com/groupultra/telegram-search/actions/workflows/release-docker.yaml">
    <img alt="Release Docker / OCI" src="https://github.com/groupultra/telegram-search/actions/workflows/release-docker.yaml/badge.svg" />
  </a>
  <a href="https://github.com/groupultra/telegram-search/actions/workflows/ci.yaml">
    <img alt="CI" src="https://github.com/groupultra/telegram-search/actions/workflows/ci.yaml/badge.svg" />
  </a>
</p>

> [!TIP]
> Struggling to search Chinese, Japanese, or Korean (CJK) messages in Telegram?
>
> Important messages often get lost in the noise — especially when word boundaries aren’t clear.
>
> Telegram Search solves this with advanced semantic search and word segmentation, fully supporting CJK and all languages. 
>
> Vector search enables fuzzy, sentence-level matching, making it easy to find the information you need—even in languages without spaces.

## 💖 Sponsors

![Sponsors](https://github.com/luoling8192/luoling8192/raw/master/sponsorkit/sponsors.svg)

## ✅ Features

### 📦 Export & Backup
- [x] Supports exporting chat history to multiple databases: PGlite and PostgreSQL
- [x] Media files can automatically export to MinIO object storage
- [x] Messages get vector embedding and word segmentation during export
- [x] Real-time sync – always fetches the latest chats automatically

### 🔍 Chat History Search
- [x] Intelligent word segmentation and precise search, supports multiple languages
- [x] Supports fuzzy search and vector semantic search for faster finding
- [x] RAG-powered Q&A: Converse with AI based on chat context, get instant answers

## 🛣️ Roadmap

### 🧠 AI-powered Features
- [ ] Automatic conversation summarization
- [ ] Super Brain: Automatically extract people and event knowledge graphs from chat history

### 🔗 Media & Link Features
- [ ] Smartly organize “Saved Messages” for easier management of important content
- [ ] Deep indexing of links and images: Web summary, image OCR and captioning, empowering search & organization

### 🌐 Multi-platform Expansion
- [ ] Add support for Telegram Bots for more management scenarios
- [ ] Expand to Discord and other social/IM platforms for unified cross-platform search and backup

## 🌐 Try It Now

We provide an online demo — no deployment required. Experience all Telegram Search features instantly.

Visit: https://search.lingogram.app

> [!WARNING]
> No cryptocurrency has been issued by us. Please do not fall for scams.
>
> This tool is only to export your own chat history for searching. Please do not use for illegal purposes.

## 🚀 Quick Start

By default, the browser-based PGlite database is used. To use PostgreSQL or MinIO, see the environment variables below or start all services with `docker compose up -d`.

```bash
docker run -d --name telegram-search \
  -p 3333:3333 \
  -v telegram-search-data:/app/data \
  ghcr.io/groupultra/telegram-search:latest
```

Then open **http://localhost:3333** to use 🎉

### Environment Variables

> [!IMPORTANT]
> AI Embedding & LLM settings are now configured per account in-app (Settings → API).

| Variable                      | Description                                                            | Example                                               |
| ----------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------- |
| `TELEGRAM_API_ID`             | Telegram app ID from [my.telegram.org](https://my.telegram.org/apps)   |                                                       |
| `TELEGRAM_API_HASH`           | Telegram app Hash from [my.telegram.org](https://my.telegram.org/apps) |                                                       |
| `DATABASE_TYPE`               | Database type: `postgres` or `pglite`                                  | `pglite`                                              |
| `DATABASE_URL`                | PostgreSQL connection string (for `DATABASE_TYPE=postgres` only)       | `postgresql://postgres:123456@pgvector:5432/postgres` |
| `PROXY_URL`                   | Proxy URL (formats like `socks5://user:pass@host:port` supported)      | `socks5://user:pass@host:port`                        |
| `PORT`                        | Backend HTTP/WebSocket listen port                                     | `3333`                                                |
| `HOST`                        | Backend listen address                                                 | `0.0.0.0`                                             |
| `BACKEND_URL`                 | Backend address for Nginx reverse proxy `/api` and `/ws` routes        | `http://127.0.0.1:3333`                               |
| `MINIO_ENDPOINT`              | MinIO service address (hostname or IP)                                 | `minio`                                               |
| `MINIO_PORT`                  | MinIO service port                                                     | `9000`                                                |
| `MINIO_USE_SSL`               | MinIO uses SSL (`true` or `false`)                                     | `false`                                               |
| `MINIO_ACCESS_KEY`            | MinIO access key                                                       | `minioadmin`                                          |
| `MINIO_SECRET_KEY`            | MinIO secret key                                                       | `minioadmin`                                          |
| `MINIO_BUCKET`                | MinIO bucket name                                                      | `telegram-media`                                      |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OpenTelemetry OTLP log exporter endpoint                               | `http://loki:3100/otlp/v1/logs`                       |

**Example using PostgreSQL:**

```bash
docker run -d --name telegram-search \
  -p 3333:3333 \
  -v telegram-search-data:/app/data \
  -e TELEGRAM_API_ID=611335 \
  -e TELEGRAM_API_HASH=d524b414d21f4d37f08684c1df41ac9c \
  -e DATABASE_TYPE=postgres \
  -e DATABASE_URL=postgresql://<postgres-host>:5432/postgres \
  ghcr.io/groupultra/telegram-search:latest
```

**Proxy formats:**
- SOCKS5: `socks5://user:pass@host:port`
- SOCKS4: `socks4://user:pass@host:port`
- HTTP:    `http://user:pass@host:port`
- MTProxy: `mtproxy://secret@host:port`

### Start Using Docker Compose

1. Clone the repository.

2. Start all services (including database, MinIO, etc.) with docker compose:

```bash
docker compose up -d
```

3. Open `http://localhost:3333` for the UI.

## 💻 Development Guide

### Browser Only Mode

```bash
git clone https://github.com/groupultra/telegram-search.git
cd telegram-search
pnpm install
cp .env.example .env
pnpm run dev
```

### Server Mode

```bash
git clone https://github.com/groupultra/telegram-search.git
cd telegram-search
pnpm install

cp .env.example .env

docker compose up -d pgvector minio

pnpm run server:dev
pnpm run web:dev
```

📖 **See more architecture and contribution details in:** [CONTRIBUTING.md](./CONTRIBUTING.md)

## 🚀 Activity

![Alt](https://repobeats.axiom.co/api/embed/69d5ef9f5e72cd7901b32ff71b5f359bc7ca42ea.svg "Repobeats analytics image")

[![Star History Chart](https://api.star-history.com/svg?repos=groupultra/telegram-search&type=Date)](https://star-history.com/#groupultra/telegram-search&Date)
