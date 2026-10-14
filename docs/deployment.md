# Deployment

How to run Zee-Index in production: the Docker Compose stack, HTTPS, backups, updates, monitoring, and running without Docker.

- [The Compose stack](#the-compose-stack)
- [Deploy on a VPS](#deploy-on-a-vps)
- [HTTPS with your own domain](#https-with-your-own-domain)
- [HTTPS with DuckDNS (free subdomain)](#https-with-duckdns-free-subdomain)
- [Behind another reverse proxy or Cloudflare](#behind-another-reverse-proxy-or-cloudflare)
- [Scheduled jobs](#scheduled-jobs)
- [Backups and restore](#backups-and-restore)
- [Updating](#updating)
- [Monitoring and logs](#monitoring-and-logs)
- [Resource usage](#resource-usage)
- [Running without Docker](#running-without-docker)
- [Development stack](#development-stack)

---

## The Compose stack

`docker-compose.yml` defines everything needed in production:

| Service        | Image                   | Role                                                                     | Ports / volumes                                                  |
| -------------- | ----------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| `zee-index`    | built from `Dockerfile` | The app (Next.js standalone, Node 22, runs as uid 1001)                  | `127.0.0.1:3000`; `./.env`, `./storage`                          |
| `postgres`     | `postgres:16-alpine`    | Main database                                                            | `127.0.0.1:5432`; volume `postgres_data`                         |
| `redis`        | `redis:7-alpine`        | Cache, rate limits, durable admin state. AOF on, `128mb`, `volatile-lru` | internal; volume `redis_data`                                    |
| `caddy`        | `caddy:alpine`          | Reverse proxy, automatic HTTPS, 30 MB body limit                         | `80`, `443`; `./Caddyfile`, volumes `caddy_data`, `caddy_config` |
| `cron-monitor` | `curlimages/curl`       | Runs the incident, storage and cleanup cron jobs                         | internal                                                         |
| `db-backup`    | `postgres:16-alpine`    | `pg_dump` on an interval into `./backups`                                | `./backups`                                                      |
| `duckdns`      | `linuxserver/duckdns`   | Keeps a DuckDNS name pointed at your IP (idle when not configured)       | internal                                                         |

**What happens when `zee-index` starts** (`scripts/docker-entrypoint.sh`):

1. Waits for PostgreSQL, and creates the database if it does not exist.
2. Runs `prisma migrate deploy`. If the image has no `prisma/migrations` folder, it refuses to start rather than risk data loss.
3. Starts `node server.js` under `dumb-init`.

The container health check calls `GET /api/health` every 30 seconds, after a 180-second start period. `caddy` and `cron-monitor` wait until the app is healthy.

## Deploy on a VPS

Tested on Ubuntu 22.04/24.04 with 1 vCPU and 1 GB RAM.

```bash
# 1. Install Docker
curl -fsSL https://get.docker.com | sh

# 2. A non-root user that can use Docker
sudo adduser zee
sudo usermod -aG docker zee
su - zee

# 3. Get the code and configure it
git clone https://github.com/ifauzeee/Zee-Index.git
cd Zee-Index
cp .env.example .env
chmod 600 .env
nano .env               # see getting-started.md and configuration.md

# 4. Local storage (only if NEXT_PUBLIC_ENABLE_LOCAL_STORAGE=true)
mkdir -p storage backups
sudo chown -R 1001:1001 storage

# 5. Start
docker compose up -d --build
docker compose ps       # wait for zee-index to report "healthy"
```

Open ports **80** and **443** in the firewall (for example `sudo ufw allow 80,443/tcp`). Do not expose 3000 or 5432: they are bound to `127.0.0.1` on purpose.

Then finish [first-run setup](getting-started.md#6-first-run-setup).

## HTTPS with your own domain

1. Point an `A` (and optionally `AAAA`) record for your domain to the server.
2. In `.env`:
   ```env
   CADDY_SITE="files.example.com"
   NEXTAUTH_URL="https://files.example.com"
   ```
3. Add `https://files.example.com` as an authorized origin, and `https://files.example.com/setup`, `https://files.example.com/en/setup` and `https://files.example.com/api/auth/callback/google` as redirect URIs, in the Google OAuth client ([Google Cloud Setup](google-cloud-setup.md#4-create-the-oauth-client)).
4. Restart: `docker compose up -d`.

Caddy requests a Let's Encrypt certificate on the first request and renews it automatically. Certificates are kept in the `caddy_data` volume.

## HTTPS with DuckDNS (free subdomain)

1. Sign in at [duckdns.org](https://www.duckdns.org), create a subdomain, and copy your token.
2. In `.env`:
   ```env
   DUCKDNS_DOMAIN="myfiles"                 # without .duckdns.org
   DUCKDNS_TOKEN="your-duckdns-token"
   CADDY_SITE="myfiles.duckdns.org"
   NEXTAUTH_URL="https://myfiles.duckdns.org"
   ```
3. Update the Google OAuth client as above, then `docker compose up -d`.

The `duckdns` service keeps the subdomain pointed at your current IP.

## Behind another reverse proxy or Cloudflare

If you already run nginx, Traefik or similar, you can skip Caddy (`docker compose up -d zee-index postgres redis cron-monitor db-backup`) and proxy to `127.0.0.1:3000`.

- Allow request bodies of **at least 30 MB** (uploads are sent in 2 MB chunks; the app accepts up to 25 MB per request).
- Pass `Host`, `X-Forwarded-For` and `X-Forwarded-Proto`. Disable response buffering for `/api/events` (server-sent events) and `/api/download` (streaming).
- Set `NEXTAUTH_URL` to the public `https://` URL.

Example nginx server block:

```nginx
server {
    listen 443 ssl http2;
    server_name files.example.com;
    # ssl_certificate ...; ssl_certificate_key ...;

    client_max_body_size 30m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
        proxy_read_timeout 300s;
    }
}
```

**Cloudflare proxy (orange cloud):** works. Use SSL mode _Full (strict)_. Video streaming through Cloudflare's free plan may be against their terms for large volumes; use a DNS-only record if you stream a lot.

## Scheduled jobs

Cron endpoints require `Authorization: Bearer $CRON_SECRET`.

| Endpoint                     | What it does                                                              | Run by default?                    |
| ---------------------------- | ------------------------------------------------------------------------- | ---------------------------------- |
| `/api/cron/incident-monitor` | Evaluates alert rules (failed sign-ins, download spikes) and sends alerts | Yes, by `cron-monitor` every 5 min |
| `/api/cron/storage-check`    | Compares usage with `STORAGE_LIMIT_GB` and emails a warning once          | Yes, by `cron-monitor`             |
| `/api/cron/activity-cleanup` | Deletes old activity log entries                                          | Yes, by `cron-monitor`             |
| `/api/cron/weekly-report`    | Emails a weekly activity summary to admins                                | No: schedule it yourself           |
| `/api/cron/content-index`    | Extracts text from documents into the full-text search index              | No: schedule it yourself           |

Example host crontab for the two optional jobs:

```cron
0 8 * * 1   curl -fsS -H "Authorization: Bearer YOUR_CRON_SECRET" http://127.0.0.1:3000/api/cron/weekly-report >/dev/null
30 3 * * *  curl -fsS -H "Authorization: Bearer YOUR_CRON_SECRET" http://127.0.0.1:3000/api/cron/content-index  >/dev/null
```

`cron-monitor` runs every `CRON_MONITOR_INTERVAL_SECONDS` (default 300).

## Backups and restore

**PostgreSQL** is dumped automatically by `db-backup`, every `BACKUP_INTERVAL_SECONDS` (default daily), into `./backups/<db>-<timestamp>.sql.gz`. Dumps older than `BACKUP_RETENTION_DAYS` (default 7) are removed. Copy `./backups` off the server regularly.

Restore a dump into a running stack:

```bash
docker compose stop zee-index
gunzip -c backups/zee_index-20261014-030000.sql.gz \
  | docker compose exec -T postgres psql -U postgres -d zee_index
docker compose start zee-index
```

For a clean restore, drop and recreate the database first (`dropdb`/`createdb` inside the `postgres` container).

**Redis** holds durable admin state (role sets, manual drives, file requests, access requests, revoked share links) in its append-only file. Back up the `redis_data` volume too:

```bash
docker compose exec redis redis-cli BGSAVE
docker run --rm -v zee-index_redis_data:/data -v "$PWD/backups:/backup" alpine \
  tar czf /backup/redis-$(date +%F).tar.gz -C /data .
```

The volume name is `<project>_redis_data`. Check yours with `docker volume ls`.

**Also back up** `.env` (secrets, Google refresh token) and `./storage` if you use local storage.

## Updating

```bash
cd Zee-Index
git pull
docker compose up -d --build
docker compose logs -f zee-index    # migrations run automatically on start
```

- Read [CHANGELOG.md](../CHANGELOG.md) before updating. It lists required `.env` changes and behaviour changes.
- Migrations are applied by `prisma migrate deploy` on start. Take a backup first.
- If `Caddyfile` or the Redis command in `docker-compose.yml` changed, recreate those containers too: `docker compose up -d --force-recreate caddy redis`.
- Rolling back after a migration requires restoring the backup taken before the update.

## Monitoring and logs

| What             | How                                                                                                                       |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Health           | `GET /api/health` → `{"status":"ok","services":{"database","cache","google_drive"}}`. The Drive check is cached for 60 s. |
| Container status | `docker compose ps`                                                                                                       |
| Application logs | `docker compose logs -f zee-index`. JSON lines (Pino) in production. Set `LOG_LEVEL=debug` for more detail.               |
| In the app       | **Admin → Summary** (system health, stats), **Admin → Analytics**, `/admin/logs`, `/admin/audit`, `/admin/incidents`      |
| Alerts           | Email, Discord and Telegram, from the incident monitor ([Configuration](configuration.md#email-and-chat-notifications))   |

Each API response carries an `x-request-id` header. Search the logs for it when investigating a failed request.

## Resource usage

| Container      | Memory limit | Typical use |
| -------------- | ------------ | ----------- |
| `zee-index`    | 512 MB       | ~300 MB     |
| `postgres`     | 200 MB       | ~50 MB      |
| `redis`        | 150 MB       | ~20 MB      |
| `caddy`        | 50 MB        | ~10 MB      |
| `cron-monitor` | 40 MB        | < 5 MB      |
| `db-backup`    | 64 MB        | < 10 MB     |

The app sets `--max-old-space-size=384`. Video and downloads are streamed, not buffered, so memory does not grow with file size. The exception is WebDAV uploads, which are buffered up to 200 MB.

## Running without Docker

Requirements: Node.js 22, pnpm 10, PostgreSQL 16, Redis 7 (recommended).

```bash
git clone https://github.com/ifauzeee/Zee-Index.git
cd Zee-Index
pnpm install --frozen-lockfile

cp .env.example .env
# set DATABASE_URL, REDIS_URL and the rest

pnpm prisma generate
pnpm prisma migrate deploy
pnpm build
pnpm start            # listens on :3000
```

Run it under a process manager (systemd, pm2) and put a reverse proxy with HTTPS in front ([above](#behind-another-reverse-proxy-or-cloudflare)). Schedule the cron endpoints yourself.

**Serverless platforms** (Vercel and similar) are not a good fit. Downloads and video are streamed through the app, uploads are chunked through it, and the app expects a writable `.env` for setup and a long-lived Redis connection.

## Development stack

`docker-compose.dev.yml` runs PostgreSQL, Redis and the app in development mode with the source mounted:

```bash
pnpm docker:dev
```

See [Development](development.md) for the usual `pnpm dev` workflow.
