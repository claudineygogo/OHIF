# SOLUTION: OHIF Loading Demo Database Instead of Orthanc

## 🎯 The Problem
OHIF is loading the demo database because it's using the **default configuration** instead of your new `orthanc-enhanced.js` configuration.

---

## ✅ SOLUTION: Use the New NPM Script

I've added a new script to your `package.json` that will automatically load the Orthanc configuration.

### Step 1: Stop Current OHIF Server
If OHIF is running, press `Ctrl+C` in the terminal to stop it.

### Step 2: Start OHIF with Orthanc Configuration
```bash
cd C:\Users\Claudiney\Viewers
yarn run dev:orthanc-enhanced
```

**This will:**
- ✅ Load the `orthanc-enhanced.js` configuration
- ✅ Connect to Orthanc at `http://localhost:8042`
- ✅ Load all 14 extensions and 9 modes
- ✅ Enable segmentation tools

### Step 3: Access OHIF
Open browser and go to:
```
http://localhost:3000
```

**You should now see studies from Orthanc instead of the demo database!**

---

## 🔍 Verification Steps

### 1. Check Configuration Loaded
Open browser console (F12) and type:
```javascript
console.log(window.config.name);
```

**Expected output:** `"config/orthanc-enhanced.js"`

**If you see:** `"config/default.js"` → Configuration didn't load correctly

### 2. Check Data Source
```javascript
console.log(window.config.defaultDataSourceName);
```

**Expected output:** `"Orthanc"`

### 3. Check Orthanc Connection
```javascript
console.log(window.config.dataSources[0].configuration.qidoRoot);
```

**Expected output:** `"http://localhost:8042/dicom-web"`

---

## 🔧 CORS Configuration Check

CORS should already be configured from Step 2, but let's verify:

### Check Orthanc CORS Settings

1. **Open Orthanc Configuration File:**
   ```
   C:\Orthanc-Local\Configuration.json
   ```

2. **Find the `DicomWeb` section** and verify it has:
   ```json
   "DicomWeb" : {
     "Enable" : true,
     "Root" : "/dicom-web/",

     "StudiesMetadata" : "Full",
     "SeriesMetadata" : "Full",

     "AllowUnsecureAccess" : true,

     "Headers" : {
       "Access-Control-Allow-Origin" : "*",
       "Access-Control-Allow-Methods" : "GET, POST, PUT, DELETE, OPTIONS",
       "Access-Control-Allow-Headers" : "DNT,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization",
       "Access-Control-Expose-Headers" : "Content-Length,Content-Range"
     }
   }
   ```

### If CORS Settings Are Missing:

1. **Stop Orthanc** (close the Orthanc window)

2. **Edit Configuration File:**
   Open `C:\Orthanc-Local\Configuration.json` in a text editor

3. **Add/Update the DicomWeb section** with the settings above

4. **Restart Orthanc:**
   ```bash
   cd C:\Orthanc-Local
   start_orthanc.bat
   ```

---

## 🧪 Test Orthanc Connection

### Test 1: Orthanc Web Interface
```
http://localhost:8042
```
✅ Should show Orthanc Explorer

### Test 2: DICOMweb Endpoint
```
http://localhost:8042/dicom-web/studies
```
✅ Should return JSON (empty array `[]` if no studies)

### Test 3: CORS Headers
Open browser console and run:
```javascript
fetch('http://localhost:8042/dicom-web/studies')
  .then(r => r.json())
  .then(data => console.log('Success:', data))
  .catch(err => console.error('CORS Error:', err));
```

**Expected:** `Success: []` (or list of studies)

**If CORS error:** CORS is not properly configured in Orthanc

---

## 📋 Complete Startup Checklist

### Before Starting OHIF:

- [ ] **Orthanc is running**
  ```bash
  # Check this URL works:
  http://localhost:8042
  ```

- [ ] **Orthanc has CORS enabled**
  ```bash
  # Check Configuration.json has the Headers section
  ```

- [ ] **Orthanc has Full Metadata enabled**
  ```bash
  # Check Configuration.json has:
  # "StudiesMetadata" : "Full"
  ```

- [ ] **At least one study uploaded to Orthanc**
  ```bash
  # Upload via http://localhost:8042
  ```

### Starting OHIF:

1. **Navigate to Viewers directory:**
   ```bash
   cd C:\Users\Claudiney\Viewers
   ```

2. **Start with Orthanc configuration:**
   ```bash
   yarn run dev:orthanc-enhanced
   ```

3. **Wait for compilation** (may take 1-2 minutes first time)

4. **Open browser:**
   ```
   http://localhost:3000
   ```

5. **Verify configuration loaded** (see verification steps above)

---

## 🐛 Troubleshooting

### Issue: Still seeing demo database

**Possible causes:**
1. Configuration not loading
2. Browser cache
3. Wrong URL

**Solutions:**

**A. Clear Browser Cache:**
- Press `Ctrl+Shift+R` to hard reload
- Or clear cache in browser settings

**B. Verify Script is Running:**
Check terminal output when starting OHIF. Should show:
```
APP_CONFIG=config/orthanc-enhanced.js
```

**C. Force Configuration via URL:**
```
http://localhost:3000/?configUrl=/config/orthanc-enhanced.js
```

**D. Check Terminal for Errors:**
Look for webpack compilation errors or configuration loading errors

---

### Issue: CORS errors in console

**Symptoms:**
```
Access to fetch at 'http://localhost:8042/dicom-web/studies'
from origin 'http://localhost:3000' has been blocked by CORS policy
```

**Solution:**

1. **Verify Orthanc is running:**
   ```
   http://localhost:8042
   ```

2. **Check Orthanc Configuration:**
   Open `C:\Orthanc-Local\Configuration.json`

   Find the `DicomWeb` section and ensure it has:
   ```json
   "AllowUnsecureAccess" : true,
   "Headers" : {
     "Access-Control-Allow-Origin" : "*",
     ...
   }
   ```

3. **Restart Orthanc:**
   - Close Orthanc window
   - Run `C:\Orthanc-Local\start_orthanc.bat`

4. **Clear browser cache and reload OHIF**

---

### Issue: Empty study list

**Possible causes:**
1. No studies uploaded to Orthanc
2. Orthanc not running
3. Wrong URL in configuration

**Solutions:**

**A. Upload a test study:**
1. Go to `http://localhost:8042`
2. Click "Upload"
3. Select DICOM files
4. Upload

**B. Verify Orthanc has studies:**
```
http://localhost:8042/dicom-web/studies
```
Should return array with studies (not empty `[]`)

**C. Check OHIF is connecting to correct URL:**
Browser console:
```javascript
console.log(window.config.dataSources[0].configuration.qidoRoot);
```
Should output: `"http://localhost:8042/dicom-web"`

---

### Issue: Configuration file not found

**Symptoms:**
```
Error: Cannot find module 'config/orthanc-enhanced.js'
```

**Solution:**

Verify file exists:
```bash
dir C:\Users\Claudiney\Viewers\platform\app\public\config\orthanc-enhanced.js
```

If missing, the file wasn't created. Re-run Step 3 or create it manually.

---

## 📝 Quick Reference Commands

### Start Orthanc:
```bash
cd C:\Orthanc-Local
start_orthanc.bat
```

### Start OHIF with Orthanc Config:
```bash
cd C:\Users\Claudiney\Viewers
yarn run dev:orthanc-enhanced
```

### Check Orthanc is Running:
```
http://localhost:8042
```

### Check DICOMweb Endpoint:
```
http://localhost:8042/dicom-web/studies
```

### Access OHIF:
```
http://localhost:3000
```

### Force Config Load (if needed):
```
http://localhost:3000/?configUrl=/config/orthanc-enhanced.js
```

---

## ✅ Success Indicators

You'll know it's working when:

1. **Terminal shows:**
   ```
   APP_CONFIG=config/orthanc-enhanced.js
   webpack compiled successfully
   ```

2. **Browser console shows:**
   ```javascript
   window.config.name === "config/orthanc-enhanced.js"
   window.config.defaultDataSourceName === "Orthanc"
   ```

3. **OHIF worklist shows:**
   - Studies from your Orthanc server
   - NOT the demo studies (CT CHEST, etc.)

4. **No CORS errors in console**

5. **Can open studies and see images**

6. **Segmentation mode is available**

---

## 🎯 Next Steps After Success

Once OHIF is loading Orthanc data:

1. **Test opening a study**
2. **Switch to Segmentation mode**
3. **Verify all tools are available**
4. **Test creating a segmentation**
5. **Test exporting segmentation**

---

## 📞 Still Having Issues?

If you're still seeing the demo database after following these steps:

1. **Share the terminal output** when starting OHIF
2. **Share browser console output** (F12 → Console tab)
3. **Confirm Orthanc is accessible** at `http://localhost:8042`
4. **Check if `Configuration.json` exists** in `C:\Orthanc-Local\`

---

**TL;DR - Quick Fix:**

```bash
# 1. Make sure Orthanc is running
cd C:\Orthanc-Local
start_orthanc.bat

# 2. Start OHIF with new configuration
cd C:\Users\Claudiney\Viewers
yarn run dev:orthanc-enhanced

# 3. Open browser
# http://localhost:3000

# 4. Verify in console (F12):
window.config.name
# Should show: "config/orthanc-enhanced.js"
```
