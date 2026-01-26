# Plan: Implementing Multi-Structure & Multi-Dataset Support for Seg Scorer

## 1. Problem Description & Goal

### The Current Limitation
Currently, the **Seg Scorer** mode is tightly coupled to a single specific workflow:
1.  **Frontend**: It strictly looks for a DICOM SEG file/layer named `Reference Segmentation` (or `Segmentation`) to auto-load and hide.
2.  **Backend**: The scoring algorithm (`app.py`) looks for a single, hardcoded file named `reference_mask_normalized.json` in the root `Scorer` directory.
3.  **SCORM Generator**: Only accepts a Case Name and OHIF URL. It has no mechanism to specify *which* anatomical structure is being tested.

This "Singleton" design means you can only host **one active exercise at a time**. To create a new exercise (e.g., switching from "Brainstem" to "Eyes"), you must manually overwrite the `Reference Segmentation` file in the backend and ensure the dataset's SEG file matches the generic name. This makes managing multiple exercises for different patients or structures (e.g., Patient 1: Brainstem vs. Patient 2: Liver) impossible without constant manual file swapping.

### The Goal
We want to decouple the system to support a library of exercises. Specifically:
1.  **Multi-Structure Datasets**: A single patient dataset (Study) can contain multiple DICOM SEG files (e.g., "Brainstem", "Optic Nerve", "Chiasm").
2.  **Exercise Selection**: The SCORM package (the "exercise wrapper") should dictate *which* of those structures is the target for the current session.
3.  **Standalone Selection**: If opened *without* SCORM context, the user should be prompted to select a structure from the available segmentations.
4.  **Dynamic Scoring**: The backend should store a library of reference standard files (e.g., organized by Patient and Structure) and select the correct one at runtime based on the user's submission.

---

## 2. Proposed System Architecture

To achieve this, we need to pass the "Context" (Which Patient? Which Structure?) all the way from the SCORM package generation (or User Selection) to the final Scoring API.

### A. Data Organization (Backend)
Instead of a single `reference_mask_normalized.json`, we will organize reference files in a structured folder hierarchy within the `Scorer` directory.

**New Structure:**
```text
Scorer/
└── References/
    ├── SBRT_Spine/  <-- Folder name matches PatientID (0010,0020)
    │   ├── Heart.json
    │   ├── Liver.json
    │   └── Stomach.json
    ├── Patient_002/
    │   ├── Liver.json
    │   └── ...
```

### B. The Context Flow

**Scenario 1: SCORM Package (Managed Exercise)**
1.  **SCORM Generator**: Captures `PatientID` and `StructureName` during package creation.
    *   *Note*: The `PatientID` input must match the DICOM Tag (0010,0020) of the dataset (e.g., `SBRT_Spine`).
2.  **SCORM Package**: Appends these as query parameters to the OHIF URL (e.g., `&patientId=SBRT_Spine&structure=Heart`).
3.  **OHIF Viewer**: Detects these parameters and automatically starts the exercise for that structure.

**Scenario 2: Standalone Mode (Manual Selection)**
1.  **OHIF Viewer**: Detects **NO** structure parameters in the URL.
2.  **Structure Selector**: A modal dialog appears listing all available DICOM SEG series in the dataset.
3.  **User Choice**: User selects "Brainstem".
4.  **System**: Sets the internal state to `structure=Brainstem` and proceeds with the auto-load/hide workflow.

---

## 3. Implementation Plan

Here is the suggested step-by-step approach to modify the codebase.

### Step 1: Backend Refactoring (`app.py`)
Modify the Flask server to handle dynamic file paths.

*   **Action**: Create the `References/` directory structure.
*   **Action**: Update `/grade_submission` endpoint to accept `patient_id` and `structure_name` in the request body.
    *   *Validation*: Ensure these fields strictly match folder/filenames to prevent directory traversal attacks.
*   **Action**: Change the file loading logic to construct the path: `os.path.join(script_dir, 'References', patient_id, f"{structure_name}.json")`.

### Step 2: SCORM Generator Update (`package-generator.py`)
Update the tool to collect the necessary context.

*   **GUI Update**: Add two new input fields:
    *   `Patient ID` (Matches the folder name in Backend)
    *   `Target Structure` (Matches the filename in Backend AND the Series Description in OHIF)
*   **Template Injection**:
    *   Update `update_placeholders` to inject these two new values into `js/message-bridge.js` (or `config.json` if we move to a config-based approach).

### Step 3: SCORM Template Update (`message-bridge.js`)
Ensure the SCORM wrapper passes the context to the Viewer.

*   **Action**: Read the injected `Patient ID` and `Target Structure`.
*   **Action**: When setting the `iframe.src`, append them to the existing `caseUrl`.
    *   *Resulting URL*: `http://my-ohif-url/viewer?studyInstanceUids=...?&structure=Brainstem&patientId=Patient_001`

### Step 4: OHIF Seg Scorer Mode (`index.tsx`)
Teach the viewer to respect the URL parameters OR prompt the user.

*   **Action**: In `onModeEnter`, parse the URL query parameters.
*   **Logic Branch**:
    *   **If `structure` & `patientId` exist**: Proceed with auto-loading that specific series.
    *   **If missing**: Trigger a **Structure Selection Modal**.
        *   List all Series where `Modality === SEG`.
        *   On selection, set the internal `structure` and `patientId` (PatientID can be derived from the DICOM metadata itself).
*   **Refinement**: Update `loadReferenceSegmentation` logic to use the selected structure name.
*   **Submit Logic**: Ensure the selected `patient_id` and `structure_name` are included in the JSON payload sent to the backend.

### Step 5: Verification
1.  **SCORM Test**: Generate and run a package. Verify auto-selection works.
2.  **Standalone Test**: Open the Study URL directly. Verify the Popup appears, lists structures, and selecting one initiates the correct workflow.
