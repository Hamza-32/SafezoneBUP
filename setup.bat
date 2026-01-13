@echo off
echo 🚀 SafeZone Campus Safety Platform Setup
echo ========================================

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ first.
    pause
    exit /b 1
)

REM Check if MySQL is accessible
mysql --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ MySQL is not installed or not in PATH. Please install MySQL 8+ first.
    pause
    exit /b 1
)

echo ✅ Prerequisites check passed

REM Install dependencies
echo 📦 Installing dependencies...
call npm install

if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

echo ✅ Dependencies installed successfully

REM Check if .env file exists
if not exist "backend\.env" (
    echo 📝 Creating environment configuration...
    copy "backend\.env.example" "backend\.env"
    echo ⚠️  Please update the database credentials in backend\.env
    echo    Edit the file and update DB_USER, DB_PASSWORD, and other settings
    pause
)

REM Test database connection
echo 🔍 Testing database connection...
call npm run db:setup

if %errorlevel% neq 0 (
    echo ❌ Database setup failed. Please check your database credentials.
    pause
    exit /b 1
)

echo ✅ Database setup completed

REM Seed the database
echo 🌱 Seeding database with initial data...
call npm run db:seed

if %errorlevel% neq 0 (
    echo ❌ Database seeding failed
    pause
    exit /b 1
)

echo ✅ Database seeded successfully

echo.
echo 🎉 SafeZone setup completed successfully!
echo.
echo 📋 Default Login Credentials:
echo    Admin: admin@safezone.edu / admin123
echo    Student: john.doe@student.edu / student123
echo.
echo 🚀 To start the application:
echo    npm run dev
echo.
echo 🌐 Application URLs:
echo    Frontend: http://localhost:3000
echo    Backend:  http://localhost:3001
echo.
echo 📚 For more information, see README.md
pause
