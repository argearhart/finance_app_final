@echo off
echo Chamber Finance Tracker - Setup Script
echo =====================================
echo.

echo Checking if Node.js is installed...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed!
    echo.
    echo Please install Node.js from: https://nodejs.org/
    echo Choose the LTS version for Windows.
    echo.
    echo After installing Node.js, run this script again.
    pause
    exit /b 1
)

echo Node.js is installed. Version:
node --version

echo.
echo Installing dependencies...
npm install

if %errorlevel% neq 0 (
    echo.
    echo ERROR: Failed to install dependencies!
    echo Please check your internet connection and try again.
    pause
    exit /b 1
)

echo.
echo Dependencies installed successfully!
echo.
echo To start the application, run: npm start
echo.
pause
