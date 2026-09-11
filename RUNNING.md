# SafezoneBUP — running and deploying

This is a single Next.js application. The user interface and the API live in
the same project: the API is the set of route handlers under `app/api`, served
by Next.js itself. There is no separate backend process to start.

> A second Express-style backend used to exist under `backend/` on port 3001.
> Nothing imported it, no npm script started it, and it had drifted from the
> real API, so it has been removed. Ignore any older instructions that tell
> you to run `node backend/server.js`.
>
> The app cannot be exported as static HTML (`next export`), because the API
> routes need a server at request time. Deploy it as a Next.js app.

## Prerequisites

- Node.js 18 or newer
- npm
- A PostgreSQL database. A free Supabase project is the intended setup, and
  works for local development too, so nothing needs installing.

> This app ran on MySQL until the move to PostgreSQL. If you find older
> instructions mentioning `mysql2`, `DB_NAME=safezone_db` or MySQL-style
> schema files, they predate that change.

## Local setup

```powershell
npm install
Copy-Item .env.example .env.local
```

Then edit `.env.local`:

- Set `DATABASE_URL` to your Supabase **connection pooler** string, found
  under Project Settings, Database, Connection string. Use the pooler rather
  than the direct connection: it is what lets many short-lived serverless
  functions share a small number of real connections. URL-encode the password
  if it contains any of `@ : / ? # %`.
- Set `JWT_SECRET`. Generate one with `npm run gen:secret`.

Create the schema and sample data:

```powershell
npm run db:init
```

The seed prints a generated administrator password once. Save it.

Start the dev server:

```powershell
npm run dev
# http://localhost:3000
# Health check: http://localhost:3000/api/health
```

## Database commands

| Command                     | Effect                                            |
| --------------------------- | ------------------------------------------------- |
| `npm run db:init`           | Create tables, migrate, then seed sample data     |
| `npm run db:setup`          | Create tables only                                |
| `npm run db:migrate`        | Apply pending migrations to an existing database  |
| `npm run db:migrate:status` | Show which migrations are pending                 |
| `npm run db:seed`           | Insert sample data                                |
| `npm run db:reset`          | Drop and recreate every table (destroys all data) |

A database created by `db:setup` is already current, so `db:migrate` reports
nothing to do. It exists for one created by an earlier revision of the schema,
and for every future change: `lib/database-setup.ts` only defines what a new
database gets, and `CREATE TABLE IF NOT EXISTS` will never alter an existing
one. Add a migration for anything that has to change after the first deploy.

Enumerated columns are TEXT with a CHECK constraint rather than a native
PostgreSQL enum type, because a CHECK constraint can be widened by an ordinary
migration. `setAllowedValues` in `lib/database-migrate.ts` does that.

## First administrator

Self-service signup always creates a student account. Nobody can grant
themselves administrator or security access through the API.

`npm run db:seed` creates `admin@bup.edu.bd`. Its password is taken from
`SEED_ADMIN_PASSWORD` if you set one, and is otherwise generated at random and
printed once by the seed command, so no deployment ends up with a password
that is published in this repository.

To create the first administrator, use that seeded account, or promote an
existing user directly in the database:

```sql
UPDATE users SET role = 'admin' WHERE email = 'you@example.com';
```

After that, an administrator can create further staff accounts by calling
`POST /api/auth/register` while signed in, including a `role` field.

## Checks

| Command                   | What it does                                                  |
| ------------------------- | ------------------------------------------------------------- |
| `npm run verify:security` | Authorization and validation checks. Needs no database.       |
| `npm run verify:api`      | End-to-end checks against a running server and real database. |
| `npm run admin:audit`     | Finds accounts using a password published in this repository. |
| `npm run gen:secret`      | Prints a fresh value suitable for `JWT_SECRET`.               |

`verify:api` creates two throwaway accounts, exercises privilege escalation,
cross-user access, the SOS latch and anonymous reporting, then deletes
everything it made. Start the server first:

```powershell
npm run dev            # in another terminal
npm run db:migrate
npm run verify:api
```

It refuses to write to a non-local server unless you pass `-- --yes`.

## Rotating a password

```powershell
npm run admin:audit
npm run admin:password -- --email=admin@bup.edu.bd --generate
```

The generated password is printed once. Pass `--password="..."` to choose one
instead; it has to satisfy the same policy the API enforces. Sessions issued
before the change stay valid until they expire, because nothing tracks issued
tokens yet.

## Deploying to Vercel

1. Create a Supabase project. Copy the **connection pooler** string from
   Project Settings, Database, Connection string. The direct connection will
   exhaust its connection limit once several functions run at once.

2. Push the repository to GitHub and import it in Vercel. The framework is
   detected automatically; no build configuration is needed.

3. Set these environment variables in Project Settings, for Production and
   Preview both.

   Required:

   | Variable              | Value                                          |
   | --------------------- | ---------------------------------------------- |
   | `DATABASE_URL`        | The Supabase pooler connection string          |
   | `JWT_SECRET`          | Output of `npm run gen:secret`, 32+ characters |
   | `DB_CONNECTION_LIMIT` | `2`                                            |

   Strongly recommended, so rate limits are shared between instances:

   | Variable            | Value                                   |
   | ------------------- | --------------------------------------- |
   | `KV_REST_API_URL`   | From a Vercel KV or Upstash Redis store |
   | `KV_REST_API_TOKEN` | From the same store                     |

   Linking a Vercel KV store to the project sets that pair for you. Outside
   Vercel, use `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.

   TLS is enabled automatically for any non-local host, so no SSL variable is
   needed for Supabase.

   The app refuses to run in production without `JWT_SECRET` rather than
   falling back to a value committed in the repository. Changing the secret
   later signs every user out.

   If you prefer the CLI, `npm i -g vercel`, then `vercel login`, then:

   ```powershell
   vercel env add DATABASE_URL production
   vercel env add JWT_SECRET production
   # ...one per variable, for production and preview
   ```

4. Create the schema in the Supabase database from your own machine, by
   putting the same `DATABASE_URL` in `.env.local` and running:

   ```powershell
   npm run db:setup
   npm run db:migrate -- --yes
   ```

   The command prints which database it is about to change and refuses a
   non-local target without `--yes`, so a stale `.env.local` cannot quietly
   migrate the wrong database. The in-app setup endpoint now requires an
   administrator session, so first-time bootstrap happens from the CLI.

5. Seed the administrator account, then confirm nothing is using a password
   published in this repository:

   ```powershell
   npm run db:seed
   npm run admin:audit
   ```

   `db:seed` prints a generated administrator password once. If you seeded
   earlier with the old fixed password, rotate it:

   ```powershell
   npm run admin:password -- --email=admin@bup.edu.bd --generate
   ```

   Do this before the app is reachable from the internet.

6. Confirm the deployment end to end:

   ```powershell
   npm run verify:api -- --url=https://your-app.vercel.app --yes
   ```

   It creates two throwaway accounts, checks privilege escalation,
   cross-user access, the SOS latch and anonymous reporting, then deletes
   what it made.

### Two things to know about serverless

**Connection limits.** Each concurrent function instance opens its own pool.
Connect through the Supabase pooler, keep `DB_CONNECTION_LIMIT` low, and make
sure it multiplied by your expected concurrency stays below the pooler's
client limit. If you see intermittent errors under load, this is the first
thing to check.

**Rate limiting depends on the KV variables.** With them set, counters live in
Redis and are shared across instances. Without them, the limits fall back to
per-process memory: each instance keeps its own and they reset on cold starts,
so they slow casual abuse but are not a hard control. The server logs a warning
once at startup when it is running in the fallback mode. If the store becomes
unreachable the limiter falls back rather than rejecting requests, so an outage
in the rate limiter never takes the emergency endpoints down.
