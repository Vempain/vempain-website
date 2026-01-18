# Vempain Website – Production Deployment

This guide explains how to run the site frontend, backend and PostgreSQL database inside Docker while Apache terminates
HTTPS and forwards traffic to Traefik.

## Prerequisites

- RHEL/Rocky/Alma or other Linux with systemd
- Packages installed via system package manager:
    - `httpd` (Apache) with `mod_proxy` and `mod_ssl`
    - `docker` & `docker-compose-plugin`
- Valid Let’s Encrypt certificates at `/etc/letsencrypt/live/<host>/`
- A dedicated Unix user (e.g. `vempain`) owning `/srv/vempain`

## 1. Fetch code & prepare env

```bash
cd /srv/vempain
sudo git clone https://github.com/<org>/vempain-website.git
cd vempain-website
cp .env.production.example .env.production
```

Edit `.env.production` and set:

- `TRAEFIK_SITE_HOST` to the public hostname (e.g. `my.host.name`)
- JWT secret, DB password, and filesystem paths (`VEMPAIN_WEBSITE_WEB_ROOT`, `ENV_VEMPAIN_SITE_LOG_VOLUME`)

## 2. Build runtime images

```bash
ENV_FILE=.env.production docker compose -f docker-compose.prod.yml build
```

Or via the helper make target:

```bash
ENV_FILE=.env.production make build-prod
```

This compiles the frontend (Vite build) and backend (Composer install).

## 3. Start the stack

```bash
ENV_FILE=.env.production docker compose -f docker-compose.prod.yml up -d
```

Traefik binds to port `6000` inside the container, exported to the host. The backend mounts:

- `/srv/vempain/files` (public assets/files)
- `/srv/vempain/logs` (Monolog output)

## 4. Configure Apache

Copy `deploy/apache/vempain-site.conf` to `/etc/httpd/conf.d/vempain.conf` and replace `<HOSTNAME>` with your domain.
Enable required modules:

```bash
sudo dnf install mod_ssl
sudo systemctl enable --now httpd
sudo systemctl reload httpd
```

Traffic flow:

1. Browser → Apache port 80/443 (TLS termination handled by Apache)
2. Apache proxies HTTPS requests to `http://127.0.0.1:6000`
3. Traefik routes `/api|/file|/health` to the PHP backend (port 8000) and everything else to the frontend (port 80)

## 5. Verify

```bash
curl -IH "Host: $TRAEFIK_SITE_HOST" http://127.0.0.1:6000/health
curl -IH "Host: $TRAEFIK_SITE_HOST" http://127.0.0.1:6000/
curl -IH "Host: $TRAEFIK_SITE_HOST" http://127.0.0.1:6000/api/health
```

Then browse to `https://<host>/`.

## 6. Updates & maintenance

- To pull new versions:
  ```bash
  git pull
  ENV_FILE=.env.production docker compose -f docker-compose.prod.yml pull
  ENV_FILE=.env.production docker compose -f docker-compose.prod.yml up -d
  ```
- Database backup via `docker compose exec db pg_dump ...`
- Logs live under `/srv/vempain/logs`

## Default site style (JSON theme)

The frontend loads the default theme from the backend at:

- `GET /api/public/files/document/site/default-style.json`

This is served from the backend *files root* directory (the same volume used for `/file/...` resources) and must exist both:

1. As a **real file** on the host filesystem (mounted into the backend files volume)
2. As a **row in** `web_site_file` with `path = 'document/site/default-style.json'`

A default version of the file is included in this repo at:

- `deploy/document/site/default-style.json`

Copy it into your host files directory under `document/site/default-style.json` (and insert/update the corresponding `web_site_file` record).

## Troubleshooting

- Use `docker compose logs -f` to inspect services
- `docker compose ps` to check health status
- Verify Apache proxy with `sudo tail -f /var/log/httpd/vempain.error.log`
