@echo off
echo 🚀 SafeZone Campus Safety Platform - Complete Setup
echo ==================================================

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ first.
    pause
    exit /b 1
)

REM Check if MySQL is available
mysql --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  MySQL is not found. Please make sure MySQL is installed and running.
    echo    You can also use XAMPP, WAMP, or other MySQL distributions.
)

echo 📦 Installing dependencies...
npm install --legacy-peer-deps

echo 🔧 Setting up TypeScript...
npx tsc --noEmit --skipLibCheck

echo 📁 Creating necessary directories...
if not exist "backend\logs" mkdir backend\logs
if not exist "backend\uploads" mkdir backend\uploads

echo.
echo 🗄️  Database setup instructions:
echo 1. Make sure MySQL is running
echo 2. Create a database named 'safezone_db'
echo 3. Update backend\.env with your MySQL credentials
echo 4. Run: npm run db:setup
echo 5. Run: npm run db:seed

echo.
echo 🎯 To start the development servers:
echo    Frontend only: npm run dev:frontend
echo    Backend only:  npm run dev:backend
echo    Both servers:  npm run dev

echo.
echo ✅ Setup complete! Check the README.md for detailed instructions.
pause
