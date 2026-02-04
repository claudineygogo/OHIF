# Generate SCORM Package

## Overview
The `generate-scorm.bat` application allows you to wrap a specific OHIF Viewer case into a standard **SCORM 1.2 Package**. This allows the viewer and the specific case to be uploaded to Learning Management Systems (LMS) like Canvas, Blackboard, or Moodle as a gradable assignment.

## How It Works

This is a wrapper application that orchestrates the Python script `package-generator.py`.

### 1. Configuration (GUI)
When you run the batch file, a window appears asking for:
- **Case Name**: The filename for the resulting ZIP (e.g., "Lung-Nodule-Case-1").
- **OHIF URL**: The full URL to the viewer hosted on the web (e.g., `https://viewer.myhospital.org/...`).
- **Patient ID**: The `PatientID` that matches the Reference JSON (used for scoring).
- **Structure Name**: The specific organ/structure to be graded (e.g., `Heart` or `GTV`).

### 2. Templating
The tool reads from the `scorm-template` folder. This folder contains the "skeleton" of a SCORM package:
- `imsmanifest.xml`: The definition file required by SCORM.
- `index.html`: The entry point that loads the viewer in an iframe.
- `js/message-bridge.js`: The Javascript code that listens for the score from OHIF and sends it to the LMS (LMSSetValue).

### 3. Injection & Packaging
The tool injects your inputs into the template files (replacing placeholders like `{{CASE_URL}}`). Finally, it compresses the folder into a `.zip` file.

## Usage

**Double-click** `generate-scorm.bat`.

**Prerequisites:**
- Python must be installed and in your system PATH.
- The `scorm-template` folder must exist in the same directory.
- The `package-generator.py` script must exist in the same directory.

## Data Involved

- **Input**:
    - `scorm-template/` directory (static resources).
    - User parameters (URL, Case Name, etc.).
- **Output**:
    - A `.zip` file saved to your **Downloads** folder.

## Technical Details
This tool does *not* contain the DICOM data itself. It creates a "Link" package. When the student opens the SCORM package in their LMS, it opens an iframe to the *external* OHIF URL you provided. It sets up a communication bridge so that when the student hits "Submit" in OHIF, the score is sent back to the LMS gradebook.
