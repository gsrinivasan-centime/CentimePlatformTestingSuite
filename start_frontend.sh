#!/bin/bash

# Centime Test Management System - Frontend Start Script

set -e  # Exit on error

echo "=================================================="
echo "Centime Test Management - Frontend Start"
echo "=================================================="
echo ""

# Check if we're in the right directory
if [ ! -f "frontend/package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Navigate to frontend
cd frontend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo "✓ Dependencies installed"
else
    echo "✓ Dependencies already installed"
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚙️  Creating .env file..."
    cp .env.example .env
    echo "✓ .env file created"
fi

echo ""
echo "=================================================="
echo "🚀 Starting React development server..."
echo "=================================================="
echo ""
echo "Frontend will be available at:"
echo "  • http://localhost:3000"
echo ""
echo "Make sure backend is running at:"
echo "  • http://localhost:8000"
echo ""
echo "Press Ctrl+C to stop the server"
echo "=================================================="
echo ""

# Start the development server
npm start
