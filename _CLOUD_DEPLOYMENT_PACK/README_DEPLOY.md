# Cloud Deployment Guide (Sinapsos)

This folder (`_CLOUD_DEPLOYMENT_PACK`) contains everything needed to deploy the OHIF Viewer + Orthanc + Scorer stack to a production linux server.

## Prerequisites
- A clean Linux server (Ubuntu 20.04/22.04 LTS recommended).
- Root/Sudo access.
- Domain `viewer.sinapsos.com` pointed to the server IP.

## Installation Steps

1.  **Transfer Files**
    Upload the **Entire Project Directory** (`Viewers`) to the server.
    ```bash
    scp -r Viewers/ user@your-server-ip:~/Viewers
    ```

2.  **Run Setup**
    SSH into the server and run the setup script:
    ```bash
    ssh user@your-server-ip
    cd ~/Viewers/_CLOUD_DEPLOYMENT_PACK
    chmod +x setup.sh
    ./setup.sh
    ```

3.  **Wait**
    The script will install Docker (if missing) and build the application. This takes **10-15 minutes** mainly to compile the Viewer.

## Configuration & Security (Post-Install)

### 1. Change Credentials
The default Orthanc user is `admin`/`admin`. THIS IS UNSAFE.
1.  Open `docker-compose.prod.yml`.
2.  Find `ORTHANC_REGISTERED_USERS`.
3.  Change `"admin": "admin"` to a strong password.
4.  Open `nginx/nginx.conf`.
5.  Find `proxy_set_header Authorization "Basic ...";`.
6.  Generate a new base64 string for `username:password` and replace it.
    *   Command to generate: `echo -n "admin:NEW_PASSWORD" | base64`
7.  Restart: `docker compose -f docker-compose.prod.yml restart`

### 2. HTTPS / SSL
This pack assumes "SSL Offloading" (e.g., Cloudflare, AWS Load Balancer) or that you will run Certbot manually.
To run Certbot for Nginx:
```bash
sudo apt install certbot python3-certbot-nginx
# You may need to adjust nginx.conf to handle the challenge or run certbot standalone
```

### 3. Verify
- Go to `http://viewer.sinapsos.com` (or https).
- You should see the Viewer.
- It should NOT ask for a login (Nginx handles it).
- Direct access to `http://viewer.sinapsos.com/pacs/` should be blocked (403 or 404) or redirect.

## Troubleshooting
- **Viewer won't load?** Check `docker compose logs viewer`.
- **Images won't load?** Check `docker compose logs orthanc`.
- **CORS Errors?** Check `docker compose logs nginx` and ensure you are accessing from `sinapsos.com` or the Nginx allow-list.
