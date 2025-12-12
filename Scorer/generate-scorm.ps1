$ScriptPath = Join-Path $PSScriptRoot "package-generator.py"

# Try to find python
if (Get-Command "python" -ErrorAction SilentlyContinue) {
    Start-Process -FilePath "python" -ArgumentList "`"$ScriptPath`"" -NoNewWindow -Wait
}
elseif (Get-Command "python3" -ErrorAction SilentlyContinue) {
    Start-Process -FilePath "python3" -ArgumentList "`"$ScriptPath`"" -NoNewWindow -Wait
}
else {
    Write-Host "Python not found. Please ensure Python is installed and added to PATH."
    Read-Host "Press Enter to exit"
}
