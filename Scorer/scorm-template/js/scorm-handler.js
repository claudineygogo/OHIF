/**
 * scorm-handler.js
 * Handles all communication between the content and the LMS via SCORM 1.2 API.
 */

class ScormHandler {
    constructor() {
        this.API = null;
        this.isInitialized = false;
    }

    /**
     * Locates the SCORM API in the window hierarchy
     * @param {Window} win - The window to search from
     * @returns {Object|null} - The SCORM API object or null
     */
    findScormAPI(win) {
        let attempts = 0;
        const maxAttempts = 500;

        while ((win.API == null) && (win.parent != null) && (win.parent != win)) {
            attempts++;
            if (attempts > maxAttempts) {
                console.error("SCORM: Error finding API - too deep.");
                return null;
            }
            win = win.parent;
        }
        return win.API;
    }

    /**
     * Initializes the SCORM session
     * @returns {Boolean} - True if initialized successfully
     */
    initialize() {
        console.log("SCORM: Attempting initialization...");
        this.API = this.findScormAPI(window);

        if (this.API == null) {
            console.error("SCORM: API not found. Running in standalone mode.");
            return false;
        }

        const result = this.API.LMSInitialize("");
        if (result.toString() === "true") {
            this.isInitialized = true;
            console.log("SCORM: Initialized successfully.");
            
            // Set initial status to incomplete if not already passed/failed
            const status = this.getValue("cmi.core.lesson_status");
            if (status !== "completed" && status !== "passed" && status !== "failed") {
                this.setValue("cmi.core.lesson_status", "incomplete");
                this.commit();
            }
            return true;
        } else {
            console.error("SCORM: LMSInitialize failed: " + this.getErrorString());
            return false;
        }
    }

    /**
     * Sets a value in the LMS
     * @param {String} element - The SCORM data model element
     * @param {String} value - The value to set
     * @returns {Boolean}
     */
    setValue(element, value) {
        if (!this.isInitialized) return false;
        const result = this.API.LMSSetValue(element, value);
        return result.toString() === "true";
    }

    /**
     * Gets a value from the LMS
     * @param {String} element - The SCORM data model element
     * @returns {String}
     */
    getValue(element) {
        if (!this.isInitialized) return "";
        return this.API.LMSGetValue(element);
    }

    /**
     * Commits data to the LMS
     * @returns {Boolean}
     */
    commit() {
        if (!this.isInitialized) return false;
        return this.API.LMSCommit("").toString() === "true";
    }

    /**
     * Record the score and determine pass/fail status
     * @param {Number} score - The numeric score (0-100)
     * @param {Number} passingScore - The threshold for passing (default 70)
     */
    setScore(score, passingScore = 70) {
        if (!this.isInitialized) {
            console.warn("SCORM: Cannot set score - not initialized.");
            return;
        }

        console.log(`SCORM: Setting score to ${score} (Pass threshold: ${passingScore})`);
        
        // 1. Set the raw score
        this.setValue("cmi.core.score.raw", score);
        this.setValue("cmi.core.score.min", "0");
        this.setValue("cmi.core.score.max", "100");

        // 2. Determine and set status
        let status = "failed";
        if (score >= passingScore) {
            status = "passed";
        }
        
        this.setValue("cmi.core.lesson_status", status);
        
        // 3. Commit immediately to ensure data is saved
        this.commit();
        console.log(`SCORM: Score saved. Status set to: ${status}`);
    }

    /**
     * Terminates the SCORM session
     */
    terminate() {
        if (!this.isInitialized) return;

        console.log("SCORM: Terminating session...");
        this.API.LMSFinish("");
        this.isInitialized = false;
    }

    /**
     * Retrieves the current status and raw score
     * @returns {Object} { status, score }
     */
    getScoreAndStatus() {
        if (!this.isInitialized) return { status: "", score: "" };
        
        return {
            status: this.getValue("cmi.core.lesson_status"),
            score: this.getValue("cmi.core.score.raw")
        };
    }

    /**
     * Resets the session to allow a retry and terminates.
     * This forces the LMS to re-launch the SCO with a clean slate (or updated status).
     */
    tryAgain() {
        if (!this.isInitialized) {
             // If not initialized, try to initialize just to set values (though unusual)
             this.initialize();
        }

        console.log("SCORM: Resetting for retry...");
        
        // Reset status to incomplete so LMS knows it's being attempted again
        this.setValue("cmi.core.lesson_status", "incomplete");
        // Clear score (optional, but good for clarity)
        this.setValue("cmi.core.score.raw", "0");
        
        this.commit();
        this.terminate();
        
        // Force reload of the page to restart the cycle if the LMS doesn't close the window
        window.location.reload(); 
    }

    getErrorString() {
        if (!this.API) return "No API";
        const code = this.API.LMSGetLastError();
        return this.API.LMSGetErrorString(code);
    }
}

// Global instance
window.SCORM = new ScormHandler();
