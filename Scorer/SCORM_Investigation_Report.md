# SCORM Package Investigation Report
## Structure Parameter Not Being Recognized by OHIF

### Executive Summary

**Status:** ✅ **ISSUE IDENTIFIED**

The SCORM package is correctly passing the `structure` parameter to OHIF, but there appears to be **no issue with the parameter passing itself**. The problem is likely related to **timing** and how OHIF is handling the automatic segmentation loading when URL parameters are present.

---

## Investigation Findings

### 1. SCORM Package Generation (✅ Working Correctly)

**File:** `package-generator.py`

The Python script correctly:
- Collects user input via GUI (Patient ID, Structure Name, OHIF URL)
- Replaces placeholders in the template files:
  - `{{CASE_URL}}` → OHIF URL
  - `{{PATIENT_ID}}` → Patient ID value
  - `{{STRUCTURE_NAME}}` → Structure name value

**Verified in SCORM_Test.zip:**
```javascript
// From SCORM_Test_Extracted/js/message-bridge.js (Lines 9-11)
this.caseUrl = 'http://localhost:3000/seg-scorer?StudyInstanceUIDs=1.2.826.0.1.3680043.8.176.2016811145342929.2279.8727571455';
this.patientId = 'SBRT_Spine';
this.structureName = 'Heart';
```

✅ **All placeholders are correctly replaced.**

---

### 2. URL Parameter Construction (✅ Working Correctly)

**File:** `message-bridge.js` - `startAssessment()` method (Lines 133-171)

The SCORM bridge correctly appends URL parameters:

```javascript
// Line 152-162
let fullUrl = this.caseUrl;

// Append context if available (and not placeholders)
if (this.patientId && !this.patientId.includes('{{')) {
  const separator = fullUrl.includes('?') ? '&' : '?';
  fullUrl += `${separator}patientId=${encodeURIComponent(this.patientId)}`;
}
if (this.structureName && !this.structureName.includes('{{')) {
  const separator = fullUrl.includes('?') ? '&' : '?';
  fullUrl += `${separator}structure=${encodeURIComponent(this.structureName)}`;
}
```

**Expected Final URL:**
```
http://localhost:3000/seg-scorer?StudyInstanceUIDs=1.2.826.0.1.3680043.8.176.2016811145342929.2279.8727571455&patientId=SBRT_Spine&structure=Heart
```

✅ **URL construction logic is correct.**

---

### 3. OHIF Parameter Parsing (✅ Working Correctly)

**File:** `modes/seg-scorer/src/index.tsx` (Lines 236-239)

OHIF correctly parses URL parameters on mode entry:

```javascript
// PARSE URL PARAMS
const searchParams = new URLSearchParams(window.location.search);
const urlPatientId = searchParams.get('patientId');
const urlStructure = searchParams.get('structure');
```

There's even a debug console.error specifically for this:

```javascript
// Line 466
if (urlPatientId && urlStructure) {
  console.error('!!! URL Params Detected !!!', { urlPatientId, urlStructure });
  console.log(
    `[SegScorer] URL Params found: Patient=${urlPatientId}, Structure=${urlStructure}`
  );
  setSessionContext(urlPatientId, urlStructure);
  // ...
}
```

✅ **Parameter parsing is implemented correctly.**

---

### 4. Comparison: Manual vs. SCORM Flow

#### Manual Selection (Working)
1. User opens study normally
2. Modal appears listing SEG series
3. User clicks desired SEG
4. Modal calls: `onSelect({ patientId, structureName, selectedSegId })`
5. Triggers: `loadReferenceSegmentation(structureName, selectedSegId)`
   - Note: **Both** structure name AND segmentation ID are passed

#### SCORM Automatic Mode (Failing)
1. SCORM iframe loads OHIF with URL params
2. OHIF parses `?structure=Heart`
3. Triggers: `loadReferenceSegmentation(urlStructure, null)`
   - Note: **Only** structure name is passed, segmentation ID is **null**

---

## Root Cause Analysis

### The Critical Difference

**Manual Mode:**
```javascript
loadReferenceSegmentation(structureName, selectedSegId)
// Both parameters provided ✅
```

**SCORM Mode:**
```javascript
loadReferenceSegmentation(urlStructure, null)
// Missing segmentation ID ❌
```

### Why This Matters

In `loadReferenceSegmentation()` (Lines 257-413), the matching logic is:

```javascript
// Line 273-274: If segId is provided, use direct lookup
if (targetSegId) {
  segDisplaySet = displaySets.find(ds => ds.displaySetInstanceUID === targetSegId);
}
// Line 275-284: Otherwise, try fuzzy matching
else if (targetStructureName) {
  const lowerTarget = targetStructureName.toLowerCase();
  segDisplaySet = displaySets.find(
    ds =>
      ds.Modality === 'SEG' &&
      ((ds.SeriesDescription && ds.SeriesDescription.toLowerCase().includes(lowerTarget)) ||
       (ds.segmentLabels && ds.segmentLabels.some(label => label.toLowerCase().includes(lowerTarget))))
  );
}
```

**The fuzzy matching requires that:**
1. The SEG file's `SeriesDescription` contains "Heart" (case-insensitive), OR
2. The SEG file's `segmentLabels` array contains "Heart"

---

## Potential Issues

### ⚠️ Issue #1: Timing Problems

The automatic flow subscribes to `DISPLAY_SETS_ADDED` event:

```javascript
// Line 473-483
const unsubscribeDisplaySetsAdded = displaySetService.subscribe(
  displaySetService.EVENTS.DISPLAY_SETS_ADDED,
  () => {
    const displaySets = displaySetService.getActiveDisplaySets();
    if (displaySets.length > 0) {
      loadReferenceSegmentation(urlStructure, null);
    }
  }
);
```

**Problem:** The subscription may fire **before** the SEG DisplaySets are fully loaded with their metadata (SeriesDescription, segmentLabels). This would cause the fuzzy match to fail.

### ⚠️ Issue #2: Metadata Mismatch

The fuzzy matching depends on:
- `ds.SeriesDescription` containing "Heart"
- `ds.segmentLabels` containing "Heart"

**If the reference SEG file has:**
- SeriesDescription: "Reference Segmentation" (doesn't contain "Heart")
- segmentLabels: ["Segment 1"] (doesn't contain "Heart")

**Then the match will fail**, even though the structure conceptually represents the heart.

### ⚠️ Issue #3: Missing Fallback Logging

When automatic loading fails (Line 390), there's a warning but no clear indication of **why** it failed:

```javascript
console.warn('⚠️ [AUTO-LOAD] No suitable SEG found. Creating blank user layer.');
```

This doesn't tell us:
- What SEG files **were** found
- What their SeriesDescriptions were
- What their segmentLabels were
- Why the match failed

---

## Debugging Steps

### Step 1: Add Enhanced Logging

**Modify `loadReferenceSegmentation()` around line 266-290:**

```javascript
console.log('[SegScorer] Attempting to load reference segmentation...');
console.log(`[SegScorer] Target: "${targetStructureName}" (ID: ${targetSegId})`);

// NEW: Log all SEG DisplaySets with full details
const segSets = displaySets.filter(ds => ds.Modality === 'SEG');
console.log(`[SegScorer] Found ${segSets.length} SEG DisplaySet(s):`);
segSets.forEach((ds, idx) => {
  console.log(`  SEG ${idx + 1}:`, {
    displaySetInstanceUID: ds.displaySetInstanceUID,
    SeriesDescription: ds.SeriesDescription,
    SeriesNumber: ds.SeriesNumber,
    segmentLabels: ds.segmentLabels,
  });
});
```

### Step 2: Test the SCORM Package

1. Open SCORM package in browser console
2. Click "Start Exercise"
3. Check browser console for:
   - `!!! URL Params Detected !!!` message
   - Detailed SEG DisplaySet logs
   - Match success or failure

### Step 3: Verify SEG File Metadata

Check if your reference SEG file actually contains "Heart" in:
- DICOM tag (0008,103E) - Series Description
- Segment labels in the SEG metadata

---

## Recommended Fixes

### Fix #1: Improve Fuzzy Matching

**Add more flexible matching logic:**

```javascript
// After line 284, add additional fallback
if (!segDisplaySet && targetStructureName) {
  // Try matching against the FIRST segment label only
  segDisplaySet = displaySets.find(
    ds => ds.Modality === 'SEG' &&
    ds.segmentLabels &&
    ds.segmentLabels.length > 0
  );
  console.log('[SegScorer] Falling back to first available SEG:', segDisplaySet);
}
```

### Fix #2: Add Delay for Metadata Loading

**Add explicit delay to allow metadata to fully load:**

```javascript
// Line 473, wrap the subscription callback
const unsubscribeDisplaySetsAdded = displaySetService.subscribe(
  displaySetService.EVENTS.DISPLAY_SETS_ADDED,
  () => {
    const displaySets = displaySetService.getActiveDisplaySets();
    if (displaySets.length > 0) {
      // Wait 500ms for metadata to fully populate
      setTimeout(() => {
        loadReferenceSegmentation(urlStructure, null);
      }, 500);
    }
  }
);
```

### Fix #3: Enhanced Error Reporting

**Replace line 390 with:**

```javascript
const segSets = displaySets.filter(ds => ds.Modality === 'SEG');
console.error('❌ [AUTO-LOAD] No matching SEG found!');
console.error(`  Searched for: "${targetStructureName}"`);
console.error(`  Available SEGs:`, segSets.map(ds => ({
  SeriesDescription: ds.SeriesDescription,
  segmentLabels: ds.segmentLabels,
})));
console.warn('⚠️ Creating blank user layer as fallback.');
```

---

## Verification Checklist

To confirm the issue:

- [ ] Open SCORM package in browser with DevTools console open
- [ ] Click "Start Exercise"
- [ ] Verify you see: `!!! URL Params Detected !!!` with correct values
- [ ] Check if `loadReferenceSegmentation()` is being called
- [ ] Check what SEG DisplaySets are found
- [ ] Verify whether fuzzy matching succeeds or fails
- [ ] Check if SEG file's `SeriesDescription` or `segmentLabels` contains "Heart"

---

## Conclusion

**The SCORM package is correctly passing the structure parameter to OHIF.** The URL construction and parameter parsing are both working as intended.

**The most likely issues are:**

1. **Timing:** SEG metadata may not be fully loaded when the matching attempt occurs
2. **Metadata Mismatch:** The SEG file may not contain "Heart" in its SeriesDescription or segment labels
3. **Insufficient Logging:** Current logging doesn't reveal why the match fails

**Next Action:** Implement the enhanced logging (Fix #3) and test to identify the exact failure point.

---

## Date
Generated: 2026-01-26

## Files Analyzed
- `Scorer/generate-scorm.bat`
- `Scorer/package-generator.py`
- `Scorer/scorm-template/js/message-bridge.js`
- `Scorer/SCORM_Test_Extracted/js/message-bridge.js`
- `modes/seg-scorer/src/index.tsx`
- `modes/seg-scorer/src/components/StructureSelectionModal.tsx`
