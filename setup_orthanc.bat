@echo off
REM ============================================================================
REM Orthanc Setup Script for OHIF Viewer Integration
REM ============================================================================
REM This script downloads, installs, and configures Orthanc DICOM server
REM with DICOMweb plugin for seamless integration with OHIF Viewer.
REM
REM IMPORTANT: This script requires PowerShell and internet connectivity.
REM Run this script as Administrator for best results.
REM ============================================================================

echo.
echo ============================================================================
echo  Orthanc Setup for OHIF Viewer Integration
echo ============================================================================
echo.

REM ----------------------------------------------------------------------------
REM Step 1: Define Installation Directory
REM ----------------------------------------------------------------------------
set ORTHANC_HOME=C:\Orthanc-Local
echo [1/5] Setting installation directory to: %ORTHANC_HOME%
echo.

REM ----------------------------------------------------------------------------
REM Step 2: Download Orthanc Installer
REM ----------------------------------------------------------------------------
REM Using version 24.12.0 (stable, avoids known bugs in 25.5.0)
echo [2/5] Downloading Orthanc 24.12.0 installer (stable version)...
set ORTHANC_VERSION=24.12.0
set ORTHANC_URL=https://orthanc.uclouvain.be/downloads/windows-64/installers/OrthancInstaller-Win64-%ORTHANC_VERSION%.exe
set ORTHANC_INSTALLER=%TEMP%\OrthancInstaller.exe

powershell -Command "& {[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '%ORTHANC_URL%' -OutFile '%ORTHANC_INSTALLER%'}"

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to download Orthanc installer. Please check your internet connection.
    echo Attempted URL: %ORTHANC_URL%
    pause
    exit /b 1
)
echo Download complete: %ORTHANC_INSTALLER%
echo.

REM ----------------------------------------------------------------------------
REM Step 3: Run Installer Silently
REM ----------------------------------------------------------------------------
echo [3/5] Installing Orthanc to %ORTHANC_HOME%...
echo This may take a few minutes. Please wait...
echo.

REM Run the installer with silent mode and custom installation path
"%ORTHANC_INSTALLER%" /S /D=%ORTHANC_HOME%

REM Wait for installation to complete
timeout /t 10 /nobreak >nul

REM Verify installation
if not exist "%ORTHANC_HOME%\Orthanc.exe" (
    echo ERROR: Installation failed. Orthanc.exe not found.
    echo Please try running the installer manually: %ORTHANC_INSTALLER%
    pause
    exit /b 1
)

echo Installation complete.
echo.

REM Clean up installer
del "%ORTHANC_INSTALLER%"

REM ----------------------------------------------------------------------------
REM Step 4: Create Orthanc Configuration File
REM ----------------------------------------------------------------------------
echo [4/5] Creating Orthanc configuration file (orthanc.json)...

REM Backup existing config if present
if exist "%ORTHANC_HOME%\Configuration.json" (
    echo Backing up existing configuration...
    copy "%ORTHANC_HOME%\Configuration.json" "%ORTHANC_HOME%\Configuration.json.backup" >nul
)

REM Create the configuration file with proper JSON formatting
(
echo {
echo   "Name" : "OHIF-Orthanc",
echo   "DicomAet" : "ORTHANC",
echo   "RemoteAccessAllowed" : true,
echo   "AuthenticationEnabled" : false,
echo   "HttpPort" : 8042,
echo   "DicomPort" : 4242,
echo.
echo   "Plugins" : [
echo     "./Plugins"
echo   ],
echo.
echo   "DicomWeb" : {
echo     "Enable" : true,
echo     "Root" : "/dicom-web/",
echo     "EnableWado" : true,
echo     "WadoRoot" : "/wado",
echo     "Host" : "0.0.0.0",
echo     "Ssl" : false,
echo.
echo     "StudiesMetadata" : "Full",
echo     "SeriesMetadata" : "Full",
echo.
echo     "QidoMaxInstances" : 100000,
echo     "StowMaxInstances" : 10,
echo     "StowMaxSize" : 2147483648,
echo.
echo     "AllowUnsecureAccess" : true,
echo.
echo     "Headers" : {
echo       "Access-Control-Allow-Origin" : "*",
echo       "Access-Control-Allow-Methods" : "GET, POST, PUT, DELETE, OPTIONS",
echo       "Access-Control-Allow-Headers" : "DNT,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization",
echo       "Access-Control-Expose-Headers" : "Content-Length,Content-Range"
echo     }
echo   },
echo.
echo   "HttpServerEnabled" : true,
echo   "HttpDescribeErrors" : true,
echo   "HttpCompressionEnabled" : true,
echo   "HttpRequestTimeout" : 60,
echo.
echo   "StorageDirectory" : "./OrthancStorage",
echo   "IndexDirectory" : "./OrthancDatabase",
echo.
echo   "SaveJobs" : true,
echo   "JobsHistorySize" : 1000,
echo.
echo   "ConcurrentJobs" : 2,
echo.
echo   "OverwriteInstances" : false,
echo.
echo   "DicomScuTimeout" : 10,
echo   "DicomScpTimeout" : 30,
echo.
echo   "MaximumStorageSize" : 0,
echo   "MaximumPatientCount" : 0,
echo.
echo   "LuaScripts" : []
echo }
) > "%ORTHANC_HOME%\Configuration.json"

echo Configuration file created successfully.
echo.
echo CRITICAL SETTINGS CONFIGURED:
echo   - DICOMweb enabled with Full metadata support
echo   - CORS enabled for OHIF access
echo   - StudiesMetadata: Full (required for 3D volumes)
echo   - SeriesMetadata: Full (required for complete metadata)
echo   - HTTP Port: 8042
echo   - DICOM Port: 4242
echo.

REM ----------------------------------------------------------------------------
REM Step 5: Create Start Script
REM ----------------------------------------------------------------------------
echo [5/5] Creating start script (start_orthanc.bat)...

(
echo @echo off
echo echo Starting Orthanc DICOM Server...
echo echo.
echo echo Web Interface: http://localhost:8042
echo echo DICOMweb Root: http://localhost:8042/dicom-web/
echo echo.
echo cd /d "%ORTHANC_HOME%"
echo start "Orthanc Server" Orthanc.exe Configuration.json
echo echo.
echo echo Orthanc is starting in a new window...
echo echo You can access the web interface at: http://localhost:8042
echo echo.
echo pause
) > "%ORTHANC_HOME%\start_orthanc.bat"

echo Start script created: %ORTHANC_HOME%\start_orthanc.bat
echo.

REM ----------------------------------------------------------------------------
REM Installation Complete
REM ----------------------------------------------------------------------------
echo ============================================================================
echo  Installation Complete!
echo ============================================================================
echo.
echo Orthanc has been installed to: %ORTHANC_HOME%
echo.
echo NEXT STEPS:
echo   1. Navigate to: %ORTHANC_HOME%
echo   2. Run: start_orthanc.bat
echo   3. Access web interface: http://localhost:8042
echo   4. Upload DICOM files via the web interface
echo   5. Configure OHIF to connect to: http://localhost:8042/dicom-web/
echo.
echo IMPORTANT NOTES:
echo   - DICOMweb is configured with FULL metadata support
echo   - CORS is enabled for OHIF integration
echo   - No authentication is required (for local development)
echo   - Default ports: HTTP=8042, DICOM=4242
echo   - Configuration file: %ORTHANC_HOME%\Configuration.json
echo.
echo For production use, consider enabling authentication and HTTPS.
echo.
echo ============================================================================
pause

REM Optional: Ask if user wants to start Orthanc now
echo.
set /p START_NOW="Would you like to start Orthanc now? (Y/N): "
if /i "%START_NOW%"=="Y" (
    echo.
    echo Starting Orthanc...
    cd /d "%ORTHANC_HOME%"
    start "Orthanc Server" Orthanc.exe Configuration.json
    echo.
    echo Orthanc is running. Access the web interface at: http://localhost:8042
    echo.
)

echo.
echo Setup complete. You can close this window.
pause
