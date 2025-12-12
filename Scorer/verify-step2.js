const fs = require('fs');
const path = require('path');

// --- 1. Load the Code ---
const scormHandlerCode = fs.readFileSync(path.join(__dirname, 'scorm-template/js/scorm-handler.js'), 'utf8');
const messageBridgeCode = fs.readFileSync(path.join(__dirname, 'scorm-template/js/message-bridge.js'), 'utf8');

// --- 2. Setup Mock Browser Environment ---

// Mock Browser API
const window = {
    addEventListener: (event, callback) => {
        if (!window.listeners[event]) window.listeners[event] = [];
        window.listeners[event].push(callback);
    },
    listeners: {},
    postMessage: (data) => {}, // Stub
    parent: null,
    SCORM: null, // Will be set by code
    assessmentUI: null, // Will be set by code
    document: {
        getElementById: () => ({ addEventListener: () => {}, classList: { add:()=>{}, remove:()=>{} }, style: {} }),
        addEventListener: (event, callback) => {
             // Mock DOMContentLoaded immediately
             if (event === 'DOMContentLoaded') callback();
        }
    }
};

// Mock Document global
const document = window.document;

// Mock Console
const console = {
    log: (msg) => process.stdout.write(`[LOG] ${msg}\n`),
    error: (msg) => process.stdout.write(`[ERR] ${msg}\n`),
    warn: (msg) => process.stdout.write(`[WARN] ${msg}\n`)
};

// Mock SCORM API
const mockAPI = {
    data: {},
    LMSInitialize: () => "true",
    LMSSetValue: (k, v) => { mockAPI.data[k] = v; return "true"; },
    LMSGetValue: (k) => mockAPI.data[k] || "",
    LMSCommit: () => "true",
    LMSFinish: () => "true",
    LMSGetLastError: () => "0",
    LMSGetErrorString: () => ""
};

// Link API to window (simulate finding it in parent)
window.API = mockAPI;
window.parent = window; 

// --- 3. Execute the Code ---
try {
    // We use eval to execute in the context of our mocks
    // Note: In a real app we'd require() modules, but these are browser scripts.
    eval(scormHandlerCode);
    eval(messageBridgeCode);
    
    // Manually trigger the DOMContentLoaded callback if eval didn't catch it properly context-wise
    if (!window.assessmentUI) {
         // Create manually if the event listener didn't fire in this mock setup
         window.assessmentUI = new AssessmentUI(); 
    }

} catch (e) {
    console.error("Error executing scripts: " + e.message);
    process.exit(1);
}

// --- 4. Verify Logic (Run the Tests) ---
let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
    if (condition) {
        console.log(`PASS: ${message}`);
        testsPassed++;
    } else {
        console.error(`FAIL: ${message}`);
        testsFailed++;
    }
}

console.log("=== STARTING LOGIC VERIFICATION ===");

// TEST 1: Initialization
window.SCORM.initialize();
assert(window.SCORM.isInitialized === true, "SCORM initialized successfully");

// TEST 2: Set Score (Passing)
console.log("--- Testing Passing Score (85%) ---");
window.SCORM.setScore(85);

assert(mockAPI.data["cmi.core.score.raw"] === 85, "Raw score set to 85");
assert(mockAPI.data["cmi.core.score.min"] === "0", "Min score set to 0");
assert(mockAPI.data["cmi.core.score.max"] === "100", "Max score set to 100");
assert(mockAPI.data["cmi.core.lesson_status"] === "passed", "Status is 'passed'");

// TEST 3: Set Score (Failing)
console.log("--- Testing Failing Score (40%) ---");
window.SCORM.setScore(40);
assert(mockAPI.data["cmi.core.score.raw"] === 40, "Raw score set to 40");
assert(mockAPI.data["cmi.core.lesson_status"] === "failed", "Status is 'failed'");

// TEST 4: Message Bridge Listener
console.log("--- Testing Message Bridge ---");

// Find the message listener in our mock window
const messageHandler = window.listeners['message'][0];
if (messageHandler) {
    // Simulate event
    messageHandler({
        data: {
            type: 'SCORE_SUBMITTED',
            score: 95,
            details: {}
        }
    });
    
    assert(mockAPI.data["cmi.core.score.raw"] === 95, "Message Bridge correctly called setScore (95)");
} else {
    assert(false, "Message Bridge did not register 'message' listener");
}


console.log("\n=== VERIFICATION SUMMARY ===");
console.log(`Passed: ${testsPassed}`);
console.log(`Failed: ${testsFailed}`);

if (testsFailed === 0) {
    process.exit(0);
} else {
    process.exit(1);
}
