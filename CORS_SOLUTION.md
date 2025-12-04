# OHIF + Orthanc CORS Solution

## Problem
The OHIF viewer (running on `http://localhost:3000`) was unable to access the Orthanc server (running on `http://localhost:8042`) due to CORS (Cross-Origin Resource Sharing) restrictions.

**Error Message:**
```
Access to XMLHttpRequest at 'http://localhost:8042/dicom-web/studies?...' from origin 'http://localhost:3000'
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## Root Cause
Orthanc does NOT have built-in CORS support. The developers deliberately chose not to include it to promote "clean Web designs" for medical applications. This is a known limitation of Orthanc.

## Solution
We've implemented a **CORS proxy server** that sits between OHIF and Orthanc:

```
OHIF (localhost:3000) → CORS Proxy (localhost:8043) → Orthanc (localhost:8042)
```

The proxy:
- Receives requests from OHIF
- Adds the necessary CORS headers
- Forwards requests to Orthanc
- Returns responses with CORS headers to OHIF

## Files Created

### 1. `orthanc-cors-proxy.js`
A lightweight Node.js proxy server that adds CORS headers to all Orthanc responses. Uses only built-in Node.js modules (no external dependencies).

### 2. `start-ohif-with-proxy.bat`
Convenience script that starts both the CORS proxy and OHIF viewer in separate windows.

### 3. `restart_orthanc.bat`
Script to restart the Orthanc service (requires administrator privileges).

## Configuration Changes

### OHIF Configuration
Updated `platform/app/public/config/orthanc-enhanced.js`:
- Changed `qidoRoot` from `http://localhost:8042/dicom-web` to `http://localhost:8043/dicom-web`
- Changed `wadoRoot` from `http://localhost:8042/dicom-web` to `http://localhost:8043/dicom-web`

### Orthanc Configuration
Updated `C:\Program Files\Orthanc Server\Configuration\orthanc.json`:
- Set `RemoteAccessAllowed` to `true` (line 217)

Updated `C:\Program Files\Orthanc Server\Configuration\dicomweb.json`:
- Added `"EnableCors": true` (though this doesn't actually work in Orthanc)
- Added `"StudiesMetadata": "Full"` for better OHIF compatibility
- Added `"SeriesMetadata": "Full"` for better OHIF compatibility

## How to Use

### Option 1: Use the Startup Script (Recommended)
1. Double-click `start-ohif-with-proxy.bat`
2. This will open two command windows:
   - One for the CORS proxy
   - One for the OHIF viewer
3. Wait for the browser to open automatically
4. To stop: Close both command windows

### Option 2: Manual Start
1. **Start the CORS Proxy:**
   ```bash
   node orthanc-cors-proxy.js
   ```

2. **Start OHIF (in a separate terminal):**
   ```bash
   npm run dev
   ```

3. **Access OHIF:**
   Open your browser to `http://localhost:3000`

## Verification

To verify the CORS proxy is working:

1. Check that the proxy is running:
   ```powershell
   Test-NetConnection -ComputerName localhost -Port 8043
   ```

2. Test a request through the proxy:
   ```powershell
   Invoke-WebRequest -Uri "http://localhost:8043/dicom-web/studies?limit=1" -UseBasicParsing
   ```

3. Check for CORS headers in the response:
   ```powershell
   $response = Invoke-WebRequest -Uri "http://localhost:8043/dicom-web/studies?limit=1" -Headers @{"Origin"="http://localhost:3000"} -UseBasicParsing
   $response.Headers
   ```
   You should see `Access-Control-Allow-Origin: *` in the headers.

## Troubleshooting

### CORS Proxy Won't Start
- **Error:** "Port 8043 is already in use"
  - **Solution:** Kill the process using port 8043 or change the port in `orthanc-cors-proxy.js`

### OHIF Still Shows CORS Error
- **Check:** Is the CORS proxy running?
  - Look for the "CORS Proxy Server for Orthanc" message in the terminal
- **Check:** Is OHIF configured to use port 8043?
  - Verify `orthanc-enhanced.js` has `localhost:8043` in qidoRoot and wadoRoot
- **Check:** Clear your browser cache and reload

### Orthanc Not Responding
- **Check:** Is the Orthanc service running?
  ```powershell
  Get-Service -Name "Orthanc"
  ```
- **Solution:** Restart Orthanc:
  - Right-click `restart_orthanc.bat` → "Run as administrator"

### Studies Not Loading
- **Check:** Are there studies in Orthanc?
  - Visit `http://localhost:8042` (Orthanc Explorer)
  - Upload some DICOM files if empty
- **Check:** Browser console for errors (F12)

## Alternative Solutions (Not Implemented)

### 1. Nginx Reverse Proxy
The "proper" production solution would be to use Nginx as a reverse proxy. This requires:
- Installing Nginx on Windows
- Configuring Nginx to add CORS headers
- More complex setup

### 2. Apache Reverse Proxy
Similar to Nginx, but using Apache HTTP Server.

### 3. Docker with Nginx
Use the official OHIF Docker setup which includes Nginx for CORS handling.

## Why This Solution Works

1. **No Orthanc Modifications:** Orthanc doesn't need CORS support because the proxy handles it
2. **Lightweight:** Uses only built-in Node.js modules
3. **Transparent:** OHIF doesn't know it's talking to a proxy
4. **Development-Friendly:** Easy to start/stop for local development

## Production Considerations

For production deployment, consider:
- Using a proper reverse proxy (Nginx/Apache)
- Implementing authentication
- Using HTTPS
- Restricting CORS to specific origins (not `*`)
- Running as a Windows service

## References

- [Orthanc CORS Discussion](https://groups.google.com/g/orthanc-users/c/6tGPKdEHpTI)
- [OHIF Configuration Guide](https://docs.ohif.org/configuration/)
- [Node.js HTTP Module](https://nodejs.org/api/http.html)
