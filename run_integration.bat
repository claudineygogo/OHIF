@echo off
setlocal EnableDelayedExpansion

echo ============================================================================
echo  OHIF + Orthanc Integration Launcher
echo ============================================================================
echo.

REM ----------------------------------------------------------------------------
REM 1. Check Orthanc Installation
REM ----------------------------------------------------------------------------
echo [1/3] Checking Orthanc Installation...
if not exist "C:\Orthanc-Local\Orthanc.exe" (
    echo    X Orthanc not found at C:\Orthanc-Local
    echo.
    echo    ACTION REQUIRED:
    echo    You need to install Orthanc first.
    echo    Running setup script now...
    echo.
    call setup_orthanc.bat

    if not exist "C:\Orthanc-Local\Orthanc.exe" (
        echo.
        echo    ERROR: Installation seemed to fail or was cancelled.
        echo    Please run 'setup_orthanc.bat' manually.
        pause
        exit /b 1
    )
) else (
    echo    OK: Orthanc found at C:\Orthanc-Local
)
echo.

REM ----------------------------------------------------------------------------
REM 2. Check Orthanc Configuration
REM ----------------------------------------------------------------------------
echo [2/3] Verifying Orthanc Configuration...
findstr /C:"StudiesMetadata" "C:\Orthanc-Local\Configuration.json" >nul
if %ERRORLEVEL% NEQ 0 (
    echo    WARNING: 'StudiesMetadata' not found in configuration.
    echo    This is required for segmentation tools.
    echo    Please check C:\Orthanc-Local\Configuration.json
) else (
    echo    OK: Configuration looks correct (Full Metadata enabled)
)
echo.

REM ----------------------------------------------------------------------------
REM 3. Start Services
REM ----------------------------------------------------------------------------
echo [3/3] Starting Services...

echo.
echo    A. Starting Orthanc Server...
echo    (This will open in a new window)
start "Orthanc Server" /D "C:\Orthanc-Local" start_orthanc.bat

echo.
echo    Waiting 5 seconds for Orthanc to initialize...
timeout /t 5 /nobreak >nul

echo.
echo    B. Starting OHIF Viewer...
echo    (This will take a minute to compile)
echo.
echo    Command: yarn run dev:orthanc-enhanced
echo.
echo    ----------------------------------------------------------------
echo    INSTRUCTIONS:
echo    1. Wait for OHIF to compile (look for "webpack compiled successfully")
echo    2. Open http://localhost:3000 in your browser
echo    3. If you see the demo database, use:
echo       http://localhost:3000/?configUrl=/config/orthanc-enhanced.js
echo    ----------------------------------------------------------------
echo.

cd /d "%~dp0"
call yarn run dev:orthanc-enhanced

pause
