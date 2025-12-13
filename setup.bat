@echo off
REM ============================================
REM DJAWARA HVAC - Quick Setup Script (Windows)
REM Run this script to set up the project
REM ============================================

echo.
echo ========================================
echo DJAWARA HVAC Platform - Quick Setup
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo X Node.js is not installed. Please install Node.js 18+ first.
    pause
    exit /b 1
)

echo + Node.js version:
node --version
echo.

REM Check if npm is installed
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo X npm is not installed. Please install npm first.
    pause
    exit /b 1
)

echo + npm version:
npm --version
echo.

REM Install dependencies
echo ======================================
echo Installing dependencies...
echo This may take a few minutes...
echo ======================================
call npm install

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo X Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo + Dependencies installed successfully
echo.

REM Check if .env.local exists
if not exist .env.local (
    echo ! .env.local not found
    echo Creating .env.local from template...
    copy .env.local.example .env.local
    echo + .env.local created
    echo.
    echo ! IMPORTANT: Edit .env.local and add your Supabase credentials:
    echo    - NEXT_PUBLIC_SUPABASE_ANON_KEY
    echo.
) else (
    echo + .env.local already exists
    echo.
)

REM Test build
echo ======================================
echo Testing build...
echo ======================================
call npm run build

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo X Build failed. Please check errors above.
    pause
    exit /b 1
)

echo.
echo + Build successful!
echo.

echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Edit .env.local with your Supabase anon key
echo 2. Run: npm run dev
echo 3. Open: http://localhost:3000
echo.
echo For deployment instructions, see DEPLOYMENT.md
echo.
pause
