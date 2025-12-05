@echo off
:: Check if we are running as Administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo Requesting administrative privileges...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

:: Change directory to the script's location
cd /d "%~dp0"

echo ==================================================
echo      STARTING ORTHANC + OHIF SYSTEM
echo ==================================================

echo.
echo [1/3] Starting Orthanc Service...
net start orthanc
if %errorlevel% equ 0 (
    echo Orthanc Service started successfully.
) else (
    echo Service might already be running or failed. Continuing...
)
echo.

echo [2/3] Starting CORS Proxy (Port 8043)...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed!
    pause
    exit /b
)
start "Orthanc CORS Proxy" cmd /k "node orthanc-cors-proxy.js"

echo [3/3] Starting OHIF Viewer (Port 3000)...
start "OHIF Viewer" cmd /k "npm run dev"

echo.
echo ==================================================
echo      ALL SYSTEMS LAUNCHED
echo ==================================================
echo.
echo 1. Orthanc Service: Running in background
echo 2. CORS Proxy:      Running in new window
echo 3. OHIF Viewer:     Running in new window
echo.
echo You may close this window.
pause
