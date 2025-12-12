# SCORM Template Verification Test
# This script verifies the structure and content of the scorm-template directory

Write-Host "=== SCORM Template Structure Verification ===" -ForegroundColor Cyan
Write-Host ""

$baseDir = "scorm-template"
$testsPassed = 0
$testsFailed = 0

# Test 1: Verify scorm-template directory exists
Write-Host "Test 1: Checking if scorm-template directory exists..." -NoNewline
if (Test-Path $baseDir -PathType Container) {
    Write-Host " PASS" -ForegroundColor Green
    $testsPassed++
} else {
    Write-Host " FAIL" -ForegroundColor Red
    $testsFailed++
}

# Test 2: Verify required files exist
$requiredFiles = @(
    "imsmanifest.xml",
    "index.html",
    "css/styles.css",
    "js/scorm-handler.js",
    "js/message-bridge.js"
)

Write-Host ""
Write-Host "Test 2: Checking required files..." -ForegroundColor Yellow
foreach ($file in $requiredFiles) {
    $filePath = Join-Path $baseDir $file
    Write-Host "  - $file..." -NoNewline
    if (Test-Path $filePath -PathType Leaf) {
        Write-Host " PASS" -ForegroundColor Green
        $testsPassed++
    } else {
        Write-Host " FAIL" -ForegroundColor Red
        $testsFailed++
    }
}

# Test 3: Verify {{CASE_URL}} placeholder exists in index.html
Write-Host ""
Write-Host "Test 3: Checking for {{CASE_URL}} placeholder in index.html..." -NoNewline
$indexPath = Join-Path $baseDir "index.html"
if (Test-Path $indexPath) {
    $content = Get-Content $indexPath -Raw
    if ($content -match '\{\{CASE_URL\}\}') {
        Write-Host " PASS" -ForegroundColor Green
        $testsPassed++
    } else {
        Write-Host " FAIL (placeholder not found)" -ForegroundColor Red
        $testsFailed++
    }
} else {
    Write-Host " FAIL (file not found)" -ForegroundColor Red
    $testsFailed++
}

# Test 4: Verify iframe has correct ID and allow attribute
Write-Host ""
Write-Host "Test 4: Checking iframe configuration in index.html..." -NoNewline
if (Test-Path $indexPath) {
    $content = Get-Content $indexPath -Raw
    $hasCorrectId = $content -match 'id="ohif-viewer"'
    $hasAllowAttr = $content -match 'allow="camera; microphone; fullscreen"'
    
    if ($hasCorrectId -and $hasAllowAttr) {
        Write-Host " PASS" -ForegroundColor Green
        $testsPassed++
    } else {
        Write-Host " FAIL" -ForegroundColor Red
        if (-not $hasCorrectId) { Write-Host "    - Missing id='ohif-viewer'" -ForegroundColor Red }
        if (-not $hasAllowAttr) { Write-Host "    - Missing allow attribute" -ForegroundColor Red }
        $testsFailed++
    }
} else {
    Write-Host " FAIL (file not found)" -ForegroundColor Red
    $testsFailed++
}

# Test 5: Verify imsmanifest.xml contains SCORM 1.2 schema
Write-Host ""
Write-Host "Test 5: Checking SCORM 1.2 schema in imsmanifest.xml..." -NoNewline
$manifestPath = Join-Path $baseDir "imsmanifest.xml"
if (Test-Path $manifestPath) {
    $content = Get-Content $manifestPath -Raw
    if ($content -match '<schemaversion>1\.2</schemaversion>') {
        Write-Host " PASS" -ForegroundColor Green
        $testsPassed++
    } else {
        Write-Host " FAIL (SCORM 1.2 schema not found)" -ForegroundColor Red
        $testsFailed++
    }
} else {
    Write-Host " FAIL (file not found)" -ForegroundColor Red
    $testsFailed++
}

# Test 6: Verify CSS file is not empty
Write-Host ""
Write-Host "Test 6: Checking if styles.css has content..." -NoNewline
$cssPath = Join-Path $baseDir "css/styles.css"
if (Test-Path $cssPath) {
    $content = Get-Content $cssPath -Raw
    if ($content.Length -gt 100) {
        Write-Host " PASS" -ForegroundColor Green
        $testsPassed++
    } else {
        Write-Host " FAIL (file appears empty or too small)" -ForegroundColor Red
        $testsFailed++
    }
} else {
    Write-Host " FAIL (file not found)" -ForegroundColor Red
    $testsFailed++
}

# Summary
Write-Host ""
Write-Host "=== Test Summary ===" -ForegroundColor Cyan
Write-Host "Tests Passed: $testsPassed" -ForegroundColor Green
Write-Host "Tests Failed: $testsFailed" -ForegroundColor Red
Write-Host ""

if ($testsFailed -eq 0) {
    Write-Host "[PASS] All tests passed! SCORM template structure is valid." -ForegroundColor Green
    exit 0
} else {
    Write-Host "[FAIL] Some tests failed. Please review the errors above." -ForegroundColor Red
    exit 1
}
