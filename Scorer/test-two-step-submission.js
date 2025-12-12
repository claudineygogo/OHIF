
// Mocking the browser environment
const mockPostMessage = (data, origin) => {
    console.log(`[Mock] window.parent.postMessage called with type: ${data.type}`);
    mockPostMessage.calls.push({ data, origin });
};
mockPostMessage.calls = [];

global.window = {
    parent: {
        postMessage: mockPostMessage,
    },
    dispatchEvent: () => {},
    ohifDiceScore: null
};

// Mock Services
const mockUiNotificationService = { show: (msg) => console.log(`[Notification] ${msg.title}: ${msg.message}`) };
const mockSegmentationService = {
    getActiveSegmentation: () => ({ segmentationId: 'seg1' }),
    getSegmentation: () => ({ 
        representationData: { Labelmap: { volumeId: 'vol1', dimensions: [10,10,10], scalarData: [] } },
        getCompleteScalarDataArray: () => new Uint8Array(1000)
    }),
    getLabelmapVolume: () => ({
        voxelManager: { getCompleteScalarDataArray: () => new Uint8Array([0, 1, 0]) }, // Some data
        dimensions: [10,10,10] 
    }),
    getSegmentationRepresentations: () => [{segmentationId: 'seg1'}]
};
const mockViewportGridService = { getState: () => ({ activeViewportId: 'viewport1' }) };

const servicesManager = {
    services: {
        uiNotificationService: mockUiNotificationService,
        segmentationService: mockSegmentationService,
        viewportGridService: mockViewportGridService
    }
};

// We need to simulate the module scope
let storedScoreData = null;

// Extracted Logic for submitContourForGrading (Simulated)
// In the real file, this will set storedScoreData
async function submitContourForGrading() {
    console.log("Executing submitContourForGrading...");
    
    // Simulate Fetch and Calculation
    const diceScore = 0.85; 
    const percentageScore = diceScore * 100;
    
    // LOGIC TO BE IMPLEMENTED:
    // 1. Store the score
    storedScoreData = {
        score: percentageScore,
        details: { dice: diceScore }
    };
    
    // 2. Do NOT post message here (This is the change)
    // window.parent.postMessage(...) <--- Should be gone
    
    console.log("Score stored. Waiting for manual submission.");
}

// Extracted Logic for submitScoreToLMS (Simulated)
async function submitScoreToLMS() {
    console.log("Executing submitScoreToLMS...");
    
    if (!storedScoreData) {
        console.log("Error: No score data found.");
        return;
    }
    
    if (window.parent) {
        window.parent.postMessage({
            type: 'SCORE_SUBMITTED',
            score: storedScoreData.score,
            details: storedScoreData.details
        }, '*');
    }
}

// --- Test Execution ---
async function runTest() {
    console.log("=== Testing Two-Step Submission Workflow logic ===");

    // Step 1: Submit Contour
    await submitContourForGrading();
    
    // Assert NO message sent
    if (mockPostMessage.calls.length === 0) {
        console.log("PASS: submitContourForGrading did NOT send postMessage.");
    } else {
        console.error("FAIL: submitContourForGrading sent a message prematurely.");
        process.exit(1);
    }
    
    // Assert Score Stored
    if (storedScoreData && storedScoreData.score === 85) {
        console.log("PASS: Score data was stored locally.");
    } else {
        console.error("FAIL: Score data was not stored.");
        process.exit(1);
    }

    // Step 2: Submit to LMS
    await submitScoreToLMS();
    
    // Assert Message Sent
    if (mockPostMessage.calls.length === 1) {
        console.log("PASS: submitScoreToLMS sent postMessage.");
        const payload = mockPostMessage.calls[0].data;
        if (payload.type === 'SCORE_SUBMITTED' && payload.score === 85) {
            console.log("PASS: Payload is correct.");
        } else {
            console.error("FAIL: Payload is incorrect.");
            process.exit(1);
        }
    } else {
        console.error(`FAIL: Expected 1 call to postMessage, got ${mockPostMessage.calls.length}`);
        process.exit(1);
    }
    
    console.log("=== Test Complete: Success ===");
}

runTest();
