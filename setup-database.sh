#!/bin/bash

# SafeZone Database Setup Script
# This script will set up your SafeZone database with all advanced features

echo "🚀 SafeZone Database Setup"
echo "=========================="

# Check if MySQL is running
if ! command -v mysql &> /dev/null; then
    echo "❌ MySQL is not installed or not in PATH"
    exit 1
fi

echo "📋 Please ensure you have:"
echo "  ✓ MySQL server running"
echo "  ✓ Database credentials configured in .env file"
echo ""

read -p "Continue with database setup? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

echo ""
echo "🔧 Setting up database tables..."
npm run db setup

if [ $? -eq 0 ]; then
    echo "✅ Database tables created successfully!"
    echo ""
    echo "🌱 Seeding database with sample data..."
    npm run db seed
    
    if [ $? -eq 0 ]; then
        echo "✅ Database seeded successfully!"
        echo ""
        echo "🎉 SafeZone is ready to use!"
        echo ""
        echo "📋 What's included:"
        echo "  ✓ Safety Resources Hub"
        echo "  ✓ Anonymous Discussion Board"
        echo "  ✓ Safety Check-In System"
        echo "  ✓ Badge & Gamification"
        echo "  ✓ Emergency Contact Management"
        echo "  ✓ Verification & Trust System"
        echo ""
        echo "🚀 Start the development server:"
        echo "  npm run dev"
        echo ""
        echo "🌐 Open in browser:"
        echo "  http://localhost:3000"
    else
        echo "❌ Database seeding failed"
        exit 1
    fi
else
    echo "❌ Database setup failed"
    exit 1
fi
