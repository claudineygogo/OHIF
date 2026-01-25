# PowerShell script to test the /grade_submission endpoint

$url = "http://localhost:5000/grade_submission"
$body = @{
    test = "data"
} | ConvertTo-Json

Write-Host "============================================================"
Write-Host "Testing /grade_submission endpoint with PowerShell"
Write-Host "============================================================"
Write-Host "URL: $url"
Write-Host "Method: POST"
Write-Host "Body: $body"
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri $url -Method Post -Body $body -ContentType "application/json"
    
    Write-Host "[SUCCESS] Response received:"
    Write-Host "Dice Score: $($response.dice_score)"
    Write-Host ""
    Write-Host "Full Response:"
    $response | ConvertTo-Json
} catch {
    Write-Host "[ERROR] Request failed:"
    Write-Host $_.Exception.Message
}

Write-Host "============================================================"
