@echo off
echo Starting Chamber Finance Tracker...
echo.

node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed!
    echo Please run setup.bat first to install Node.js and dependencies.
    pause
    exit /b 1
)

echo Starting application...
npm start

if %errorlevel% neq 0 (
    echo.
    echo ERROR: Failed to start application!
    echo Please run setup.bat first to install dependencies.
    pause
    exit /b 1
)


