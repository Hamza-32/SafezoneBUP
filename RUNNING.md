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
- A MySQL 8 database

## Local setup

```powershell
npm install
Copy-Item .env.example .env.local
```

Then edit `.env.local`:

- Fill in the `DB_*` values for your MySQL instance.
- Set `JWT_SECRET`. Generate one with:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Create the schema and sample data:

```powershell
npm run db:init
```

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

`db:migrate` matters for any database created before the migration runner
existed. It fixes three things that were broken in the original schema:
anonymous reports could not be stored, report reference codes were not saved,
and several categories offered by the report forms were rejected by the
database.

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

1. Push the repository to GitHub and import it in Vercel. The framework is
   detected automatically; no build configuration is needed.

2. Provision a MySQL database that is reachable from Vercel. A local or
   campus-network MySQL will not be reachable from Vercel's functions.

3. Set these environment variables in Project Settings, for Production and
   Preview both.

   Required:

   | Variable              | Value                                            |
   | --------------------- | ------------------------------------------------ |
   | `JWT_SECRET`          | Output of `npm run gen:secret`, 32+ characters   |
   | `DB_HOST`             | Database hostname                                |
   | `DB_USER`             | Database user                                    |
   | `DB_PASSWORD`         | Database password                                |
   | `DB_NAME`             | Database name                                    |
   | `DB_PORT`             | Usually `3306`                                   |
   | `DB_CONNECTION_LIMIT` | `2`                                              |

   Strongly recommended, so rate limits are shared between instances:

   | Variable            | Value                                    |
   | ------------------- | ---------------------------------------- |
   | `KV_REST_API_URL`   | From a Vercel KV or Upstash Redis store  |
   | `KV_REST_API_TOKEN` | From the same store                      |

   Linking a Vercel KV store to the project sets that pair for you. Outside
   Vercel, use `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.

   The app refuses to run in production without `JWT_SECRET` rather than
   falling back to a value committed in the repository. Changing the secret
   later signs every user out.

   If you prefer the CLI, `npm i -g vercel`, then `vercel login`, then:

   ```powershell
   vercel env add JWT_SECRET production
   vercel env add DB_HOST production
   # ...one per variable, for production and preview
   ```

4. Apply the schema to the production database from your own machine, by
   pointing the `DB_*` variables in `.env.local` at it and running:

   ```powershell
   npm run db:migrate -- --yes
   ```

   The command prints which database it is about to change and refuses a
   non-local target without `--yes`, so a stale `.env.local` cannot quietly
   migrate the wrong database. The in-app setup endpoint now requires an
   administrator session, so first-time bootstrap happens from the CLI.

5. Rotate any account that still uses a password from the seed data, which is
   published in this repository:

   ```powershell
   npm run admin:audit
   npm run admin:password -- --email=admin@bup.edu.bd --generate
   ```

   Do this before the database is reachable from the internet.

### Two things to know about serverless

**Connection limits.** Each concurrent function instance opens its own MySQL
pool. Keep `DB_CONNECTION_LIMIT` low and make sure it multiplied by your
expected concurrency stays below the database's `max_connections`. If you see
intermittent errors under load, this is the first thing to check.

**Rate limiting depends on the KV variables.** With them set, counters live in
Redis and are shared across instances. Without them, the limits fall back to
per-process memory: each instance keeps its own and they reset on cold starts,
so they slow casual abuse but are not a hard control. The server logs a warning
once at startup when it is running in the fallback mode. If the store becomes
unreachable the limiter falls back rather than rejecting requests, so an outage
in the rate limiter never takes the emergency endpoints down.
