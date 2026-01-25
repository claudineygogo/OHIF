# Scorer Directory Documentation

This directory contains the components for the OHIF-integrated scoring system. The system allows users to create segmentations in OHIF, which are then graded against a reference segmentation to produce a Dice Similarity Coefficient (DSC) score.

## Directory Structure Overview

*   **Main Directory**: Contains the core logic scripts (`scorer.py`, `app.py`, `package-generator.py`) and data files.
*   **Antigravity Tests/**: Contains automated test scripts, debug utilities, and verify steps used during development. These can be safely ignored or deleted if no longer needed.
*   **scorm-template/**: Contains the HTML/JS/CSS template used to wrap the OHIF viewer into a SCORM package.
*   **Submissions/**: Directory where submission data may be stored (if configured).

## Main Scripts Description

### 1. Scorer.py
**Purpose**: Core logic for mask reconstruction and scoring.

This script contains the mathematical functions to compare a user's segmentation against a reference. It does not run as a standalone server but is imported by `app.py`.

*   `reconstruct_mask(indices, origin_slice_index, target_shape)`:
    *   Takes a list of "flat indices" (compressed representation of the mask) and reconstructs them into a full 3D numpy array (binary mask).
    *   This is necessary because the segmentation data is often transmitted in a compressed format to save bandwidth.
*   `load_segmentation_mask(filepath)`:
    *   Helper to load a DICOM SEG file directly (used for reference loading).
*   `dice_score(mask1, mask2)`:
    *   Calculates the Dice Similarity Coefficient between two 3D masks.
    *   Formula: `(2 * Intersection) / (Volume1 + Volume2)`
    *   Returns a float between 0.0 (no overlap) and 1.0 (perfect match).

### 2. app.py
**Purpose**: Flask server that exposes the Scoring API.

This is the bridge between the web frontend (OHIF/SCORM wrapper) and the Python backend logic.

*   **Endpoint `/grade_submission` (POST)**:
    *   Receives a JSON payload containing the user's segmentation indices.
    *   Loads the reference segmentation from `reference_mask_normalized.json` (or DICOM file).
    *   Reconstructs both masks using `scorer.py` functions.
    *   Calculates the Dice score.
    *   Returns the score and reference data back to the frontend.
*   **Endpoint `/health` (GET)**:
    *   Simple status check to confirm the server is running.

### 3. package-generator.py / generate-scorm.bat
**Purpose**: Creates SCORM packages for specific cases.

These scripts automate the creation of a SCORM ZIP file that links to a specific OHIF study.

*   **Workflow**:
    1.  User runs `generate-scorm.bat`.
    2.  This launches `package-generator.py`, which opens a GUI.
    3.  User inputs:
        *   **Case Name**: e.g., "Lung Nodule 1" (used for the zip filename and manifest title).
        *   **OHIF URL**: The direct link to the study in the OHIF viewer.
    4.  The script:
        *   Copies the `scorm-template` folder.
        *   Injects the OHIF URL into `index.html` and `js/message-bridge.js`.
        *   Updates the `imsmanifest.xml` with the Case Name.
        *   Zips the result into a SCORM-compliant package in the `Downloads` folder.

### 4. generate-scorm.ps1
**Purpose**: PowerShell wrapper.

A helper script to ensure the correct Python environment is found when running `package-generator.py`. It is called by `generate-scorm.bat`.

## Helper Files

*   **reference_mask_normalized.json**: Contains the pre-calculated indices of the "Correct" (Reference) segmentation. This allows the scorer to run without needing to re-read the heavy DICOM files every time.
*   **Reference Segmentation / Reference Seg (brain)**: The original DICOM Segmentation files used to generate the reference JSON.
