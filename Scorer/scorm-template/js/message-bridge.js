/**
 * message-bridge.js
 * Manages the UI transitions and communication between the OHIF iframe and the SCORM handler.
 */

class AssessmentUI {
  constructor() {
    // This placeholder will be replaced by the generator tool
    this.caseUrl = '{{CASE_URL}}';
    this.patientId = '{{PATIENT_ID}}';
    this.structureName = '{{STRUCTURE_NAME}}';
    this.config = null;

    this.setupMessageListener();
    this.bindEvents();

    // Load config then initialize
    this.loadConfig().then(() => {
      this.updateUIWithConfig();
      this.initializeSession();
    });
  }

  async loadConfig() {
    try {
      const response = await fetch('config.json');
      this.config = await response.json();
      console.log('Bridge: Config loaded successfully', this.config);
    } catch (error) {
      console.error('Bridge: Failed to load config.json', error);
      // Fallback defaults if load fails
      this.config = {
        titles: { instruction: 'Segmentation Exercise', results: 'Exercise Complete' },
        text: {
          welcome: 'Welcome to the OHIF++ Segmentation Exercise.',
          description: 'You will be asked to contour a specific anatomical structure.',
          instructions_header: 'Instructions:',
          instructions_list: ['Draw your contour', 'Click Submit', 'Score is automatic'],
          score_label: 'Your Final Score:',
        },
        buttons: { start: 'Start Exercise', try_again: 'Try Again' },
        settings: { passing_score: 70 },
        messages: {
          success: 'Congratulations! You have passed.',
          failure: 'You did not pass. Please try again.',
        },
      };
    }
  }

  updateUIWithConfig() {
    if (!this.config) {
      return;
    }

    // Instructions Screen
    document.getElementById('instruction-title').textContent = this.config.titles.instruction;
    document.getElementById('text-welcome').textContent = this.config.text.welcome;
    document.getElementById('text-description').textContent = this.config.text.description;
    document.getElementById('text-instructions-header').textContent =
      this.config.text.instructions_header;

    const listContainer = document.getElementById('instructions-list');
    listContainer.innerHTML = ''; // Clear existing
    this.config.text.instructions_list.forEach(item => {
      const li = document.createElement('li');
      li.textContent = item;
      listContainer.appendChild(li);
    });

    document.getElementById('start-button').textContent = this.config.buttons.start;

    // Results Screen
    document.getElementById('result-title').textContent = this.config.titles.results;
    document.getElementById('score-label').textContent = this.config.text.score_label;
    document.getElementById('try-again-button').textContent = this.config.buttons.try_again;
  }

  bindEvents() {
    const startBtn = document.getElementById('start-button');
    if (startBtn) {
      startBtn.addEventListener('click', () => this.startAssessment());
    }

    const tryAgainBtn = document.getElementById('try-again-button');
    if (tryAgainBtn) {
      tryAgainBtn.addEventListener('click', () => this.tryAgain());
    }

    // Ensure SCORM session is terminated on page refresh/close
    window.addEventListener('beforeunload', () => {
      if (window.SCORM && window.SCORM.isInitialized) {
        window.SCORM.terminate();
      }
    });
  }

  initializeSession() {
    // Attempt early initialization
    const initialized = window.SCORM.initialize();
    if (initialized) {
      this.checkPreviousStatus();
    }
  }

  checkPreviousStatus() {
    const { status, score } = window.SCORM.getScoreAndStatus();
    console.log(`Bridge: value of status: ${status}, score: ${score}`);

    if (status === 'passed' || status === 'failed' || status === 'completed') {
      console.log('Bridge: Found previous completion. Restoring results...');

      // Ensure we have a valid number
      const numScore = parseFloat(score) || 0;
      this.handleScoreReceived(numScore, null, true); // true = restore mode
    }
  }

  setupMessageListener() {
    window.addEventListener('message', event => {
      // Security check: In production, you might want to check event.origin
      // For this template, we accept messages from the inner iframe

      const data = event.data;
      if (data && data.type === 'SCORE_SUBMITTED') {
        console.log('Bridge: Score received from OHIF viewer', data);
        this.handleScoreReceived(data.score, data.details);
      }
    });
    console.log('Bridge: Message listener initialized.');
  }

  startAssessment() {
    console.log('Bridge: Starting assessment...');

    // 1. Initialize SCORM connection (if not already)
    if (!window.SCORM.isInitialized) {
      const scormOk = window.SCORM.initialize();
      if (!scormOk) {
        console.warn('Bridge: SCORM failed to initialize (expected if running locally).');
      }
    }

    // 2. Load the case into the iframe
    // We do this now instead of on load to prevent premature loading
    const viewerFrame = document.getElementById('ohif-viewer');
    if (viewerFrame) {
      // If the template variable hasn't been replaced, we might be in test mode
      // or the build is broken.
      console.log(`Bridge: Base case URL: ${this.caseUrl}`);

      let fullUrl = this.caseUrl;

      // Append context if available (and not placeholders)
      if (this.patientId && !this.patientId.includes('{{')) {
        const separator = fullUrl.includes('?') ? '&' : '?';
        fullUrl += `${separator}patientId=${encodeURIComponent(this.patientId)}`;
        console.log(`Bridge: Added patientId parameter: ${this.patientId}`);
      }
      if (this.structureName && !this.structureName.includes('{{')) {
        const separator = fullUrl.includes('?') ? '&' : '?';
        fullUrl += `${separator}structure=${encodeURIComponent(this.structureName)}`;
        console.log(`Bridge: Added structure parameter: ${this.structureName}`);
      }

      console.log(`Bridge: ✅ Final URL with parameters: ${fullUrl}`);
      viewerFrame.src = fullUrl;
    }

    // 3. Switch to viewer screen
    if (typeof showScreen === 'function') {
      showScreen('viewer');
    }
  }

  handleScoreReceived(score, details, isRestore = false) {
    const passingThreshold = this.config ? this.config.settings.passing_score : 70;

    // 1. Send score to LMS via SCORM (only if not restoring)
    if (!isRestore) {
      // Pass the configurable threshold
      window.SCORM.setScore(score, passingThreshold);
    }

    // 2. Update Results UI with TRUNCATED score
    const scoreValue = document.getElementById('score-value');
    if (scoreValue) {
      // Use Math.floor to remove decimals
      const integerScore = Math.floor(score);
      scoreValue.textContent = `${integerScore}%`;

      // Optional: Color code the score
      scoreValue.style.color = score >= passingThreshold ? '#4ade80' : '#f87171';
    }

    const feedbackMsg = document.getElementById('feedback-message');
    if (feedbackMsg) {
      if (score >= passingThreshold) {
        feedbackMsg.textContent = this.config ? this.config.messages.success : 'Passed';
        feedbackMsg.className = 'success';
      } else {
        feedbackMsg.textContent = this.config ? this.config.messages.failure : 'Failed';
        feedbackMsg.className = 'failure';
      }
    }

    // 3. Show Results Screen
    if (typeof showScreen === 'function') {
      showScreen('results');
    }
  }

  tryAgain() {
    console.log('Bridge: Try Again clicked...');
    window.SCORM.tryAgain();
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.assessmentUI = new AssessmentUI();
});
