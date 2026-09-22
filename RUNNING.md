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
| `npm test`                | Unit tests (Vitest). No database, no network.                 |
| `npm run verify:ratelimit`| Proves the configured rate-limit store is reachable and shared.|
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

It refuses to write to a non-local server unless you pass `--yes`. Because
npm does not forward flags on Windows, run it as
`npx tsx scripts/verify-api.ts --url=https://... --yes`.

## Rate limiting

Login, registration, password changes and the report endpoints are rate
limited per client address. The counters live in one of two places.

**In process memory**, when no store is configured. Correct on a single
long-lived server. On a serverless host it is close to useless: each instance
counts separately and a cold start begins at zero, so the effective limit is
the configured one times the number of live instances.

**In a shared Redis store**, when one is configured. This is what makes the
limit real on Vercel.

### Creating a store

Either works; both speak the same HTTP protocol, so there is no client
library and no connection pool to size.

- **Vercel KV** — Storage, Create, KV, then link it to the project. Linking
  sets `KV_REST_API_URL` and `KV_REST_API_TOKEN` for you, in every
  environment. Nothing further to do.

- **Upstash** — create a Redis database at upstash.com, in the region closest
  to the app, and copy the REST URL and REST token from the database page.
  Set them as `KV_REST_API_URL` and `KV_REST_API_TOKEN`, or under their own
  names, `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.

Put the pair in `.env.local` to try it locally, and in the Vercel project
settings for Production and Preview.

### Confirming it works

```powershell
npm run verify:ratelimit
```

This is the check worth running before a deploy. It contacts the store named
in the environment, counts requests through the real limiter with the
in-memory counters cleared between each one — so anything that accumulates
had to come back from the store — and confirms the window expires rather than
being pushed back by each retry. It removes the keys it creates and exits
non-zero if the store is missing, mistyped or unreachable.

It reports two latency figures, because they mean different things. The
first-call number includes DNS and the TLS handshake, and is what a cold
serverless instance pays on its first rate-limited request. The warm number
is what every request after that costs, on the same instance, once the socket
is reused. The limiter gives up after 1500ms and falls back to memory, so the
warm figure is the one that should stay small: keep the store in the same
region as the deployment and it will sit well under 100ms.

A half-configured or mistyped pair is now refused rather than ignored, and
the fallback warning repeats every five minutes for as long as it applies.
Both exist because the previous behaviour was a single log line at boot,
which is indistinguishable from a healthy deployment once it scrolls away.

### When the store is down

The limiter falls back to per-process counters rather than rejecting the
request. That is deliberate: this application carries emergency reports, and
refusing an SOS because a rate-limit store is unreachable is worse than
counting it per instance.

Setting `RATE_LIMIT_REQUIRE_SHARED=true` reverses that, and requests get a
503 while the store is unavailable. It is off by default and is not
recommended here.

## Alert delivery

An emergency report, an SOS and an unconfirmed check-in each write a row to
`notifications`. On their own, that means a responder sees them when they
next open the dashboard — which at 3am is nobody.

Setting a provider pushes them out as well. Email, not SMS: SMS has no free
tier anywhere, and a responder's mail client raises a phone notification,
which is most of what SMS would buy.

### Set it up

1. Sign up at [resend.com](https://resend.com). The free plan is 3,000 emails
   a month and needs no card.
2. Create an API key and set `RESEND_API_KEY`.
3. Optionally set `ALERT_FROM`. Without a verified domain, use
   `SafezoneBUP <onboarding@resend.dev>`, which Resend accepts as-is.

Both go in `.env.local` and in the Vercel project settings.

### What happens without it

Every alert is still recorded, and the dashboard still shows it. The
application logs a warning every fifteen minutes so the gap is visible rather
than silent. Nothing fails.

That degradation is deliberate. Refusing to file an emergency report because
an email provider is unreachable would be a far worse failure than a late
notification, so delivery is capped at four seconds and never propagates an
error to the reporter.

## Error reporting

Failures are written with `console.error` and, when `SENTRY_DSN` is set, sent
to Sentry as well. The free plan covers 5,000 errors a month.

The error page shows visitors a reference code. Without a collector that code
identifies an event nobody can look up, which is the gap this closes.

Get the DSN from Sentry under Project Settings, Client Keys, and set
`SENTRY_DSN`. There is no SDK dependency: the ingest API is plain HTTP and
`lib/observability.ts` speaks it directly, the same way the rate limiter
speaks to Redis.

## Safety check-in escalation

A check-in records where someone is going and when they expect to arrive. The
point of it is that if they never confirm arrival, somebody is told.

That last part needs a scheduler. The database has always had a `missed`
status and nothing ever set it, so an unconfirmed check-in sat at `pending`
indefinitely and no responder was notified. `/api/checkin/escalate` is what
sets it: it finds check-ins more than fifteen minutes past their expected
arrival, marks them missed, and notifies every admin and security account.

### Set the secret

The endpoint has no session to authenticate, so it uses a shared secret and
refuses every request until one is configured. An open endpoint here would
let anyone escalate every pending check-in at once and bury responders.

```powershell
npm run gen:secret
```

Set the result as `CHECKIN_ESCALATION_SECRET`, locally and in Vercel.

### Point a scheduler at it

Vercel's Hobby plan only triggers cron jobs once a day, which is far too
coarse: a check-in due at 21:00 might not be escalated until the following
evening. Use an external scheduler instead. A free one such as cron-job.org
gives minute-level granularity:

| Setting | Value                                                   |
| ------- | ------------------------------------------------------- |
| URL     | `https://<your-app>.vercel.app/api/checkin/escalate`    |
| Method  | `POST`                                                  |
| Header  | `x-escalation-secret: <the value you generated>`        |
| Every   | 5 minutes                                               |

`Authorization: Bearer <secret>` is accepted too, which is the form Vercel
Cron sends, and the endpoint answers GET as well as POST for the same reason.

Check it by hand:

```powershell
curl -X POST https://<your-app>.vercel.app/api/checkin/escalate `
  -H "x-escalation-secret: <secret>"
```

A run with nothing to do reports `No overdue check-ins`, which is the normal
result.

### If you skip the scheduler

The application sweeps for overdue check-ins when a responder loads the
dashboard, at most once every five minutes per instance. That is a safety
net, not the mechanism: it only runs while somebody is using the application,
and an overnight check-in is exactly the case where nobody is.

## Rotating a password

```powershell
npm run admin:audit
npx tsx scripts/admin-password.ts set admin@bup.edu.bd --generate
```

Use the `npx tsx` form for anything taking arguments. npm does not forward
flags after `--` on Windows, so `npm run admin:password -- --email=...` reaches
the script with no arguments at all.

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

   | Variable       | Value                                          |
   | -------------- | ---------------------------------------------- |
   | `DATABASE_URL` | The Supabase pooler connection string          |
   | `JWT_SECRET`   | Output of `npm run gen:secret`, 32+ characters |

   Do not set `NODE_ENV`. Vercel sets it per deployment, and overriding it by
   hand is how a production deployment ends up running a development build.

   `DB_CONNECTION_LIMIT` does not need setting either: the pool size defaults
   to 2 when the `VERCEL` variable is present, which is the right number when
   many functions each hold their own pool. Set it only to override that.

   Also required, so rate limits are shared between instances:

   | Variable            | Value                                   |
   | ------------------- | --------------------------------------- |
   | `KV_REST_API_URL`   | From a Vercel KV or Upstash Redis store |
   | `KV_REST_API_TOKEN` | From the same store                     |

   Without them the limits still apply, but each serverless instance counts
   separately and every cold start starts from zero, so the real limit is the
   configured one multiplied by however many instances happen to be alive.
   For the login and emergency endpoints that is not a limit worth relying
   on. See [Rate limiting](#rate-limiting) for how to create the store and
   confirm it works.

   Also required for Supabase:

   | Variable    | Value                                                 |
   | ----------- | ----------------------------------------------------- |
   | `DB_SSL_CA` | The full contents of `supabase-ca.crt`, pasted inline |

   TLS turns itself on for any non-local host, but Supabase's connection
   pooler presents a certificate signed by Supabase's own authority, which
   Node does not trust out of the box. Without this variable the connection
   fails with `SELF_SIGNED_CERT_IN_CHAIN`.

   Download it from Project Settings, Database, SSL Configuration, then paste
   the whole file including the `BEGIN` and `END` lines. Vercel accepts
   multi-line values. The certificate is public, so it is not a secret.

   Locally the same certificate is supplied as a file path instead, through
   `DB_SSL_CA_FILE`, because a path is easier to manage than pasted PEM. On
   Vercel prefer `DB_SSL_CA`: a file next to the source is not reliably
   included in a serverless function bundle.

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
   npx tsx lib/database-init.ts setup --yes
   npx tsx lib/database-init.ts migrate --yes
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
   npx tsx scripts/admin-password.ts set admin@bup.edu.bd --generate
   ```

   Do this before the app is reachable from the internet.

6. Confirm the deployment end to end:

   ```powershell
   npx tsx scripts/verify-api.ts --url=https://your-app.vercel.app --yes
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
