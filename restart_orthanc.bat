@echo off
echo Restarting Orthanc service to apply CORS configuration changes...
echo.

net stop Orthanc
if %errorlevel% neq 0 (
    echo Failed to stop Orthanc service. Make sure you run this script as Administrator.
    pause
    exit /b 1
)

echo Orthanc service stopped successfully.
echo.

timeout /t 2 /nobreak > nul

net start Orthanc
if %errorlevel% neq 0 (
    echo Failed to start Orthanc service.
    pause
    exit /b 1
)

echo.
echo Orthanc service restarted successfully!
echo CORS is now enabled for OHIF integration.
echo.
pause
