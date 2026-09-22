# SafezoneBUP — quick start

Five minutes from a clone to a running app. [RUNNING.md](RUNNING.md) covers
everything else: deployment, rate limiting, check-in escalation, database
commands and the verification scripts.

## 1. Prerequisites

- Node.js 20 or newer
- npm
- A free [Supabase](https://supabase.com) project

Nothing to install for the database. Supabase works for local development as
well as production, so there is no local server to run.

> **If you find older instructions mentioning MySQL**, `safezone_db`,
> `mysql2` or a `backend/` folder, they predate the move to PostgreSQL and no
> longer apply. This file used to be one of them.

## 2. Install and configure

```powershell
npm install
Copy-Item .env.example .env.local
```

Edit `.env.local` and set two values:

| Variable       | Where it comes from                                           |
| -------------- | ------------------------------------------------------------- |
| `DATABASE_URL` | Supabase: Project Settings → Database → Connection string      |
| `JWT_SECRET`   | Run `npm run gen:secret` and paste the output                  |

Use the **connection pooler** string, not the direct connection — it is what
lets many short-lived functions share a few real connections. URL-encode the
password if it contains any of `@ : / ? # %`.

Supabase's pooler presents a certificate Node does not trust by default, so
download the CA from Project Settings → Database → SSL Configuration and
point at it:

```
DB_SSL_CA_FILE=supabase-ca.crt
```

## 3. Create the schema

```powershell
npm run db:init
```

This creates the tables and seeds sample data. It prints a generated
administrator password **once** — save it before the terminal scrolls.

## 4. Run it

```powershell
npm run dev
```

- App: http://localhost:3000
- Health check: http://localhost:3000/api/health

The health check is the quickest way to confirm the database is reachable. It
returns `"database": {"status": "connected"}` when everything is wired up.

## 5. Confirm it works

```powershell
npm run verify:security
```

70 checks covering role escalation, record ownership, URL handling and
authentication. They need no database and take a couple of seconds.

With the dev server running, `npm run verify:api` exercises the same paths
against a real database and cleans up after itself.

## Common problems

**`SELF_SIGNED_CERT_IN_CHAIN`** — `DB_SSL_CA_FILE` is not set, or points at a
file that is not there. See step 2.

**`password authentication failed`** — the password in `DATABASE_URL` needs
URL-encoding, or you copied the template string with `[YOUR-PASSWORD]` still
in it.

**Port 3000 in use** — Next.js moves to 3001 and prints the address it chose.

[TROUBLESHOOTING.md](TROUBLESHOOTING.md) has more.
