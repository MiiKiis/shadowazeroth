#!/bin/bash

# Script to fix the server issues
# Run this on the Ubuntu server as root or with sudo

echo "Updating packages..."
sudo apt update

echo "Installing nginx..."
sudo apt install -y nginx

echo "Creating nginx config..."
sudo tee /etc/nginx/sites-available/shadowazeroth > /dev/null <<EOF
server {
    listen 80;
    server_name shadowazeroth.com www.shadowazeroth.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

echo "Enabling site..."
sudo ln -sf /etc/nginx/sites-available/shadowazeroth /etc/nginx/sites-enabled/

echo "Testing nginx config..."
sudo nginx -t

echo "Reloading nginx..."
sudo systemctl reload nginx

echo "Opening port 7878 in firewall..."
sudo ufw allow 7878/tcp

echo "Checking if TrinityCore is listening on 7878..."
netstat -tpln | grep 7878

echo "Fixing MySQL auth plugin..."
mysql -u root -p -e "ALTER USER 'blizzcms'@'%' IDENTIFIED WITH mysql_native_password BY '${DB_PASSWORD}';"

echo "Restarting services..."
sudo systemctl restart nginx
sudo systemctl restart mysql

echo "Done. Check if the web works on http://51.81.202.167 and SOAP on http://51.81.202.167:7878"