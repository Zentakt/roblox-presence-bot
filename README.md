# Discord Roblox Presence Bot

A production-ready Discord bot that automatically notifies your server when a specific Roblox user starts playing or joins a game.

## ✨ Features

- 🔐 **Secure OAuth 2.0 Integration** - Uses official Roblox Open Cloud OAuth for safe authentication
- 👁️ **Real-time Presence Monitoring** - Polls Roblox presence API and detects game starts
- 💾 **Encrypted Token Storage** - AES-256 encryption for all OAuth tokens
- 🎨 **Rich Embed Notifications** - Beautiful, customizable Discord embeds with game info
- 🔗 **Deep Links** - One-click join links for Roblox games
- ⚙️ **Per-Guild Configuration** - Different servers can track different users
- 🎯 **Role Pinging** - Optionally ping a role when someone starts playing
- 🛡️ **Production-Ready** - Built with error handling, rate limiting, and graceful shutdown

## 📋 Requirements

- Node.js 18+
- Discord Bot with Application Commands enabled
- Roblox Developer Account (for OAuth app)
- A VPS or local server to host the bot and OAuth callback

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/yourusername/roblox-presence-bot.git
cd roblox-presence-bot
npm install
```

### 2. Set Up Roblox OAuth App

1. Go to [Roblox Creator Dashboard](https://create.roblox.com/dashboard/credentials)
2. Navigate to **Credentials** → **OAuth 2.0 Apps**
3. Click **Create App**
4. Fill in:
   - **Application Name**: "Discord Presence Bot"
   - **Redirect URLs**: Add your OAuth callback URL (e.g., `http://localhost:3000/oauth/callback` for local, or your VPS domain)
5. Click **Create**
6. Copy the **Client ID** and **Client Secret**

### 3. Create Discord Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **New Application**
3. Go to **Bot** → **Add Bot**
4. Copy the **Token**
5. Enable **Message Content Intent** (if needed)
6. Copy the **Client ID**

### 4. Configure Environment

Create `.env` file in the project root:

```bash
# Discord
DISCORD_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_client_id_here
DISCORD_GUILD_ID=your_testing_guild_id_here  # Optional: for faster command deployment during testing

# Roblox OAuth
ROBLOX_CLIENT_ID=your_roblox_oauth_client_id
ROBLOX_CLIENT_SECRET=your_roblox_oauth_secret
ROBLOX_REDIRECT_URI=http://localhost:3000/oauth/callback

# Security
ENCRYPTION_KEY=a1b2c3d4e5f60000000000000000000000000000000000000000000000000000

# Bot Config
PORT=3000
POLL_INTERVAL_MS=60000
```

**Generate ENCRYPTION_KEY:**

```bash
# Linux/Mac
openssl rand -hex 32

# Windows PowerShell
$bytes = [System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32)
$hex = [BitConverter]::ToString($bytes).Replace("-", "").ToLower()
Write-Host $hex
```

### 5. Deploy Commands

```bash
npm run deploy
```

This registers all slash commands with Discord. The DISCORD_GUILD_ID makes it instant for testing; remove it for global deployment (takes ~1 hour).

### 6. Run the Bot

```bash
npm start
```

You should see:
```
🌍 OAuth Server running on http://localhost:3000
🤖 Discord bot logged in as BotName#0000
```

## 📖 Commands

### User Commands

- **/linkroblox** - Connect your Roblox account to the bot
- **/unlink** - Revoke bot access to your Roblox account

### Admin Commands (requires Administrator permission)

- **/monitor <user> [role] [channel]** - Configure monitoring for a user in this server
- **/status** - View bot status and current monitoring configuration
- **/testembed** - Send a test notification embed

## 🔄 Workflow

### First-Time Setup (Admin)

1. **User A** runs `/linkroblox` → Authorizes their Roblox account → Bot receives encrypted tokens
2. **Admin** runs `/monitor @UserA #notifications-channel @RobloxPlayers` → Bot starts monitoring
3. When **User A** starts a Roblox game → Bot sends rich embed to #notifications-channel with game info and join button

### Notification Example

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎮 Roblox Activity Alert

ZennoKun is now playing Roblox!
Click the button below to join the game.

👤 Player: ZennoKun
🟢 Status: Playing
🎮 Game: Lumber Tycoon 2

[🚀 Join Game] [👤 View Profile]

Join now before the server fills up!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## 🔒 Security & Privacy

- **No Password Storage**: Uses OAuth 2.0, never stores passwords
- **No Scraping**: Uses official Roblox Open Cloud APIs only
- **Encrypted Tokens**: All OAuth tokens encrypted with AES-256-CTR
- **Token Rotation**: Refresh tokens rotated automatically
- **Revocation Support**: Users can disconnect anytime with `/unlink`
- **Rate Limiting**: Respects Roblox API rate limits
- **Error Handling**: Graceful error recovery without data loss

## 🗄️ Database Schema

SQLite database with tables:

- **users** - Linked Discord↔Roblox accounts with encrypted tokens
- **guild_config** - Per-guild monitoring configuration
- **oauth_state** - Temporary OAuth state tokens (auto-cleanup)

## 📊 Monitoring Details

- **Poll Interval**: Configurable via `POLL_INTERVAL_MS` (default: 60 seconds)
- **State Detection**: Detects transitions: Offline → Online → InGame
- **No Spam**: Only notifies when user enters a NEW game (not every 60 seconds)
- **Game Info**: Automatically fetches game name, icon, and places
- **Deep Links**: Generates proper Roblox game join links

## 🚨 Troubleshooting

### "No valid token for user"

User's refresh token was revoked. They need to run `/linkroblox` again.

### "Roblox API rate limit hit"

The bot is polling too frequently. Increase `POLL_INTERVAL_MS` in .env.

### "Channel not found"

The configured channel was deleted. Run `/monitor` again to reconfigure.

### Commands not appearing in Discord

If you used `DISCORD_GUILD_ID` for testing:
- Remove it from .env
- Run `npm run deploy` again
- Wait up to 1 hour for global deployment

## 📈 Deployment

### Local Testing

```bash
npm start
```

### VPS Deployment (Ubuntu)

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+
curl -sL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Clone bot
git clone <repo-url>
cd roblox-presence-bot

# Install dependencies
npm install

# Create .env with production values
nano .env

# Install PM2 (process manager)
sudo npm install -g pm2

# Start bot with PM2
pm2 start src/index.js --name "roblox-bot"
pm2 startup
pm2 save

# View logs
pm2 logs roblox-bot
```

### Using systemd (Alternative)

Create `/etc/systemd/system/roblox-bot.service`:

```ini
[Unit]
Description=Roblox Presence Bot
After=network.target

[Service]
Type=simple
User=botuser
WorkingDirectory=/home/botuser/roblox-presence-bot
ExecStart=/usr/bin/node src/index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Then:
```bash
sudo systemctl daemon-reload
sudo systemctl enable roblox-bot
sudo systemctl start roblox-bot
sudo systemctl status roblox-bot
```

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push and create a Pull Request

## 📄 License

MIT License - See LICENSE file

## ⚠️ Legal Notice

This bot:
- Does NOT violate Roblox Terms of Service
- Uses only official Roblox Open Cloud APIs
- Does NOT scrape or use unofficial APIs
- Respects user privacy and OAuth consent

## 🆘 Support

For issues or questions:
- Open an issue on GitHub
- Check existing issues for solutions
- Review logs with `pm2 logs roblox-bot`

## 🎉 Acknowledgments

- [Discord.js](https://discord.js.org/) - Discord API library
- [Roblox Open Cloud](https://developer.roblox.com/) - Official Roblox APIs
- Built with ❤️ for the Roblox gaming community
