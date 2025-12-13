#!/bin/bash

# ============================================
# DJAWARA HVAC - Quick Setup Script
# Run this script to set up the project
# ============================================

echo "🚀 Djawara HVAC Platform - Quick Setup"
echo "======================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null
then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo ""

# Check if npm is installed
if ! command -v npm &> /dev/null
then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ npm version: $(npm --version)"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
echo "This may take a few minutes..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo ""
echo "✅ Dependencies installed successfully"
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "⚠️  .env.local not found"
    echo "📝 Creating .env.local from template..."
    cp .env.local.example .env.local
    echo "✅ .env.local created"
    echo ""
    echo "⚠️  IMPORTANT: Edit .env.local and add your Supabase credentials:"
    echo "   - NEXT_PUBLIC_SUPABASE_ANON_KEY"
    echo ""
else
    echo "✅ .env.local already exists"
    echo ""
fi

# Check if we can build
echo "🔨 Testing build..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please check errors above."
    exit 1
fi

echo ""
echo "✅ Build successful!"
echo ""

echo "======================================"
echo "✅ Setup Complete!"
echo "======================================"
echo ""
echo "Next steps:"
echo "1. Edit .env.local with your Supabase anon key"
echo "2. Run: npm run dev"
echo "3. Open: http://localhost:3000"
echo ""
echo "For deployment instructions, see DEPLOYMENT.md"
echo ""
