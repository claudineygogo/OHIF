# Orthanc Setup - Quick Start Guide

## 🚀 Installation Steps

### 1. Run the Setup Script
```batch
cd C:\Users\Claudiney\Viewers
setup_orthanc.bat
```

**What it does:**
- Downloads Orthanc 24.12.0 installer (stable version, ~50MB)
- Installs silently to `C:\Orthanc-Local`
- Creates configuration with FULL metadata support
- Sets up CORS for OHIF integration
- Creates a start script

### 2. Start Orthanc
After installation completes:
```batch
cd C:\Orthanc-Local
start_orthanc.bat
```

Or answer "Y" when the setup script asks if you want to start Orthanc.

### 3. Verify Installation
Open browser and navigate to:
```
http://localhost:8042
```

You should see the Orthanc web interface.

### 4. Test DICOMweb Endpoint
```
http://localhost:8042/dicom-web/studies
```

Should return JSON (empty array `[]` if no studies uploaded yet).

## 📁 File Locations

| File | Location | Purpose |
|------|----------|---------|
| Setup Script | `C:\Users\Claudiney\Viewers\setup_orthanc.bat` | One-time installation |
| Orthanc Installation | `C:\Orthanc-Local\` | Main installation directory |
| Configuration | `C:\Orthanc-Local\Configuration.json` | Server configuration |
| Start Script | `C:\Orthanc-Local\start_orthanc.bat` | Start Orthanc server |
| DICOM Storage | `C:\Orthanc-Local\OrthancStorage\` | Where DICOM files are stored |
| Database | `C:\Orthanc-Local\OrthancDatabase\` | Metadata index |

## 🔑 Critical Configuration Settings

The setup script automatically configures these CRITICAL settings:

### ✅ Full Metadata Support (Line 105-106)
```json
"StudiesMetadata" : "Full",
"SeriesMetadata" : "Full"
```
**Required for:** 3D volume rendering, segmentation tools, complete DICOM tag access

### ✅ CORS Headers (Lines 117-122)
```json
"Headers" : {
  "Access-Control-Allow-Origin" : "*",
  "Access-Control-Allow-Methods" : "GET, POST, PUT, DELETE, OPTIONS",
  ...
}
```
**Required for:** Browser access from OHIF

### ✅ DICOMweb Plugin (Lines 100-123)
```json
"DicomWeb" : {
  "Enable" : true,
  "Root" : "/dicom-web/",
  ...
}
```
**Required for:** OHIF communication

## 🧪 Testing Checklist

- [ ] Orthanc web interface accessible at `http://localhost:8042`
- [ ] DICOMweb endpoint returns JSON at `http://localhost:8042/dicom-web/studies`
- [ ] No CORS errors in browser console when accessing from OHIF
- [ ] Can upload DICOM files via Orthanc web interface
- [ ] Uploaded studies appear in the studies list

## 📤 Uploading Test Data

### Via Web Interface
1. Go to `http://localhost:8042`
2. Click "Upload" button
3. Select DICOM files (.dcm)
4. Click "Start the upload"

### Via Command Line (if you have DICOM files)
```batch
storescu localhost 4242 -aec ORTHANC your_file.dcm
```

## 🔗 OHIF Connection Details

Use these values in your OHIF configuration:

```javascript
{
  namespace: '@ohif/extension-default.dataSourcesModule.dicomweb',
  sourceName: 'orthanc',
  configuration: {
    friendlyName: 'Local Orthanc Server',
    wadoUriRoot: 'http://localhost:8042/dicom-web',
    qidoRoot: 'http://localhost:8042/dicom-web',
    wadoRoot: 'http://localhost:8042/dicom-web',
    qidoSupportsIncludeField: true,
    imageRendering: 'wadors',
    thumbnailRendering: 'wadors',
    enableStudyLazyLoad: true,
    supportsFuzzyMatching: true,
    supportsWildcard: true,
    omitQuotationForMultipartRequest: true,
  }
}
```

## 🐛 Troubleshooting

### Orthanc won't start
- Check if port 8042 is already in use
- Run setup script as Administrator
- Check Windows Firewall settings

### CORS errors in browser
- Verify `orthanc.json` has CORS headers configured
- Restart Orthanc after config changes
- Clear browser cache

### "Cannot create volume" in OHIF
- **Most common issue**: Missing `"StudiesMetadata" : "Full"`
- Verify in `C:\Orthanc-Local\orthanc.json` line 108
- Restart Orthanc if you modified the config

### DICOMweb endpoints return 404
- Check that `Plugins` folder exists in `C:\Orthanc-Local\`
- Verify `OrthancDicomWeb.dll` is in the Plugins folder
- Check Orthanc console for plugin loading errors

## 📚 Additional Resources

- **Configuration Guide**: `ORTHANC_CONFIGURATION_GUIDE.md`
- **Orthanc Documentation**: https://orthanc.uclouvain.be/book/
- **DICOMweb Plugin**: https://orthanc.uclouvain.be/book/plugins/dicomweb.html

## ⚠️ Security Warning

**This configuration is for LOCAL DEVELOPMENT ONLY!**

For production:
- Enable authentication
- Configure HTTPS/SSL
- Restrict CORS to specific origins
- Review all security settings

## 🎯 Next Steps

After Orthanc is running:
1. ✅ Upload test DICOM studies
2. ✅ Verify studies appear in Orthanc web interface
3. ⏭️ Create OHIF configuration file (Step 3)
4. ⏭️ Test OHIF with Orthanc data source
5. ⏭️ Verify segmentation tools work
