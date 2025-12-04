# Quick Start Guide - OHIF with Orthanc

## 🚀 Complete Setup in 3 Steps

### Step 1: Start Orthanc Server
```batch
cd C:\Orthanc-Local
start_orthanc.bat
```

**Verify Orthanc is running:**
- Open browser: `http://localhost:8042`
- You should see the Orthanc web interface

---

### Step 2: Upload Test DICOM Studies

**Option A: Via Web Interface**
1. Go to `http://localhost:8042`
2. Click "Upload" button
3. Select DICOM files (.dcm)
4. Click "Start the upload"

**Option B: Via Command Line** (if you have dcm4che tools)
```bash
storescu localhost 4242 -aec ORTHANC your_file.dcm
```

**Verify upload:**
- Go to `http://localhost:8042/app/explorer.html`
- You should see your studies listed

---

### Step 3: Start OHIF Viewer
```batch
cd C:\Users\Claudiney\Viewers
yarn run dev
```

**Access OHIF with Orthanc configuration:**
```
http://localhost:3000/?configUrl=/config/orthanc-enhanced.js
```

---

## ✅ Verification Checklist

### Orthanc Verification
- [ ] Orthanc web interface loads: `http://localhost:8042`
- [ ] DICOMweb endpoint responds: `http://localhost:8042/dicom-web/studies`
- [ ] At least one study uploaded and visible

### OHIF Verification
- [ ] OHIF loads without errors
- [ ] Study list shows studies from Orthanc
- [ ] Can open a study
- [ ] Segmentation mode is available in mode selector
- [ ] All segmentation tools are present

---

## 🎯 Testing Segmentation Tools

### 1. Open a Study
1. Click on a study in the worklist
2. Wait for images to load

### 2. Switch to Segmentation Mode
1. Look for mode selector (usually top-left)
2. Select "Segmentation" mode
3. Wait for mode to initialize

### 3. Verify Tools Available
Check that these tools are present in the toolbar:
- ✅ Brush tool
- ✅ Scissors tool
- ✅ Threshold tool
- ✅ Rectangle ROI
- ✅ Circle ROI
- ✅ Freehand ROI

### 4. Create a Segmentation
1. Click "Add Segmentation" button
2. Select brush tool
3. Draw on the image
4. Verify segmentation appears

### 5. Test Export
1. Right-click on segmentation in panel
2. Select "Export DICOM SEG"
3. Verify export completes

---

## 🔧 Configuration Files Reference

| File | Purpose | Location |
|------|---------|----------|
| **Orthanc Config** | Server settings | `C:\Orthanc-Local\Configuration.json` |
| **OHIF Config** | Viewer settings | `platform\app\public\config\orthanc-enhanced.js` |
| **Extensions List** | Reference | `extracted_extensions.txt` |
| **Modes List** | Reference | `extracted_modes.txt` |

---

## 🌐 Important URLs

| Service | URL | Purpose |
|---------|-----|---------|
| **Orthanc Web UI** | `http://localhost:8042` | Upload/manage DICOM |
| **Orthanc Explorer** | `http://localhost:8042/app/explorer.html` | Browse studies |
| **DICOMweb Studies** | `http://localhost:8042/dicom-web/studies` | API endpoint |
| **OHIF Viewer** | `http://localhost:3000` | Default OHIF |
| **OHIF + Orthanc** | `http://localhost:3000/?configUrl=/config/orthanc-enhanced.js` | OHIF with Orthanc config |

---

## ⚙️ Configuration Details

### Extensions Loaded (14 total)
```javascript
✅ @ohif/extension-default
✅ @ohif/extension-cornerstone
✅ @ohif/extension-measurement-tracking
✅ @ohif/extension-cornerstone-dicom-sr
✅ @ohif/extension-cornerstone-dicom-seg  ⭐ (Segmentation)
✅ @ohif/extension-cornerstone-dicom-pmap
✅ @ohif/extension-cornerstone-dynamic-volume
✅ @ohif/extension-dicom-microscopy
✅ @ohif/extension-dicom-pdf
✅ @ohif/extension-dicom-video
✅ @ohif/extension-tmtv
✅ @ohif/extension-test
✅ @ohif/extension-cornerstone-dicom-rt
✅ @ohif/extension-ultrasound-pleura-bline
```

### Modes Available (9 total)
```javascript
✅ @ohif/mode-longitudinal
✅ @ohif/mode-basic
✅ @ohif/mode-segmentation  ⭐ (Segmentation Mode)
✅ @ohif/mode-tmtv
✅ @ohif/mode-microscopy
✅ @ohif/mode-preclinical-4d
✅ @ohif/mode-test
✅ @ohif/mode-basic-dev-mode
✅ @ohif/mode-ultrasound-pleura-bline
```

### Data Source Configuration
```javascript
{
  sourceName: 'Orthanc',
  qidoRoot: 'http://localhost:8042/dicom-web',
  wadoRoot: 'http://localhost:8042/dicom-web',
  imageRendering: 'wadors',
  enableStudyLazyLoad: true,
  supportsSeriesAsync: true
}
```

---

## 🐛 Common Issues & Solutions

### Issue 1: "Cannot connect to Orthanc"
**Symptoms:** Empty study list, console errors about localhost:8042

**Solutions:**
1. Verify Orthanc is running: `http://localhost:8042`
2. Check Orthanc CORS settings in `Configuration.json`
3. Restart Orthanc after config changes

---

### Issue 2: "Segmentation mode not available"
**Symptoms:** Only see Basic/Longitudinal modes

**Solutions:**
1. Verify you're using the correct config URL:
   ```
   http://localhost:3000/?configUrl=/config/orthanc-enhanced.js
   ```
2. Check browser console for errors
3. Clear browser cache (Ctrl+Shift+R)

---

### Issue 3: "Cannot create volume" error
**Symptoms:** Error when trying to use segmentation tools

**Solutions:**
1. Verify Orthanc `Configuration.json` has:
   ```json
   "DicomWeb": {
     "StudiesMetadata": "Full",
     "SeriesMetadata": "Full"
   }
   ```
2. Restart Orthanc
3. Reload the study in OHIF

---

### Issue 4: CORS errors in browser console
**Symptoms:** Red errors about "Access-Control-Allow-Origin"

**Solutions:**
1. Check Orthanc `Configuration.json` has CORS headers:
   ```json
   "DicomWeb": {
     "Headers": {
       "Access-Control-Allow-Origin": "*",
       "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
       ...
     }
   }
   ```
2. Restart Orthanc
3. Clear browser cache

---

### Issue 5: Studies not appearing in OHIF
**Symptoms:** Orthanc has studies, but OHIF worklist is empty

**Solutions:**
1. Check DICOMweb endpoint directly:
   ```
   http://localhost:8042/dicom-web/studies
   ```
   Should return JSON array with studies
2. Check browser console for errors
3. Verify data source configuration in `orthanc-enhanced.js`

---

## 📚 Documentation Files

| File | Description |
|------|-------------|
| `STEP3_VALIDATION_REPORT.md` | Detailed validation and testing guide |
| `ORTHANC_QUICKSTART.md` | Orthanc installation quick start |
| `ORTHANC_CONFIGURATION_GUIDE.md` | Orthanc configuration reference |
| `ORTHANC_SETUP_FIXED.md` | Setup script fix explanation |

---

## 🎯 Success Criteria

Your setup is complete when:
- ✅ Orthanc web interface is accessible
- ✅ OHIF loads with Orthanc configuration
- ✅ Studies from Orthanc appear in OHIF worklist
- ✅ Can open studies and view images
- ✅ Segmentation mode is available
- ✅ All segmentation tools work correctly
- ✅ Can create, edit, and export segmentations

---

## 💡 Pro Tips

1. **Bookmark the OHIF URL with config:**
   ```
   http://localhost:3000/?configUrl=/config/orthanc-enhanced.js
   ```

2. **Use keyboard shortcuts:**
   - `Space` - Reset viewport
   - `+/-` - Zoom in/out
   - `Arrow keys` - Navigate images
   - `R/L` - Rotate right/left

3. **Check logs for issues:**
   - Orthanc logs: Check Orthanc console window
   - OHIF logs: Browser console (F12)

4. **Test with sample data:**
   - Download sample DICOM from: https://www.dicomlibrary.com/
   - Upload to Orthanc for testing

---

**Ready to start? Follow the 3 steps above!** 🚀
