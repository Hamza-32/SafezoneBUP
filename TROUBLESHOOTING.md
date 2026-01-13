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

**Problem**: Backend cannot connect to MySQL database.

**Solutions**:
1. Ensure MySQL service is running
2. Check database credentials in `backend/.env`
3. Create the database: `CREATE DATABASE safezone_db;`
4. Test connection: `mysql -u root -p safezone_db`

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
3. Check MySQL connection settings
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
# Restart MySQL service
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

- [ ] Node.js 18+ installed
- [ ] MySQL 8+ installed and running
- [ ] Database `safezone_db` created
- [ ] `backend/.env` configured with correct credentials
- [ ] All dependencies installed: `npm install --legacy-peer-deps`
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
