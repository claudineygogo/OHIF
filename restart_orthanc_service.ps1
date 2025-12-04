Start-Process powershell -Verb RunAs -ArgumentList "-NoProfile -ExecutionPolicy Bypass -Command `"Restart-Service Orthanc; Write-Host 'Orthanc Service Restarted'; Start-Sleep -Seconds 5`""
