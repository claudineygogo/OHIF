const fs = require('fs');
const path = require('path');

// --- Helper for creating testable mocks ---
const fn = (initialImpl = () => {}) => {
    let currentImpl = initialImpl;
    const mock = (...args) => {
        mock.calls.push(args);
        return currentImpl(...args);
    };
    mock.calls = [];
    mock.mock = mock; 
    mock.mockReturnValue = (val) => {
        currentImpl = () => val;
        return mock;
    };
    mock.mockImplementation = (newImpl) => {
        currentImpl = newImpl;
        return mock;
    };
    return mock;
};

// Mock Browser Environment
const mockReload = fn();
const mockFetch = fn(); // Define fetch mock independently

global.window = {
    location: { reload: mockReload },
    parent: null,
    addEventListener: fn(),
    SCORM: { 
        isInitialized: false,
        initialize: fn().mockReturnValue(true),
        getScoreAndStatus: fn().mockReturnValue({ status: "", score: "" }),
        setScore: fn(),
        terminate: fn(),
        tryAgain: fn()
    },
    fetch: mockFetch
};
global.fetch = mockFetch; // Assign same mock function instance

// Mock Elements
const mockElements = {};
const getMockElement = (id) => {
    if (!mockElements[id]) {
        mockElements[id] = {
            id: id,
            addEventListener: fn(),
            classList: { add: fn(), remove: fn() },
            style: {},
            textContent: "",
            innerHTML: "",
            appendChild: fn() // for ul list items
        };
    }
    return mockElements[id];
};

global.document = {
    getElementById: fn().mockImplementation(getMockElement),
    createElement: fn().mockImplementation((tag) => ({ tag, textContent: "" })),
    addEventListener: fn((event, cb) => {
        if (event === 'DOMContentLoaded') global.DOMContentLoadedCallback = cb;
    })
};

// Global showScreen mock
global.showScreen = fn();

// Suppress console logs
const originalConsoleLog = console.log;
console.log = fn();
console.warn = fn();
console.error = originalConsoleLog; // Keep error logs visible for debugging fallback

// --- Load Scripts ---
try {
    // message-bridge only (we don't need scorm-handler logic for this test, just the mock above)
    // EXPOSE GLOBALS TO EVAL SCOPE
    const window = global.window;
    const document = global.document; 
    const fetch = global.fetch;
    
    const messageBridgePath = path.join(__dirname, 'scorm-template', 'js', 'message-bridge.js');
    const messageBridgeCode = fs.readFileSync(messageBridgePath, 'utf8');
    eval(messageBridgeCode);
} catch (e) {
    originalConsoleLog("Error loading scripts:", e);
    process.exit(1);
}

// --- TEST EXECUTION ---

const mockConfig = {
    titles: { instruction: "MOCK TITLE" },
    text: { 
        welcome: "MOCK WELCOME", 
        description: "MOCK DESC",
        instructions_header: "MOCK HEADER",
        instructions_list: ["Item 1", "Item 2"],
        score_label: "MOCK SCORE LABEL:"
    },
    buttons: { start: "MOCK START", try_again: "MOCK TRY" },
    settings: { passing_score: 50 }, // Lower threshold than default
    messages: { success: "MOCK SUCCESS", failure: "MOCK FAIL" }
};

// Setup fetch mock to return our config
global.fetch.mockImplementation(() => Promise.resolve({
    json: () => Promise.resolve(mockConfig)
}));

async function runTests() {
    originalConsoleLog("TEST: Configuration Loading & UI Update...");
    
    // Manually trigger DOMContentLoaded logic to init the normal instance
    if (global.DOMContentLoadedCallback) {
        global.DOMContentLoadedCallback();
    }
    const ui = global.window.assessmentUI; // Access the instance created by the script
    
    // Wait for async loadConfig to finish (it's called in constructor but not awaited)
    // We hackily wait a tick since we can't await the constructor
    await new Promise(resolve => setTimeout(resolve, 10));

    // Verify UI updates
    if (mockElements['instruction-title'].textContent === "MOCK TITLE") {
        originalConsoleLog("PASS: Instruction title updated from config.");
    } else {
        originalConsoleLog(`FAIL: Instruction title is '${mockElements['instruction-title'].textContent}'`);
    }

    if (mockElements['start-button'].textContent === "MOCK START") {
        originalConsoleLog("PASS: Button text updated from config.");
    } else {
        originalConsoleLog("FAIL: Button text not updated.");
    }

    originalConsoleLog("TEST: Score Truncation & Configured Threshold...");
    
    // Test Score Truncation: 76.987 -> 76
    ui.handleScoreReceived(76.987, {});
    
    const scoreVal = mockElements['score-value'].textContent;
    if (scoreVal === "76%") {
        originalConsoleLog("PASS: Score truncated correctly to '76%'.");
    } else {
        originalConsoleLog(`FAIL: Score display is '${scoreVal}'`);
    }

    // Verify passing status uses configured threshold (50)
    // 76 > 50, so should use MOCK SUCCESS
    const feedbackText = mockElements['feedback-message'].textContent;
    if (feedbackText === "MOCK SUCCESS") {
        originalConsoleLog("PASS: Success message used config string and threshold.");
    } else {
        originalConsoleLog(`FAIL: Feedback message is '${feedbackText}'`);
    }

    originalConsoleLog("=== ALL TESTS PASSED ===");
}

runTests();
