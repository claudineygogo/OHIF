#!/bin/bash

echo "=========================================================="
echo "    SINAPSOS CLOUD DEPLOYMENT - SETUP SCRIPT"
echo "=========================================================="
echo ""
echo "This script will install Docker and launch the services."
echo "Only run this on a clean Ubuntu/Debian server."
echo ""
read -p "Press ENTER to continue or Ctrl+C to cancel..."

# 1. Install Docker if missing
if ! command -v docker &> /dev/null
then
    echo "[1/3] Installing Docker..."
    sudo apt-get update
    sudo apt-get install -y ca-certificates curl gnupg
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg

    echo \
      "deb [arch=\"$(dpkg --print-architecture)\" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(. /etc/os-release && echo \"$VERSION_CODENAME\") stable" | \
      sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
else
    echo "[1/3] Docker already installed. Skipping..."
fi

# 2. Build and Launch
echo "[2/3] Building and Launching Services (This may take 10+ minutes)..."
sudo docker compose -f docker-compose.prod.yml up -d --build

# 3. Final Check
echo "[3/3] Checking Status..."
sleep 5
sudo docker compose -f docker-compose.prod.yml ps

echo ""
echo "=========================================================="
echo "    DEPLOYMENT COMPLETE!"
echo "=========================================================="
echo "Your server should now be listening on Port 80."
echo "DNS: Ensure viewer.sinapsos.com points to this IP."
echo "HTTPS: Setup SSL via Certbot or Load Balancer."
echo ""
