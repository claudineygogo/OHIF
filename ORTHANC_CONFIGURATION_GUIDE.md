# Orthanc Configuration Guide for OHIF Integration

## Overview
This document explains the critical configuration settings in `orthanc.json` that enable full OHIF Viewer functionality, particularly for segmentation tools and 3D volume rendering.

## Critical Settings Explained

### 1. Full Metadata Support (MOST IMPORTANT)
```json
"DicomWeb" : {
  "StudiesMetadata" : "Full",
  "SeriesMetadata" : "Full"
}
```

**Why This Matters:**
- **Default behavior**: Orthanc returns minimal metadata to improve performance
- **Problem**: OHIF requires complete metadata for 3D volume reconstruction and segmentation
- **Solution**: Setting `"StudiesMetadata" : "Full"` forces Orthanc to return ALL DICOM tags
- **Impact**: Without this, you'll see errors like "Cannot create volume" or missing segmentation tools

### 2. CORS Configuration
```json
"DicomWeb" : {
  "AllowUnsecureAccess" : true,
  "Headers" : {
    "Access-Control-Allow-Origin" : "*",
    "Access-Control-Allow-Methods" : "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers" : "DNT,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization",
    "Access-Control-Expose-Headers" : "Content-Length,Content-Range"
  }
}
```

**Why This Matters:**
- OHIF runs in the browser and makes cross-origin requests to Orthanc
- Without proper CORS headers, the browser will block all requests
- `AllowUnsecureAccess: true` is required for local development without HTTPS

### 3. DICOMweb Plugin Configuration
```json
"DicomWeb" : {
  "Enable" : true,
  "Root" : "/dicom-web/",
  "EnableWado" : true,
  "WadoRoot" : "/wado",
  "Host" : "0.0.0.0"
}
```

**Why This Matters:**
- OHIF uses DICOMweb protocol (QIDO-RS, WADO-RS, STOW-RS)
- The `/dicom-web/` root path is the standard OHIF expects
- `Host: "0.0.0.0"` allows access from any network interface

### 4. Performance Settings
```json
"DicomWeb" : {
  "QidoMaxInstances" : 100000,
  "StowMaxInstances" : 10,
  "StowMaxSize" : 2147483648
}
```

**Why This Matters:**
- `QidoMaxInstances`: Maximum number of instances returned in queries (default is too low)
- `StowMaxSize`: Maximum upload size (2GB) for storing DICOM files
- These prevent errors when working with large studies

### 5. Plugin Loading
```json
"Plugins" : [
  "./Plugins"
]
```

**Why This Matters:**
- Orthanc loads all DLLs from the `./Plugins` directory
- The DICOMweb plugin (`OrthancDicomWeb.dll`) must be in this directory
- Without the plugin, DICOMweb endpoints won't be available

## Version Compatibility

### Recommended Versions
- **Orthanc Core**: 1.12.4 (stable, well-tested)
- **DICOMweb Plugin**: Bundled with Orthanc distribution

### Known Issues
- **Version 25.5.0**: Has a bug with metadata handling - AVOID
- **Versions < 1.12.0**: May have incomplete DICOMweb support

## Testing Your Configuration

### 1. Verify Orthanc is Running
```
http://localhost:8042
```
You should see the Orthanc web interface.

### 2. Test DICOMweb Endpoint
```
http://localhost:8042/dicom-web/studies
```
Should return JSON (empty array if no studies uploaded).

### 3. Test CORS Headers
Open browser console and run:
```javascript
fetch('http://localhost:8042/dicom-web/studies')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error)
```
Should NOT show CORS errors.

### 4. Verify Full Metadata
Upload a study, then check:
```
http://localhost:8042/dicom-web/studies/{studyUID}/metadata
```
Should return extensive JSON with ALL DICOM tags (not just minimal set).

## Troubleshooting

### Problem: "Cannot create volume" in OHIF
**Solution**: Verify `"StudiesMetadata" : "Full"` is set in `orthanc.json`

### Problem: CORS errors in browser console
**Solution**:
1. Check `"AllowUnsecureAccess" : true` is set
2. Verify CORS headers are configured
3. Restart Orthanc after config changes

### Problem: DICOMweb endpoints return 404
**Solution**:
1. Verify DICOMweb plugin is in `./Plugins` directory
2. Check `"Plugins" : ["./Plugins"]` in config
3. Check Orthanc logs for plugin loading errors

### Problem: Segmentation tools missing in OHIF
**Solution**:
1. Verify full metadata is enabled (see above)
2. Ensure OHIF config includes segmentation extensions
3. Check that the study has proper 3D volume data

## Security Notes

⚠️ **WARNING**: The default configuration is for LOCAL DEVELOPMENT ONLY

For production deployment:
1. Enable authentication: `"AuthenticationEnabled" : true`
2. Set up HTTPS/SSL
3. Restrict CORS to specific origins
4. Use `"RemoteAccessAllowed" : false` if only local access needed
5. Configure proper user accounts and permissions

## Next Steps

After Orthanc is configured and running:
1. Upload test DICOM studies via the web interface
2. Create OHIF configuration file pointing to Orthanc
3. Test OHIF viewer with Orthanc data source
4. Verify all segmentation tools are available

## References

- [Orthanc Book](https://orthanc.uclouvain.be/book/)
- [DICOMweb Plugin Documentation](https://orthanc.uclouvain.be/book/plugins/dicomweb.html)
- [OHIF Configuration Guide](https://docs.ohif.org/configuration/)
