
// Mocking the browser environment
const mockPostMessage = (data, origin) => {
    console.log(`[Mock] window.parent.postMessage called with:`, JSON.stringify(data), `origin: ${origin}`);
    mockPostMessage.calls.push({ data, origin });
};
mockPostMessage.calls = [];

global.window = {
    parent: {
        postMessage: mockPostMessage,
        // window.parent !== window check simulation
        // In Node, objects are references. 
        // We need ensuring window.parent is not strictly equal to window if we were to test that check.
        // But here we just mock the structure.
    }
};
// Circular reference to simulate window.parent existing but ensuring we can distinguish if needed
// For the check `window.parent && window.parent !== window`, we need to make sure global.window !== global.window.parent
// This is already true by default definition above unless we link them.

// The function to logic-test (simulating the logic added to commandsModule.ts)
// Note: In the actual app, this logic is inline within submitContourForGrading.
// We are extracting it here to verify the postMessage construction and dispatch.
function handleScorerResponse(scoreData) {
    // Logic as it will appear in OHIF
    const percentageScore = scoreData.score; // In real app: diceScore * 100
    const rawDice = scoreData.dice;          // In real app: diceScore

    // Check if parent window exists and is different from current
    if (window.parent && window.parent !== window) {
        window.parent.postMessage({
            type: 'SCORE_SUBMITTED',
            score: percentageScore,
            details: {
                dice: rawDice,
                timestamp: new Date().toISOString()
            }
        }, '*'); // TODO: target origin should be specific in production
    }
}

// --- Test Execution ---

console.log("=== Testing OHIF Event Emitter Logic ===");

// 1. Define sample data
const sampleData = { score: 87.5, dice: 0.875 };

// 2. Call the function
handleScorerResponse(sampleData);

// 3. Assertions
const calls = mockPostMessage.calls;

// Assert 1: Called exactly once
if (calls.length === 1) {
    console.log("PASS: postMessage called exactly once.");
} else {
    console.error(`FAIL: postMessage called ${calls.length} times.`);
    process.exit(1);
}

// Assert 2: Payload content
const payload = calls[0].data;
if (payload.type === 'SCORE_SUBMITTED') {
    console.log("PASS: Payload type is 'SCORE_SUBMITTED'.");
} else {
    console.error(`FAIL: Payload type is '${payload.type}', expected 'SCORE_SUBMITTED'.`);
    process.exit(1);
}

if (payload.score === 87.5) {
    console.log("PASS: Payload score is 87.5.");
} else {
    console.error(`FAIL: Payload score is ${payload.score}, expected 87.5.`);
    process.exit(1);
}

if (calls[0].origin === '*') {
    console.log("PASS: Target origin is '*'.");
} else {
    console.error(`FAIL: Target origin is '${calls[0].origin}', expected '*'.`);
    process.exit(1);
}

console.log("=== Test Complete: Success ===");
