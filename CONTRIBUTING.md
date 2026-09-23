# Contributing to SafezoneBUP

Thanks for wanting to help. This is a campus safety application, so a bug
here can mean someone's emergency report goes nowhere. The guidance below is
mostly about making that hard to do by accident.

## Code of conduct

- Be respectful and inclusive
- Assume good faith in review
- Keep student safety and privacy ahead of convenience

## Getting set up

```bash
npm install
cp .env.example .env.local   # then set DATABASE_URL and JWT_SECRET
npm run db:init              # schema, migrations and sample data in one step
npm run dev
```

Use `npm run db:init` rather than `db:setup` on its own — `db:setup` creates
the schema but does not run migrations, which leaves a database that looks
correct and behaves subtly differently.

[QUICKSTART.md](QUICKSTART.md) has more detail, including the Supabase
certificate step. [RUNNING.md](RUNNING.md) covers the optional integrations.

## Before you open a pull request

```bash
npx tsc --noEmit          # types
npm run lint              # ESLint
npm test                  # 47 unit tests
npm run verify:security   # 70 security invariants, no database needed
```

CI runs exactly these four, plus a production build, on Node 20 and 22. If
they pass locally they will pass there.

Two more need a running server, so run them when you have touched the API or
the interface:

```bash
npm run dev               # in another terminal, then:
npm run verify:api        # 39 end-to-end checks against a real database
npm run verify:a11y       # axe-core, WCAG 2.1 A and AA, all pages
```

> **Do not run `npm run build` while `npm run dev` is running.** The build
> overwrites `.next`, the dev server then 404s its own chunks, and every page
> renders blank. `verify:a11y` will refuse to grade a blank page rather than
> reporting a clean sweep of nothing, but it is easier not to hit it.

## Code style

- TypeScript throughout. If a value can be null, say so in the type — a type
  that lies about nullability is how a crash reached production here once,
  because the compiler had no reason to question the dereference.
- Tailwind for styling, shadcn/ui for primitives. Use the design tokens in
  `app/globals.css` rather than hardcoded colours, so dark mode and contrast
  keep working.
- ESLint via `npm run lint` is the formatter of record. There is no Prettier
  config in this project; adding one would fight the existing style.
- Comments should explain why, not what. The interesting ones here record a
  decision or a failure that already happened.

## Things that are easy to break

**Authorization.** Never trust a `userId` or `role` from a request body. The
Zod schemas in `lib/validation.ts` strip them deliberately; identity comes
from the session. `verify:security` asserts this and will fail if it regresses.

**Anonymity.** The lost-and-found board withholds contact details from
anonymous callers at the endpoint, not in the interface. Keep that boundary
server-side.

**Alert delivery.** An emergency report, an SOS or a missed check-in must
survive a failure in notification. Record first, notify second, and never let
a delivery failure reject the request.

**Real-world claims.** Do not add a number, a response time or a capability to
the interface that the code cannot back. On a safety page, an invented
response time is something a person may rely on.

## Adding a migration

Append to the `migrations` array in `lib/database-migrate.ts` with the next
id. Migrations must be idempotent — they run against databases in unknown
states. Check `npm run db:migrate:status` before and after.

## Commit messages

Explain what changed and why it mattered. The existing history is the style
guide: a subject line that states the outcome, then prose explaining what was
wrong and what the fix assumes. Prefixes like `feat:` are not used here.

## Reporting issues

Include what you expected, what happened, steps to reproduce, and your Node
version. If it is a security issue, please raise it privately with the
maintainer rather than opening a public issue.
