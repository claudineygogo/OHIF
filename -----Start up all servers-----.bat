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
echo   STARTING ORTHANC + OHIF + SCORER SYSTEM
echo ==================================================

echo.
echo [1/5] Starting Orthanc Service...
net start orthanc
if %errorlevel% equ 0 (
    echo Orthanc Service started successfully.
) else (
    echo Service might already be running or failed. Continuing...
)
echo.

echo [2/5] Starting CORS Proxy (Port 8043)...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed!
    pause
    exit /b
)
start "Orthanc CORS Proxy" cmd /k "node orthanc-cors-proxy.js"

echo [3/5] Starting OHIF Viewer (Port 3000)...
start "OHIF Viewer" cmd /k "npm run dev"

echo [4/5] Starting Python Scorer Engine (Port 5002)...
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo WARNING: Python is not installed! Scorer will not start.
) else (
    start "Python Scorer" cmd /k "cd /d C:\Users\Claudiney\OHIF-Contest-Project\Scorer && python app.py"
)

echo [5/5] Starting Scorer CORS Proxy (Port 5001)...
start "Scorer CORS Proxy" cmd /k "node scorer-cors-proxy.js"


echo.
echo ==================================================
echo      ALL SYSTEMS LAUNCHED
echo ==================================================
echo.
echo 1. Orthanc Service:   Running in background
echo 2. CORS Proxy:        Running in new window (Port 8043)
echo 3. OHIF Viewer:       Running in new window (Port 3000)
echo 4. Python Scorer:     Running in new window (Port 5002)
echo 5. Scorer CORS Proxy: Running in new window (Port 5001)
echo.
echo You may close this window.
pause
