# SCORM JavaScript Implementation Verification Test
# This script verifies the content and logic of the SCORM handler and message bridge

Write-Host "=== SCORM JavaScript Implementation Verification ===" -ForegroundColor Cyan
Write-Host ""

$testsPassed = 0
$testsFailed = 0

# Test 1: Verify scorm-handler.js exists and has required methods
Write-Host "Test 1: Checking scorm-handler.js structure..." -ForegroundColor Yellow
$scormHandlerPath = "scorm-template/js/scorm-handler.js"

if (Test-Path $scormHandlerPath) {
    $content = Get-Content $scormHandlerPath -Raw
    
    $requiredMethods = @(
        'findScormAPI',
        'initialize',
        'setValue',
        'getValue',
        'commit',
        'setScore',
        'terminate'
    )
    
    $allMethodsFound = $true
    foreach ($method in $requiredMethods) {
        if ($content -match $method) {
            Write-Host "  - Method '$method' found" -NoNewline -ForegroundColor Gray
            Write-Host " PASS" -ForegroundColor Green
        }
        else {
            Write-Host "  - Method '$method' NOT found" -NoNewline -ForegroundColor Gray
            Write-Host " FAIL" -ForegroundColor Red
            $allMethodsFound = $false
        }
    }
    
    if ($allMethodsFound) {
        $testsPassed++
    }
    else {
        $testsFailed++
    }
}
else {
    Write-Host "  scorm-handler.js not found" -ForegroundColor Red
    $testsFailed++
}

# Test 2: Verify ScormHandler class and global instance
Write-Host ""
Write-Host "Test 2: Checking ScormHandler class and global instance..." -ForegroundColor Yellow

if (Test-Path $scormHandlerPath) {
    $content = Get-Content $scormHandlerPath -Raw
    
    $hasClass = $content -match 'class ScormHandler'
    $hasGlobalInstance = $content -match 'window\.SCORM\s*=\s*new ScormHandler'
    
    if ($hasClass) {
        Write-Host "  - ScormHandler class defined" -NoNewline -ForegroundColor Gray
        Write-Host " PASS" -ForegroundColor Green
    }
    else {
        Write-Host "  - ScormHandler class NOT defined" -NoNewline -ForegroundColor Gray
        Write-Host " FAIL" -ForegroundColor Red
    }
    
    if ($hasGlobalInstance) {
        Write-Host "  - Global SCORM instance created" -NoNewline -ForegroundColor Gray
        Write-Host " PASS" -ForegroundColor Green
    }
    else {
        Write-Host "  - Global SCORM instance NOT created" -NoNewline -ForegroundColor Gray
        Write-Host " FAIL" -ForegroundColor Red
    }
    
    if ($hasClass -and $hasGlobalInstance) {
        $testsPassed++
    }
    else {
        $testsFailed++
    }
}
else {
    $testsFailed++
}

# Test 3: Verify setScore logic (70% threshold)
Write-Host ""
Write-Host "Test 3: Checking setScore method logic..." -ForegroundColor Yellow

if (Test-Path $scormHandlerPath) {
    $content = Get-Content $scormHandlerPath -Raw
    
    # Check for score setting
    $setsRawScore = $content -match "setValue\('cmi\.core\.score\.raw'"
    $setsMinScore = $content -match "setValue\('cmi\.core\.score\.min'"
    $setsMaxScore = $content -match "setValue\('cmi\.core\.score\.max'"
    
    # Check for 70% threshold
    $has70Threshold = $content -match '70'
    $hasPassedStatus = $content -match "'passed'"
    $hasFailedStatus = $content -match "'failed'"
    
    if ($setsRawScore) {
        Write-Host "  - Sets cmi.core.score.raw" -NoNewline -ForegroundColor Gray
        Write-Host " PASS" -ForegroundColor Green
    }
    else {
        Write-Host "  - Does NOT set cmi.core.score.raw" -NoNewline -ForegroundColor Gray
        Write-Host " FAIL" -ForegroundColor Red
    }
    
    if ($setsMinScore) {
        Write-Host "  - Sets cmi.core.score.min" -NoNewline -ForegroundColor Gray
        Write-Host " PASS" -ForegroundColor Green
    }
    else {
        Write-Host "  - Does NOT set cmi.core.score.min" -NoNewline -ForegroundColor Gray
        Write-Host " FAIL" -ForegroundColor Red
    }
    
    if ($setsMaxScore) {
        Write-Host "  - Sets cmi.core.score.max" -NoNewline -ForegroundColor Gray
        Write-Host " PASS" -ForegroundColor Green
    }
    else {
        Write-Host "  - Does NOT set cmi.core.score.max" -NoNewline -ForegroundColor Gray
        Write-Host " FAIL" -ForegroundColor Red
    }
    
    if ($has70Threshold) {
        Write-Host "  - Has 70% pass threshold" -NoNewline -ForegroundColor Gray
        Write-Host " PASS" -ForegroundColor Green
    }
    else {
        Write-Host "  - Missing 70% pass threshold" -NoNewline -ForegroundColor Gray
        Write-Host " FAIL" -ForegroundColor Red
    }
    
    if ($hasPassedStatus -and $hasFailedStatus) {
        Write-Host "  - Sets passed/failed status" -NoNewline -ForegroundColor Gray
        Write-Host " PASS" -ForegroundColor Green
    }
    else {
        Write-Host "  - Missing passed/failed status logic" -NoNewline -ForegroundColor Gray
        Write-Host " FAIL" -ForegroundColor Red
    }
    
    if ($setsRawScore -and $setsMinScore -and $setsMaxScore -and $has70Threshold -and $hasPassedStatus -and $hasFailedStatus) {
        $testsPassed++
    }
    else {
        $testsFailed++
    }
}
else {
    $testsFailed++
}

# Test 4: Verify message-bridge.js exists and has required methods
Write-Host ""
Write-Host "Test 4: Checking message-bridge.js structure..." -ForegroundColor Yellow
$messageBridgePath = "scorm-template/js/message-bridge.js"

if (Test-Path $messageBridgePath) {
    $content = Get-Content $messageBridgePath -Raw
    
    $requiredMethods = @(
        'setupMessageListener',
        'startAssessment',
        'handleScoreReceived',
        'returnToCourse'
    )
    
    $allMethodsFound = $true
    foreach ($method in $requiredMethods) {
        if ($content -match $method) {
            Write-Host "  - Method '$method' found" -NoNewline -ForegroundColor Gray
            Write-Host " PASS" -ForegroundColor Green
        }
        else {
            Write-Host "  - Method '$method' NOT found" -NoNewline -ForegroundColor Gray
            Write-Host " FAIL" -ForegroundColor Red
            $allMethodsFound = $false
        }
    }
    
    if ($allMethodsFound) {
        $testsPassed++
    }
    else {
        $testsFailed++
    }
}
else {
    Write-Host "  message-bridge.js not found" -ForegroundColor Red
    $testsFailed++
}

# Test 5: Verify AssessmentUI class and global instance
Write-Host ""
Write-Host "Test 5: Checking AssessmentUI class and global instance..." -ForegroundColor Yellow

if (Test-Path $messageBridgePath) {
    $content = Get-Content $messageBridgePath -Raw
    
    $hasClass = $content -match 'class AssessmentUI'
    $hasGlobalInstance = $content -match 'window\.assessmentUI\s*=\s*new AssessmentUI'
    
    if ($hasClass) {
        Write-Host "  - AssessmentUI class defined" -NoNewline -ForegroundColor Gray
        Write-Host " PASS" -ForegroundColor Green
    }
    else {
        Write-Host "  - AssessmentUI class NOT defined" -NoNewline -ForegroundColor Gray
        Write-Host " FAIL" -ForegroundColor Red
    }
    
    if ($hasGlobalInstance) {
        Write-Host "  - Global assessmentUI instance created" -NoNewline -ForegroundColor Gray
        Write-Host " PASS" -ForegroundColor Green
    }
    else {
        Write-Host "  - Global assessmentUI instance NOT created" -NoNewline -ForegroundColor Gray
        Write-Host " FAIL" -ForegroundColor Red
    }
    
    if ($hasClass -and $hasGlobalInstance) {
        $testsPassed++
    }
    else {
        $testsFailed++
    }
}
else {
    $testsFailed++
}

# Test 6: Verify postMessage listener for SCORE_SUBMITTED
Write-Host ""
Write-Host "Test 6: Checking postMessage listener..." -ForegroundColor Yellow

if (Test-Path $messageBridgePath) {
    $content = Get-Content $messageBridgePath -Raw
    
    $hasMessageListener = $content -match "addEventListener\('message'"
    $checksScoreSubmitted = $content -match 'SCORE_SUBMITTED'
    
    if ($hasMessageListener) {
        Write-Host "  - Message event listener added" -NoNewline -ForegroundColor Gray
        Write-Host " PASS" -ForegroundColor Green
    }
    else {
        Write-Host "  - Message event listener NOT added" -NoNewline -ForegroundColor Gray
        Write-Host " FAIL" -ForegroundColor Red
    }
    
    if ($checksScoreSubmitted) {
        Write-Host "  - Checks for SCORE_SUBMITTED event" -NoNewline -ForegroundColor Gray
        Write-Host " PASS" -ForegroundColor Green
    }
    else {
        Write-Host "  - Does NOT check for SCORE_SUBMITTED" -NoNewline -ForegroundColor Gray
        Write-Host " FAIL" -ForegroundColor Red
    }
    
    if ($hasMessageListener -and $checksScoreSubmitted) {
        $testsPassed++
    }
    else {
        $testsFailed++
    }
}
else {
    $testsFailed++
}

# Test 7: Verify {{CASE_URL}} placeholder retention
Write-Host ""
Write-Host "Test 7: Checking {{CASE_URL}} placeholder..." -ForegroundColor Yellow

if (Test-Path $messageBridgePath) {
    $content = Get-Content $messageBridgePath -Raw
    
    if ($content -match '\{\{CASE_URL\}\}') {
        Write-Host "  - {{CASE_URL}} placeholder retained" -NoNewline -ForegroundColor Gray
        Write-Host " PASS" -ForegroundColor Green
        $testsPassed++
    }
    else {
        Write-Host "  - {{CASE_URL}} placeholder NOT found" -NoNewline -ForegroundColor Gray
        Write-Host " FAIL" -ForegroundColor Red
        $testsFailed++
    }
}
else {
    $testsFailed++
}

# Test 8: Verify SCORM.setScore is called in handleScoreReceived
Write-Host ""
Write-Host "Test 8: Checking score handling integration..." -ForegroundColor Yellow

if (Test-Path $messageBridgePath) {
    $content = Get-Content $messageBridgePath -Raw
    
    $callsSetScore = $content -match 'SCORM\.setScore'
    
    if ($callsSetScore) {
        Write-Host "  - Calls SCORM.setScore in handler" -NoNewline -ForegroundColor Gray
        Write-Host " PASS" -ForegroundColor Green
        $testsPassed++
    }
    else {
        Write-Host "  - Does NOT call SCORM.setScore" -NoNewline -ForegroundColor Gray
        Write-Host " FAIL" -ForegroundColor Red
        $testsFailed++
    }
}
else {
    $testsFailed++
}

# Test 9: Verify test harness exists
Write-Host ""
Write-Host "Test 9: Checking test harness..." -ForegroundColor Yellow

if (Test-Path "test-harness.html") {
    $content = Get-Content "test-harness.html" -Raw
    
    $hasMockAPI = $content -match 'window\.API'
    $hasTests = $content -match 'runTest'
    
    if ($hasMockAPI) {
        Write-Host "  - Mock SCORM API implemented" -NoNewline -ForegroundColor Gray
        Write-Host " PASS" -ForegroundColor Green
    }
    else {
        Write-Host "  - Mock SCORM API NOT found" -NoNewline -ForegroundColor Gray
        Write-Host " FAIL" -ForegroundColor Red
    }
    
    if ($hasTests) {
        Write-Host "  - Test functions implemented" -NoNewline -ForegroundColor Gray
        Write-Host " PASS" -ForegroundColor Green
    }
    else {
        Write-Host "  - Test functions NOT found" -NoNewline -ForegroundColor Gray
        Write-Host " FAIL" -ForegroundColor Red
    }
    
    if ($hasMockAPI -and $hasTests) {
        $testsPassed++
    }
    else {
        $testsFailed++
    }
}
else {
    Write-Host "  test-harness.html not found" -ForegroundColor Red
    $testsFailed++
}

# Summary
Write-Host ""
Write-Host "=== Test Summary ===" -ForegroundColor Cyan
Write-Host "Tests Passed: $testsPassed" -ForegroundColor Green
Write-Host "Tests Failed: $testsFailed" -ForegroundColor Red
Write-Host ""

if ($testsFailed -eq 0) {
    Write-Host "[PASS] All JavaScript implementation tests passed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Cyan
    Write-Host "1. Open test-harness.html in a browser" -ForegroundColor White
    Write-Host "2. Run the automated tests to verify SCORM functionality" -ForegroundColor White
    Write-Host "3. Check the SCORM Data Monitor for correct values" -ForegroundColor White
    exit 0
}
else {
    Write-Host "[FAIL] Some tests failed. Please review the errors above." -ForegroundColor Red
    exit 1
}
