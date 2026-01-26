# Seg Scorer Mode: SCORM Auto-Selection Issue Report

## 1. Objective
 The goal of the "Seg Scorer" mode is to provide an interactive segmentation assessment for users. The workflow requires:
1.  Loading a DICOM Study (CT/MR).
2.  Identifying and loading a specific **Reference Segmentation (SEG)** file that serves as the "Ground Truth".
3.  Creating a blank **User Segmentation** layer for the user to draw on.
4.  Comparing the user's drawing against the reference.

## 2. Scenarios

### Scenario 1: Manual Selection (Working)
*   **Trigger**: User opens a study normally (e.g., from the Study List).
*   **Workflow**:
    1.  The viewer loads.
    2.  A **Modal Popup** appears, listing all available SEG series found in the study.
    3.  The user **manually clicks** the correct SEG (e.g., "Heart" or "CTV").
    4.  **Mechanism**: The Modal inspects the loaded display sets and allows the user to bridge the gap between "What I want" and "What the file is named".
    5.  **Result**: Success. The reference loads, and the scoring engine initializes.

### Scenario 2: SCORM / Automatic Mode (Failing)
*   **Trigger**: The viewer is embedded in an iframe (SCORM package) with URL parameters (e.g., `?structure=Heart`).
*   **Workflow**:
    1.  The viewer loads.
    2.  The app detects the `structure=Heart` parameter.
    3.  It attempts to **automatically find** the matching SEG file without user intervention.
    4.  **Result**: Failure. The reference SEG is often not found, resulting in a state where the user manual drawing layer might appear, but the reference data is missing, or the app hangs in a "Waiting" state.

## 3. The Issue
Despite the `structure` parameter being passed correctly (as confirmed by logs), the automatic matching logic fails to identify the correct DICOM SEG file when the names do not match exactly.

### Specific Mismatch Example
*   **Requested Structure**: "Heart" (input from SCORM generator).
*   **Available DICOM File**: "CTV" (Series Description).
*   **Internal Content**: The "CTV" file *does* contain a segment labeled "Heart", but the file-level metadata does not say "Heart".

### Attempted Solutions
1.  **Fuzzy Matching**: Checking if the filename contains the string (e.g., "Heart_01").
    *   *Result*: Failed (e.g., "CTV" does not contain "Heart").
2.  **Single File Fallback**: If only one SEG exists, force-load it.
    *   *Result*: User rejected this as "unsafe" (what if it loads the wrong organ?).
3.  **Deep Search (Label Inspection)**: Modified the DICOM loader to extract internal Segment Labels and search them.
    *   *Result*: User reported this still failed to resolve the issue.

## 4. Next Steps for Investigation
The breakdown seems to be in the **timing of metadata availability** versus the **matching logic execution**.
*   **Hypothesis**: When `index.tsx` checks for matches, the SEG might be "loaded" as a series, but the *pixel data/segment metadata* (which contains the "Heart" label) might not yet be fully parsed by the `SOPClassHandler`.
*   **Comparison**: The Manual Modal works because it likely renders *after* all metadata is fully available, or it lists the top-level Series Description (allowing the user to make the mental leap that "CTV" = "Heart"). The automated script lacks this robust metadata availability or the "human inference" capability.

Future work should focus on why the "Deep Search" returns empty or fails to trigger, possibly by ensuring the SEG is fully hydrated before the check occurs.
