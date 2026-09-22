# Troubleshooting Guide

## Common Issues and Solutions

### 1. TypeScript Errors - "Cannot find module 'react'"

**Problem**: VS Code shows TypeScript errors even though dependencies are installed.

**Solutions**:
1. Restart VS Code completely
2. In VS Code: Press `Ctrl+Shift+P` → "TypeScript: Restart TS Server"
3. Delete `.next` folder if it exists: `Remove-Item -Recurse -Force .next`
4. Run: `npm install --legacy-peer-deps`

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

### 6. Backend Server Won't Start

**Problem**: `npm run dev:backend` fails.

**Solutions**:
1. Check if all backend dependencies are installed
2. Verify `backend/.env` file exists with correct values
3. Check `DATABASE_URL` and that the Supabase project is awake
4. Look for syntax errors in backend files

### 7. Frontend Won't Load

**Problem**: Frontend shows errors or won't start.

**Solutions**:
1. Check browser console for errors
2. Verify API endpoints are correct in `lib/api-client.ts`
3. Ensure backend is running on port 3001
4. Check network tab for failed API calls

## Quick Fixes

### Reset Everything
```bash
# Remove node_modules and reinstall
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install --legacy-peer-deps
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

## Development Workflow

1. Start backend: `npm run dev:backend`
2. Start frontend: `npm run dev:frontend`
3. Or start both: `npm run dev`
4. Access frontend: http://localhost:3000
5. Backend API: http://localhost:3001

## Production Deployment

1. Build frontend: `npm run build`
2. Set production environment variables
3. Run: `npm start`
4. Configure reverse proxy (nginx)
5. Set up SSL certificates
