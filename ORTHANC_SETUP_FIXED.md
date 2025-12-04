# Orthanc Setup Script - UPDATED (Fixed Download Issue)

## 🔧 What Was Fixed

The original script tried to download a ZIP file that doesn't exist anymore. Orthanc now distributes **Windows installers (.exe)** instead of ZIP files.

### Changes Made:
1. ✅ Updated to use **official Windows installer** (OrthancInstaller-Win64-24.12.0.exe)
2. ✅ Changed from manual extraction to **silent installation**
3. ✅ Updated configuration file name to `Configuration.json` (installer default)
4. ✅ All critical settings remain the same (StudiesMetadata: Full, CORS, etc.)

## 📦 New Installation Method

### Version Used
- **Orthanc 24.12.0** (December 2024 release)
- Stable, tested version
- Avoids known bugs in version 25.5.0
- Includes all necessary plugins (DICOMweb, etc.)

### Download Details
- **URL**: https://orthanc.uclouvain.be/downloads/windows-64/installers/OrthancInstaller-Win64-24.12.0.exe
- **Size**: ~50 MB
- **Type**: Silent installer (no user interaction required)

## 🚀 How to Run

Simply execute the updated script:

```batch
cd C:\Users\Claudiney\Viewers
setup_orthanc.bat
```

The script will:
1. Download the installer to your TEMP folder
2. Run it silently with custom installation path
3. Create the configuration file with all critical settings
4. Create a start script
5. Clean up the installer
6. Ask if you want to start Orthanc immediately

## ✅ Critical Configuration Verified

The updated script still includes ALL critical settings:

### Line 105: StudiesMetadata
```batch
echo     "StudiesMetadata" : "Full",
```

### Line 106: SeriesMetadata
```batch
echo     "SeriesMetadata" : "Full",
```

### Lines 114-119: CORS Headers
```batch
echo     "Headers" : {
echo       "Access-Control-Allow-Origin" : "*",
echo       "Access-Control-Allow-Methods" : "GET, POST, PUT, DELETE, OPTIONS",
...
```

## 📋 Installation Steps

### Step 1: Run Setup Script
```batch
setup_orthanc.bat
```

**Expected output:**
```
============================================================================
 Orthanc Setup for OHIF Viewer Integration
============================================================================

[1/5] Setting installation directory to: C:\Orthanc-Local
[2/5] Downloading Orthanc 24.12.0 installer (stable version)...
[3/5] Installing Orthanc to C:\Orthanc-Local...
[4/5] Creating Orthanc configuration file (Configuration.json)...
[5/5] Creating start script (start_orthanc.bat)...

Installation Complete!
```

### Step 2: Start Orthanc
When prompted, type `Y` to start Orthanc immediately, or run:
```batch
cd C:\Orthanc-Local
start_orthanc.bat
```

### Step 3: Verify Installation
Open browser and go to:
```
http://localhost:8042
```

You should see the Orthanc web interface.

## 🔍 What Changed vs Original Script

| Aspect | Original Script | Updated Script |
|--------|----------------|----------------|
| Download Method | ZIP file (broken link) | Windows Installer |
| Version | 1.12.4 | 24.12.0 |
| Installation | Manual extraction | Silent installer |
| Config File Name | `orthanc.json` | `Configuration.json` |
| Steps | 6 steps | 5 steps (simpler) |
| Critical Settings | ✅ All present | ✅ All present |

## 📁 File Locations After Installation

```
C:\Orthanc-Local\
├── Orthanc.exe                    (Main executable)
├── Configuration.json             (Your custom config with full metadata)
├── start_orthanc.bat             (Start script)
├── Plugins\
│   ├── OrthancDicomWeb.dll       (DICOMweb plugin)
│   └── ... (other plugins)
├── OrthancStorage\               (DICOM files stored here)
└── OrthancDatabase\              (Metadata index)
```

## 🧪 Testing the Installation

### Test 1: Web Interface
```
http://localhost:8042
```
✅ Should show Orthanc Explorer interface

### Test 2: DICOMweb Endpoint
```
http://localhost:8042/dicom-web/studies
```
✅ Should return `[]` (empty JSON array)

### Test 3: Configuration Verification
Open `C:\Orthanc-Local\Configuration.json` and verify:
- Line 105: `"StudiesMetadata" : "Full",`
- Line 106: `"SeriesMetadata" : "Full",`

## ⚠️ Troubleshooting

### If download fails:
- Check internet connection
- Try running as Administrator
- Check if antivirus is blocking the download
- Manually download from: https://orthanc.uclouvain.be/downloads/windows-64/installers/

### If installation fails:
- Run the script as Administrator
- Check if C:\Orthanc-Local already exists (delete it first)
- Check available disk space (need ~200MB)

### If Orthanc won't start:
- Check if port 8042 is already in use
- Check Windows Firewall settings
- Look for Orthanc.exe in Task Manager (kill if running)

## 🎯 Next Steps

After successful installation:
1. ✅ Upload test DICOM studies to Orthanc
2. ✅ Verify studies appear in web interface
3. ⏭️ **STEP 3**: Create OHIF configuration file
4. ⏭️ Configure OHIF to connect to Orthanc
5. ⏭️ Test segmentation tools in OHIF

## 📚 Additional Files

- `ORTHANC_QUICKSTART.md` - Quick reference guide
- `ORTHANC_CONFIGURATION_GUIDE.md` - Detailed configuration documentation
- `extracted_extensions.txt` - OHIF extensions list
- `extracted_modes.txt` - OHIF modes list

---

**Status**: ✅ Script updated and ready to run
**Version**: 24.12.0 (stable)
**Critical Settings**: ✅ All verified
**Ready for**: OHIF integration
