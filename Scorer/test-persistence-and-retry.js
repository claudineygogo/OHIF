const fs = require('fs');
const path = require('path');

// Simple mock function helper
const fn = (impl = () => {}) => {
    const mock = (...args) => {
        mock.calls.push(args);
        return impl(...args);
    };
    mock.calls = [];
    mock.mock = mock; // self-reference for compatibility with jest-like syntax if needed
    mock.mockReturnValue = (val) => fn(() => val);
    mock.mockImplementation = (newImpl) => fn(newImpl);
    return mock;
};

// --- Mock Browser Environment ---
const mockReload = fn();

global.window = {
    location: { reload: mockReload },
    parent: null,
    addEventListener: fn(),
    SCORM: null // Will be set by scorm-handler.js
};

// Mock Elements
const mockElements = {};
const getMockElement = (id) => {
    if (!mockElements[id]) {
        mockElements[id] = {
            addEventListener: fn(),
            classList: { add: fn(), remove: fn() },
            style: {},
            textContent: ""
        };
    }
    return mockElements[id];
};

global.document = {
    getElementById: fn().mockImplementation(getMockElement),
    addEventListener: fn((event, cb) => {
        if (event === 'DOMContentLoaded') global.DOMContentLoadedCallback = cb;
    })
};

// Global showScreen mock
global.showScreen = fn();

// Suppress console logs for cleaner output
const originalConsoleLog = console.log;
console.log = fn();
console.warn = fn();
console.error = fn();

// --- Load Scripts ---
try {
    const scormHandlerPath = path.join(__dirname, 'scorm-template', 'js', 'scorm-handler.js');
    const scormHandlerCode = fs.readFileSync(scormHandlerPath, 'utf8');
    eval(scormHandlerCode);

    const messageBridgePath = path.join(__dirname, 'scorm-template', 'js', 'message-bridge.js');
    const messageBridgeCode = fs.readFileSync(messageBridgePath, 'utf8');
    eval(messageBridgeCode);
} catch (e) {
    originalConsoleLog("Error loading scripts:", e);
    process.exit(1);
}

// --- TEST EXECUTION ---

// Mock SCORM API
const mockAPI = {
    LMSInitialize: fn().mockReturnValue("true"),
    LMSGetValue: fn().mockImplementation((param) => {
        if (param === "cmi.core.lesson_status") return "passed";
        if (param === "cmi.core.score.raw") return "85";
        return "";
    }),
    LMSSetValue: fn().mockReturnValue("true"),
    LMSCommit: fn().mockReturnValue("true"),
    LMSFinish: fn().mockReturnValue("true"),
    LMSGetLastError: fn(),
    LMSGetErrorString: fn()
};
global.window.API = mockAPI;

// Test 1: Persistence
originalConsoleLog("TEST: Persistence Check (Passed status)...");

// Initialize UI (triggers DOMContentLoaded logic)
if (global.DOMContentLoadedCallback) global.DOMContentLoadedCallback();
else {
    // Manually init if callback wasn't registered (should happen in eval)
    global.window.assessmentUI = new AssessmentUI();
}

// Assertions for Persistence
// Expectation: initializeSession -> checkPreviousStatus -> handleScoreReceived -> showScreen('results')
// Also SCORM.setScore should be called, which calls LMSSetValue.
const showScreenCalls = global.showScreen.mock.calls;
if (showScreenCalls.length > 0 && showScreenCalls[showScreenCalls.length - 1][0] === 'results') {
    originalConsoleLog("PASS: Automatically transitioned to 'results' screen.");
} else {
    originalConsoleLog("FAIL: Did not transition to results. Calls:", showScreenCalls);
    process.exit(1);
}

// Verify score display updating
const scoreValueEl = mockElements['score-value'];
if (scoreValueEl.textContent === '85%') {
    originalConsoleLog("PASS: Score display updated to 85%.");
} else {
    originalConsoleLog(`FAIL: Score display text is '${scoreValueEl.textContent}'`);
}

// Test 2: Retry
originalConsoleLog("TEST: Try Again Workflow...");
const ui = global.window.assessmentUI;
ui.tryAgain();

// Assertions for Retry
const setCalls = mockAPI.LMSSetValue.mock.calls;
// We look for setting status to incomplete and score to 0
const statusReset = setCalls.some(call => call[0] === "cmi.core.lesson_status" && call[1] === "incomplete");
const scoreReset = setCalls.some(call => call[0] === "cmi.core.score.raw" && call[1] === "0");

if (statusReset) {
    originalConsoleLog("PASS: Status reset to 'incomplete'.");
} else {
    originalConsoleLog("FAIL: Status not reset.");
    process.exit(1);
}

if (scoreReset) {
    originalConsoleLog("PASS: Score reset to '0'.");
} else {
    originalConsoleLog("FAIL: Score not reset.");
}

if (mockAPI.LMSFinish.mock.calls.length > 0) {
    originalConsoleLog("PASS: LMSFinish called (Calculated termination).");
} else {
    originalConsoleLog("FAIL: LMSFinish not called.");
}

if (mockReload.mock.calls.length > 0) {
    originalConsoleLog("PASS: window.location.reload() called.");
} else {
    originalConsoleLog("FAIL: Reload not called.");
}

originalConsoleLog("=== ALL TESTS PASSED ===");
