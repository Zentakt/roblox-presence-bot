require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const express = require('express');
const fs = require('fs');
const path = require('path');
const auth = require('./services/auth');
const MonitorService = require('./services/monitor');

// Validate required environment variables
const requiredEnvs = [
    'DISCORD_TOKEN',
    'DISCORD_CLIENT_ID',
    'ROBLOX_CLIENT_ID',
    'ROBLOX_CLIENT_SECRET',
    'ROBLOX_REDIRECT_URI',
    'ENCRYPTION_KEY'
];

for (const env of requiredEnvs) {
    if (!process.env[env]) {
        console.error(`❌ Missing required environment variable: ${env}`);
        process.exit(1);
    }
}

if (process.env.ENCRYPTION_KEY.length !== 64) {
    console.error('❌ ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
    process.exit(1);
}

// Setup Express Server
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/oauth/callback', async (req, res) => {
    const code = req.query.code;
    const state = req.query.state;
    const error = req.query.error;
    const error_description = req.query.error_description;

    if (error) {
        console.warn(`⚠️ OAuth error: ${error} - ${error_description}`);
        return res.status(400).send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Authorization Failed</title>
                <style>
                    body { font-family: Arial, sans-serif; text-align: center; padding: 40px; background: #f0f0f0; }
                    .container { background: white; padding: 30px; border-radius: 8px; max-width: 500px; margin: 0 auto; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
                    h1 { color: #ff6b6b; }
                    p { color: #666; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>❌ Authorization Failed</h1>
                    <p>${error_description || 'An error occurred during authorization'}</p>
                    <p>You can close this window and try again.</p>
                </div>
            </body>
            </html>
        `);
    }

    if (!code || !state) {
        return res.status(400).send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Missing Parameters</title>
                <style>
                    body { font-family: Arial, sans-serif; text-align: center; padding: 40px; background: #f0f0f0; }
                    .container { background: white; padding: 30px; border-radius: 8px; max-width: 500px; margin: 0 auto; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
                    h1 { color: #ff6b6b; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>❌ Missing Parameters</h1>
                    <p>Authorization code or state parameter is missing.</p>
                </div>
            </body>
            </html>
        `);
    }

    try {
        const discordId = await auth.verifyStateToken(state);

        if (!discordId) {
            return res.status(400).send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Invalid State</title>
                    <style>
                        body { font-family: Arial, sans-serif; text-align: center; padding: 40px; background: #f0f0f0; }
                        .container { background: white; padding: 30px; border-radius: 8px; max-width: 500px; margin: 0 auto; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
                        h1 { color: #ff6b6b; }
                        p { color: #666; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>❌ Invalid Session</h1>
                        <p>Your session has expired. Please use /linkroblox again to authorize.</p>
                    </div>
                </body>
                </html>
            `);
        }

        const userInfo = await auth.exchangeCode(code, discordId);

        return res.status(200).send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Authorization Successful</title>
                <style>
                    body { font-family: Arial, sans-serif; text-align: center; padding: 40px; background: #f0f0f0; }
                    .container { background: white; padding: 30px; border-radius: 8px; max-width: 500px; margin: 0 auto; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
                    h1 { color: #00b06f; }
                    p { color: #666; margin: 10px 0; }
                    .emoji { font-size: 48px; margin: 10px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="emoji">✅</div>
                    <h1>Linked Successfully!</h1>
                    <p><strong>${userInfo.username}</strong> has been linked to your Discord account.</p>
                    <p>You can now use <code>/monitor</code> to set up presence tracking.</p>
                    <p style="margin-top: 20px; font-size: 12px; color: #999;">You can close this window.</p>
                </div>
            </body>
            </html>
        `);
    } catch (error) {
        console.error('❌ OAuth exchange error:', error.message);
        return res.status(500).send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Error</title>
                <style>
                    body { font-family: Arial, sans-serif; text-align: center; padding: 40px; background: #f0f0f0; }
                    .container { background: white; padding: 30px; border-radius: 8px; max-width: 500px; margin: 0 auto; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
                    h1 { color: #ff6b6b; }
                    p { color: #666; }
                    code { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>❌ Error Linking Account</h1>
                    <p>${error.message}</p>
                    <p>Please try again using <code>/linkroblox</code></p>
                </div>
            </body>
            </html>
        `);
    }
});

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

app.use((req, res) => {
    res.status(404).json({ error: 'Not Found' });
});

const server = app.listen(PORT, () => {
    console.log(`🌍 OAuth Server running on http://localhost:${PORT}`);
});

// Setup Discord Bot
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildPresences // Required for presence tracking
    ]
});

// Debug Logging
client.on('debug', info => console.log(`[DEBUG] ${info}`));

client.commands = new Collection();
let monitorService = null;

// Load Commands
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    client.commands.set(command.data.name, command);
    console.log(`✅ Loaded command: ${file}`);
}

// Bot Ready Event
client.once('ready', async () => {
    console.log(`\n🤖 Discord bot logged in as ${client.user.tag}`);
    console.log(`📦 Loaded ${client.commands.size} commands\n`);

    // Connect to MongoDB
    const db = require('./services/db');
    await db.connect();

    client.user.setActivity('Roblox players 👀', { type: 'WATCHING' });

    monitorService = new MonitorService(client);
    monitorService.start();
});

// Interaction Handler
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) {
        return interaction.reply({
            content: '❌ Command not found',
            ephemeral: true
        });
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(`❌ Error executing command ${interaction.commandName}:`, error);

        const errorMessage = error.message || 'An unknown error occurred';

        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({
                content: `❌ Error: ${errorMessage}`,
                ephemeral: true
            });
        } else {
            await interaction.reply({
                content: `❌ Error: ${errorMessage}`,
                ephemeral: true
            });
        }
    }
});

// Error Handlers
client.on('error', error => {
    console.error('❌ Discord client error:', error);
});

process.on('unhandledRejection', error => {
    console.error('❌ Unhandled promise rejection:', error);
});

process.on('uncaughtException', error => {
    console.error('❌ Uncaught exception:', error);
    process.exit(1);
});

// Graceful Shutdown
process.on('SIGINT', async () => {
    console.log('\n\n🛑 Shutting down gracefully...');

    if (monitorService) {
        monitorService.stop();
    }

    await client.destroy();
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});

// Login to Discord with timeout
console.log('Attempting to log into Discord...');
console.log('Token starts with:', process.env.DISCORD_TOKEN?.substring(0, 10) + '...');

const loginTimeout = setTimeout(() => {
    console.error('❌ Discord login timed out after 30 seconds!');
    console.error('This usually means the DISCORD_TOKEN is invalid.');
    console.error('Token length:', process.env.DISCORD_TOKEN?.length);
}, 30000);

client.login(process.env.DISCORD_TOKEN)
    .then(() => {
        clearTimeout(loginTimeout);
        console.log('✅ client.login() resolved successfully');
    })
    .catch(err => {
        clearTimeout(loginTimeout);
        console.error('❌ client.login() FAILED:', err.message);
        console.error('Error code:', err.code);
    });
