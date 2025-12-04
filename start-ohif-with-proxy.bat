@echo off
echo ========================================
echo Starting OHIF with Orthanc CORS Proxy
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo [1/3] Starting Orthanc CORS Proxy on port 8043...
start "Orthanc CORS Proxy" cmd /k "node orthanc-cors-proxy.js"

echo [2/3] Waiting for proxy to start...
timeout /t 3 /nobreak > nul

echo [3/3] Starting OHIF Viewer on port 3000...
start "OHIF Viewer" cmd /k "npm run dev"

echo.
echo ========================================
echo Services Started Successfully!
echo ========================================
echo.
echo CORS Proxy:  http://localhost:8043
echo OHIF Viewer: http://localhost:3000
echo Orthanc:     http://localhost:8042
echo.
echo The OHIF viewer will open in your browser shortly.
echo Both services are running in separate windows.
echo Close those windows to stop the services.
echo ========================================
echo.
pause
