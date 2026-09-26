# Backend on your own server

Copy this whole project into any folder on the server. The folder name does not matter.

You need Node.js 20 or newer, npm, and PostgreSQL.

## 1. Create the database

```bash
sudo -u postgres psql
```

```sql
CREATE USER bwuzuri WITH PASSWORD 'choose-a-password';
CREATE DATABASE bwuzuri OWNER bwuzuri;
\q
```

## 2. Fill in the settings

```bash
cp server/env.example .env
```

Edit `.env` in this folder:

- `DATABASE_URL` — the password you just chose
- `JWT_SECRET` — at least 32 characters
- `CORS_ORIGINS` — the web and mobile site addresses, plus `bwuzuri://app` for the desktop app
- `SEED_PASSWORD` — the first Intara login password
- `VITE_API_URL` — the public API address the websites will use, ending in `/api`

## 3. Install

From this folder:

```bash
bash server/setup.sh --seed
```

`--seed` creates the first churches and the `intara` account. Use it only the first time.

## 4. Update a server that is already running

From this folder:

```bash
bash server/update.sh
```

That pulls the latest code, applies database migrations, and rebuilds `apps/api/dist`. If the API was installed with `install-service.sh`, it restarts. Otherwise restart the Node project in the panel. A pull alone leaves the old process running.

## 5. Start

```bash
bash server/start.sh
```

Check `http://SERVER:8080/health/live`. It should say `"status":"ok"`.

To keep it running after a reboot, on a Linux server:

```bash
sudo bash server/install-service.sh
```

`server/nginx-api.conf` is an optional Nginx site that forwards `https://your-server/api` to this API. After Nginx is in place, set `VITE_API_URL` on Vercel to that public address.
