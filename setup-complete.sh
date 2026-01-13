#!/bin/bash

echo "🚀 SafeZone Campus Safety Platform - Complete Setup"
echo "=================================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if MySQL is installed
if ! command -v mysql &> /dev/null; then
    echo "⚠️  MySQL is not found. Please make sure MySQL is installed and running."
    echo "   You can also use XAMPP, WAMP, or other MySQL distributions."
fi

echo "📦 Installing dependencies..."
npm install --legacy-peer-deps

echo "🔧 Setting up TypeScript..."
npx tsc --noEmit --skipLibCheck

echo "📁 Creating necessary directories..."
mkdir -p backend/logs
mkdir -p backend/uploads

echo "🗄️  Database setup instructions:"
echo "1. Make sure MySQL is running"
echo "2. Create a database named 'safezone_db'"
echo "3. Update backend/.env with your MySQL credentials"
echo "4. Run: npm run db:setup"
echo "5. Run: npm run db:seed"

echo "🎯 To start the development servers:"
echo "   Frontend only: npm run dev:frontend"
echo "   Backend only:  npm run dev:backend"
echo "   Both servers:  npm run dev"

echo "✅ Setup complete! Check the README.md for detailed instructions."
