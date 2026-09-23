# Troubleshooting Guide

## Common Issues and Solutions

### 1. TypeScript Errors - "Cannot find module 'react'"

**Problem**: VS Code shows TypeScript errors even though dependencies are installed.

**Solutions**:
1. Restart VS Code completely
2. In VS Code: Press `Ctrl+Shift+P` → "TypeScript: Restart TS Server"
3. Delete `.next` folder if it exists: `Remove-Item -Recurse -Force .next`
4. Run: `npm install`

### 2. Module Resolution Issues

**Problem**: Cannot find module errors for installed packages.

**Solutions**:
1. Check if `node_modules` exists and has content
2. Run: `npm install --force`
3. Clear npm cache: `npm cache clean --force`
4. Restart TypeScript server in VS Code

### 3. Database Connection Issues

**Problem**: The app cannot reach the database.

There is no local database server: the app runs on Supabase over the network.

**Solutions**:
1. Check `DATABASE_URL` in `.env.local`. It must be the **connection pooler**
   string (`...pooler.supabase.com:6543`), not the direct connection.
2. `SELF_SIGNED_CERT_IN_CHAIN` means `DB_SSL_CA_FILE` is unset or points at a
   missing file. Download the CA from Project Settings, Database, SSL
   Configuration.
3. `password authentication failed` usually means the password needs
   URL-encoding, or `[YOUR-PASSWORD]` was copied across from the template.
4. A free Supabase project pauses after about a week idle. The first request
   wakes it and is slow; the second confirms it.
5. Test the whole path: `npm run dev`, then open
   http://localhost:3000/api/health

### 4. Port Already in Use

**Problem**: Error: Port 3000 or 3001 is already in use.

**Solutions**:
1. Kill processes using the ports:
   ```bash
   # Windows
   netstat -ano | findstr :3000
   taskkill /PID <PID> /F
   
   # Or change ports in package.json scripts
   ```

### 5. Build Errors

**Problem**: `npm run build` fails with compilation errors.

**Solutions**:
1. Fix TypeScript errors first
2. Run: `npx next build --debug`
3. Check if all imports are correct
4. Ensure all components are properly exported

### 6. An API route returns 500

**Problem**: An API route returns 500.

There is no separate backend process. The API is Next.js route handlers under
`app/api/`, served by the same `npm run dev`.

**Solutions**:
1. Read the terminal running `npm run dev` — the real error is logged there,
   not in the browser
2. Check `.env.local` has `DATABASE_URL`, `DB_SSL_CA_FILE` and `JWT_SECRET`
3. Confirm the database is reachable: http://localhost:3000/api/health
4. Run `npm run db:migrate:status` — a pending migration can leave the schema
   behind what the code expects

### 7. Frontend Won't Load

**Problem**: Pages render blank, or the console shows 404s for
`/_next/static/...` chunks.

Almost always caused by running `npm run build` while `npm run dev` is live.
The build overwrites `.next` and the dev server then cannot find its own
chunks.

**Solutions**:
1. Stop the dev server, `Remove-Item -Recurse -Force .next`, start it again
2. Do not build and serve in the same session
3. If it persists, check the browser console for a real application error —
   `app/error.tsx` should catch component failures and show a message rather
   than a blank page

## Quick Fixes

### Reset Everything
```bash
# Remove node_modules and reinstall
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install
```

### Restart Development Environment
```bash
# Kill all Node processes
taskkill /im node.exe /f

# Restart VS Code
# Run: npm run dev
```

### Check Dependencies
```bash
# List installed packages
npm list --depth=0

# Check for vulnerabilities
npm audit

# Update packages
npm update
```

## Environment Setup Checklist

- [ ] Node.js 20+ installed
- [ ] A Supabase project created, and not paused
- [ ] `.env.local` has `DATABASE_URL`, `DB_SSL_CA_FILE` and `JWT_SECRET`
- [ ] Schema created: `npm run db:init`
- [ ] All dependencies installed: `npm install`
- [ ] TypeScript server restarted in VS Code
- [ ] No port conflicts (3000, 3001)

## Getting Help

If issues persist:
1. Check the console/terminal for specific error messages
2. Verify all file paths and imports are correct
3. Ensure all required files exist
4. Check the GitHub issues or documentation

## Development workflow

`npm run dev:backend` and `npm run dev:frontend` do not exist. This is a
single Next.js application: the interface and the API are served by the same
process on the same port.

1. `npm run dev`
2. App: http://localhost:3000
3. API: http://localhost:3000/api/... — health check at `/api/health`

Next.js moves to 3001 if 3000 is taken, and prints the port it chose.

## Production deployment

Deployed on Vercel from the `main` branch; a push is a deploy. See the
deployment section of [RUNNING.md](RUNNING.md) for the environment variables
that must be set, and why `DB_SSL_CA` has to be inline rather than a file
path.
4. Configure reverse proxy (nginx)
5. Set up SSL certificates
