#!/bin/bash

echo "🚀 SafeZone Campus Safety Platform Setup"
echo "========================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if MySQL is installed
if ! command -v mysql &> /dev/null; then
    echo "❌ MySQL is not installed. Please install MySQL 8+ first."
    exit 1
fi

echo "✅ Prerequisites check passed"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed successfully"

# Check if .env file exists
if [ ! -f "backend/.env" ]; then
    echo "📝 Creating environment configuration..."
    cp backend/.env.example backend/.env
    echo "⚠️  Please update the database credentials in backend/.env"
    echo "   Edit the file and update DB_USER, DB_PASSWORD, and other settings"
    read -p "Press Enter after updating the .env file..."
fi

# Test database connection
echo "🔍 Testing database connection..."
npm run db:setup

if [ $? -ne 0 ]; then
    echo "❌ Database setup failed. Please check your database credentials."
    exit 1
fi

echo "✅ Database setup completed"

# Seed the database
echo "🌱 Seeding database with initial data..."
npm run db:seed

if [ $? -ne 0 ]; then
    echo "❌ Database seeding failed"
    exit 1
fi

echo "✅ Database seeded successfully"

echo ""
echo "🎉 SafeZone setup completed successfully!"
echo ""
echo "📋 Default Login Credentials:"
echo "   Admin: admin@safezone.edu / admin123"
echo "   Student: john.doe@student.edu / student123"
echo ""
echo "🚀 To start the application:"
echo "   npm run dev"
echo ""
echo "🌐 Application URLs:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:3001"
echo ""
echo "📚 For more information, see README.md"
