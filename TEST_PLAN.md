# Step 4: Integration Test Plan

**Objective:** Verify that OHIF is correctly connected to the local Orthanc server and that all segmentation tools are functional.

## Prerequisite: Start the Environment
Run the `run_integration.bat` script in the root directory. This will ensure Orthanc is installed, running, and OHIF is started with the correct configuration.

---

## Phase 1: Connection Verification

### 1.1 Verify Orthanc Access
- [ ] Open `http://localhost:8042` in your browser.
- [ ] **Pass:** You see the Orthanc Explorer interface.
- [ ] **Fail:** Page does not load. (Check if Orthanc console window is open).

### 1.2 Verify Data Upload
- [ ] In Orthanc Explorer (`http://localhost:8042`), click **"Upload"**.
- [ ] Drag and drop a folder of DICOM files (e.g., a CT or MR study).
- [ ] Click **"Start the upload"**.
- [ ] **Pass:** Files upload successfully and a new study appears in the "Studies" list.

### 1.3 Verify OHIF Connection
- [ ] Open `http://localhost:3000` (or `http://localhost:3000/?configUrl=/config/orthanc-enhanced.js`).
- [ ] **Pass:** The study list shows the study you just uploaded to Orthanc.
- [ ] **Fail:** You see "CT Chest", "MR Head" (Demo studies). **Fix:** Check the URL parameter or restart `run_integration.bat`.

---

## Phase 2: Segmentation Tool Verification

### 2.1 Load Study
- [ ] Click on the study in the OHIF worklist.
- [ ] **Pass:** Images load in the viewer.

### 2.2 Activate Segmentation Mode
- [ ] Look for the **Mode Selector** (usually top-left or right panel).
- [ ] Select **"Segmentation"**.
- [ ] **Pass:** The interface changes, showing segmentation tools in the toolbar.

### 2.3 Test Tools
- [ ] **Brush Tool:** Select the Brush tool and draw on an image. **Pass:** A colored overlay appears where you draw.
- [ ] **Scissors:** Use the Scissor tool to cut/remove part of the segmentation. **Pass:** The overlay is removed in that area.
- [ ] **Panel:** Open the Segmentation Panel (right side). **Pass:** You see "Segment 1" (or similar) listed.

### 2.4 Test 3D Functionality (Critical)
- [ ] If the study is a volume (CT/MR), try to scroll through slices.
- [ ] **Pass:** The segmentation persists across slices (if you drew on them) and the volume loads without "Cannot create volume" errors.
- [ ] **Fail:** "Cannot create volume" error. **Fix:** This usually means Orthanc is not sending full metadata. Verify `StudiesMetadata: Full` in `C:\Orthanc-Local\Configuration.json`.

---

## Phase 3: Data Persistence

### 3.1 Export Segmentation
- [ ] In the Segmentation Panel, look for an **Export** or **Save** button (often "Export DICOM SEG").
- [ ] Click it.
- [ ] **Pass:** A DICOM SEG file is generated/downloaded or sent back to Orthanc.

### 3.2 Reload
- [ ] Refresh the page.
- [ ] **Pass:** If you saved to Orthanc, the segmentation should load back in (or be available to load).

---

## Troubleshooting

- **"Network Error" / CORS:** Check the browser console (F12). If you see CORS errors, Orthanc configuration needs `AllowUnsecureAccess: true` and proper headers. The setup script handles this, so try restarting Orthanc.
- **Demo Database Persists:** Ensure you are running `yarn run dev:orthanc-enhanced` (which `run_integration.bat` does).
