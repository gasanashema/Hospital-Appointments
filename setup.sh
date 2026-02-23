#!/bin/bash

# Health Sphere - Unified Setup Script
# Automatically configures backend and frontend dependencies

echo "🚀 Starting Health Sphere Setup..."

# 1. Root Dependencies
echo "📦 Installing root-level dependencies..."
npm install

# 2. Backend Setup
echo "🐍 Setting up Backend (Django)..."
cd backend
if [ ! -d "venv" ]; then
    echo "   Creating virtual environment..."
    python3 -m venv venv
fi

echo "   Installing Python requirements..."
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
cd ..

# 3. Frontend Setup
echo "⚛️ Setting up Frontend (React)..."
cd frontend
echo "   Installing npm packages..."
npm install
cd ..

echo "✅ Setup Complete!"
echo "👉 You can now run the project using: npm run dev"
