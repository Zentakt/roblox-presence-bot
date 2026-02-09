# Roblox Presence Bot - Deployment Guide

This guide covers deploying the bot to a VPS or persistent hosting environment.

## 📋 Prerequisites

- VPS or server with:
  - Ubuntu 20.04 LTS or newer (or equivalent Linux)
  - 512 MB+ RAM
  - 1 GB+ disk space
  - Public IP address or domain name
- Domain name (optional but recommended for HTTPS)
- SSH access to your server

## 🔧 Step 1: Initial Server Setup

### Connect to Your Server

```bash
ssh root@your_server_ip
```

### Update System

```bash
apt update
apt upgrade -y
apt install -y git curl wget
```

### Install Node.js 18+

```bash
curl -sL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs
node --version  # Should be v18+
npm --version
```

### Create Bot User (Security Best Practice)

```bash
useradd -m -s /bin/bash botuser
usermod -aG sudo botuser
sudo -u botuser bash
```

## 🔨 Step 2: Deploy Bot Application

### Clone Repository

```bash
cd /home/botuser
git clone https://github.com/yourusername/roblox-presence-bot.git
cd roblox-presence-bot
```

### Install Dependencies

```bash
npm install
```

### Create Production .env

```bash
nano .env
```

Paste and fill in your production credentials:

```bash
# Discord
DISCORD_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_client_id_here

# Roblox OAuth
ROBLOX_CLIENT_ID=your_roblox_oauth_client_id
ROBLOX_CLIENT_SECRET=your_roblox_oauth_secret
ROBLOX_REDIRECT_URI=https://yourdomain.com/oauth/callback

# Security
ENCRYPTION_KEY=your_32_byte_hex_key_here

# Bot
PORT=3000
POLL_INTERVAL_MS=60000
NODE_ENV=production
```

**Important:**
- Use HTTPS URLs in production
- Set up a domain or use your server's IP
- Update Roblox OAuth Dashboard with the new callback URL

### Deploy Slash Commands

```bash
npm run deploy
```

## 🚀 Step 3: Set Up Process Manager (PM2)

PM2 keeps your bot running and restarts it on failure.

### Install PM2

```bash
npm install -g pm2
```

### Start Bot with PM2

```bash
pm2 start src/index.js --name "roblox-bot"
```

### Configure Auto-Restart

```bash
pm2 startup
pm2 save
```

### Monitor the Bot

```bash
pm2 logs roblox-bot
pm2 status
pm2 restart roblox-bot
pm2 stop roblox-bot
```

## 🔐 Step 4: Set Up HTTPS (Recommended)

### Install Certbot

```bash
apt install -y certbot python3-certbot-nginx
```

### Using Nginx as Reverse Proxy

Install Nginx:

```bash
apt install -y nginx
```

Create Nginx config at `/etc/nginx/sites-available/roblox-bot`:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the config:

```bash
ln -s /etc/nginx/sites-available/roblox-bot /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

Get SSL certificate:

```bash
certbot certonly --standalone -d yourdomain.com
certbot install --nginx -d yourdomain.com
```

Update `.env`:

```bash
ROBLOX_REDIRECT_URI=https://yourdomain.com/oauth/callback
```

## 📊 Step 5: Set Up Logging

### View Real-Time Logs

```bash
pm2 logs roblox-bot
```

### Rotate Logs (Optional)

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 10
```

## 🔄 Step 6: Automatic Updates

### Create Update Script

Create `/home/botuser/roblox-presence-bot/update.sh`:

```bash
#!/bin/bash
cd /home/botuser/roblox-presence-bot
git pull origin main
npm install
pm2 restart roblox-bot
```

Make it executable:

```bash
chmod +x update.sh
```

### Schedule Updates (Cron)

```bash
crontab -e
```

Add this line to check for updates daily at 2 AM:

```
0 2 * * * /home/botuser/roblox-presence-bot/update.sh >> /var/log/roblox-bot-update.log 2>&1
```

## 🛡️ Step 7: Firewall Configuration

### Configure UFW Firewall

```bash
ufw allow 22/tcp      # SSH
ufw allow 80/tcp      # HTTP
ufw allow 443/tcp     # HTTPS
ufw enable
ufw status
```

## 📈 Step 8: System Monitoring

### Check System Resources

```bash
# CPU and Memory Usage
top

# Disk Space
df -h

# Process Status
pm2 status
pm2 logs
```

### Set Up Monitoring Alerts (Optional)

```bash
pm2 install pm2-auto-pull
pm2 install pm2-github-pull
```

## 🚨 Troubleshooting

### Bot Won't Start

```bash
pm2 logs roblox-bot
# Check for error messages, especially about missing env vars
```

### OAuth Callback Not Working

1. Verify domain is pointing to server IP
2. Check ROBLOX_REDIRECT_URI matches Roblox Dashboard exactly
3. Ensure HTTPS is working (if using HTTPS)
4. Check firewall allows port 80/443

### Database Lock Errors

```bash
# Restart bot to clear locks
pm2 restart roblox-bot
```

### High Memory Usage

```bash
# Check if too many requests
pm2 logs roblox-bot | grep "rate limit"

# Increase POLL_INTERVAL_MS in .env
# Then restart
pm2 restart roblox-bot
```

## 📚 Using systemd (Alternative to PM2)

If you prefer systemd instead of PM2:

### Create Service File

Create `/etc/systemd/system/roblox-bot.service`:

```ini
[Unit]
Description=Roblox Presence Discord Bot
After=network.target

[Service]
Type=simple
User=botuser
WorkingDirectory=/home/botuser/roblox-presence-bot
EnvironmentFile=/home/botuser/roblox-presence-bot/.env
ExecStart=/usr/bin/node src/index.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

### Enable and Start

```bash
sudo systemctl daemon-reload
sudo systemctl enable roblox-bot
sudo systemctl start roblox-bot
sudo systemctl status roblox-bot

# View logs
sudo journalctl -u roblox-bot -f
```

## 🎉 You're Done!

Your bot should now be:
- ✅ Running continuously
- ✅ Auto-restarting on failure
- ✅ Accessible via OAuth callback
- ✅ Monitoring Roblox presence
- ✅ Sending notifications to Discord

## 📞 Support

For issues:
1. Check logs: `pm2 logs roblox-bot`
2. Verify .env configuration
3. Ensure Roblox OAuth app is set up correctly
4. Check Discord bot has proper permissions
