# User Guide: Seg Scorer Mode

## 1. Introduction

The **Seg Scorer Mode** is a specialized customized mode within the OHIF viewer designed for training and evaluation purposes. It allows users to perform segmentation tasks on DICOM datasets and receive automated grading based on a reliable reference standard (Ground Truth).

When a user enters this mode, the system automatically prepares the environment by loading a reference segmentation (hidden from view) and setting up a fresh layer for the user's input. The user then performs manual segmentation, which is subsequently submitted for scoring against the hidden reference.

## 2. Workflow Overview

1.  **Mode Entry**: The user selects the "Seg Scorer" mode for a study.
2.  **Auto-Initialization**:
    *   The system scans for a reference DICOM SEG.
    *   If found, it loads it and immediately hides it to prevent bias.
    *   A new, empty segmentation layer ("User Segmentation") is created.
    *   The drawing tool (Brush) is automatically activated.
3.  **User Segmentation**: The user draws the segmentation on the "User Segmentation" layer.
4.  **Submission**: The user submits their segmentation via the UI.
5.  **Scoring**: The system compares the user's segmentation with the hidden reference and calculates a Dice Similarity Coefficient (DSC).

## 3. Detailed Process Flow

The following Steps describe the technical execution flow when `Seg Scorer` mode is initialized.

### 3.1. Mode Initialization (`onModeEnter`)

When the mode is entered (defined in `modes/seg-scorer/src/index.tsx`), the `onModeEnter` lifecycle hook is triggered. This initializes the necessary services (Measurement, Toolbar, ToolGroup, etc.) and performs specific customizations.

### 3.2. Reference Segmentation Loading

The mode employs an automated process to handle reference data:

1.  **Scanning**: The `displaySetService` is queried for all active display sets. The logic specifically looks for a DICOM SEG series with the description:
    *   `Reference Segmentation` (Primary match)
    *   `Segmentation` (Fallback match)

2.  **Loading**:
    *   If a matching SEG series is found, it is loaded into memory.
    *   `segmentationService.createSegmentationForSEGDisplaySet` is called to create the segmentation object.
    *   The ID of this segmentation is stored as the generic **Reference ID**.

3.  **Visualization & Hiding**:
    *   The reference segmentation is added to the active viewport to ensure it exists in the viewer's state.
    *   **Crucially**, the system immediately iterates through all segments of this reference segmentation and sets their visibility to `false`.
    *   *Result*: The reference data is present in the application state effectively "invisible" to the user, ensuring a blind test environment.

### 3.3. User Segmentation Creation

Once the reference is secured and hidden, the system prepares the user's workspace:

1.  **Creation**: A new Labelmap segmentation is created using `createLabelmapForViewport`.
2.  **Customization**:
    *   **Label**: The segmentation object is renamed to **"User Segmentation"**.
    *   **Structure**: The first segment (index 1) is renamed to **"Structure 1"**.
    *   **Color**: The segment color is explicitly set to a specific blue (`#1E19E2` / `[30, 25, 226, 255]`) to distinguish it visually.

### 3.4. Tool Activation

To streamline the user experience, the **CircularBrush** tool is automatically set to `Active` state with a slight delay (100ms) to ensure the UI is ready. This allows the user to start drawing immediately without manually selecting a tool.

## 4. UI Customizations

The Seg Scorer mode applies aggressive UI styling to focus the user on the task:

*   **Header Elements**: The OHIF Logo, Return to Worklist button, and Settings cogwheel are hidden.
*   **Panel Simplification**:
    *   The standard "Label map segmentations" panel header is hidden to prevent users from manipulating the layer structure inadvertently.
    *   Segmentation table headers and specific tool settings (like "Shape") are removed to reduce clutter.
*   **Tab Management**:
    *   Initially, the **Score Panel** is hidden (`display: none`).
    *   Once grading is complete (indicated by the `grading-complete` class on `body`), the Label Map panel is hidden, and the Score Panel is revealed to show results.

## 5. Scoring System

The backend scoring logic is handled by a Python-based server (located in the `Scorer/` directory):

*   **Endpoint**: `/grade_submission` (POST)
*   **Process**:
    1.  Receives the user's segmentation mask (compressed indices).
    2.  Loads the pre-calculated reference mask (from `reference_mask_normalized.json` or the loaded DICOM SEG).
    3.  Reconstructs full 3D masks from the compressed data.
    4.  Calculates the **Dice Similarity Coefficient (DSC)**: `(2 * Intersection) / (Volume1 + Volume2)`.
    5.  Returns the score to the frontend for display.

## 6. Technical Stack

*   **Frontend**: React (OHIF V3 extensions and modes).
*   **Backend**: Flask (Python) for scoring logic.
*   **Data Standard**: DICOM for images and reference segmentations; custom JSON format for lightweight submission.
