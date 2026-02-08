@echo off
cd /d "%~dp0"
python "package-generator.py"
if %errorlevel% neq 0 (
    echo.
    echo An error occurred while running the generator.
    echo Please make sure Python is installed and added to your PATH.
    echo.
    pause
)
