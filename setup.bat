@echo off
echo 🚀 Starting Health Sphere Setup for Windows...

:: 1. Root Dependencies
echo 📦 Installing root-level dependencies...
call npm install

:: 2. Backend Setup
echo 🐍 Setting up Backend (Django)...
cd backend
if not exist venv (
    echo    Creating virtual environment...
    python -m venv venv
)

echo    Installing Python requirements...
call venv\Scripts\activate.bat && pip install --upgrade pip && pip install -r requirements.txt
cd ..

:: 3. Frontend Setup
echo ⚛️ Setting up Frontend (React)...
cd frontend
echo    Installing npm packages...
call npm install
cd ..

echo ✅ Setup Complete!
echo 👉 You can now run the project using: npm run dev
pause
