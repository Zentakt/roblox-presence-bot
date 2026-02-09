require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const TOKEN = process.env.DISCORD_TOKEN;
const GUILD_ID = process.env.DISCORD_GUILD_ID;

if (!TOKEN) {
    console.error('❌ Missing DISCORD_TOKEN in .env');
    process.exit(1);
}

if (!CLIENT_ID) {
    console.error('❌ Missing DISCORD_CLIENT_ID in .env');
    process.exit(1);
}

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

console.log(`\n📋 Loading ${commandFiles.length} commands...`);

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);

    if (command.data && command.execute) {
        commands.push(command.data.toJSON());
        console.log(`  ✅ ${command.data.name}`);
    } else {
        console.warn(`  ⚠️ ${file} is missing data or execute`);
    }
}

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    try {
        console.log(`\n🔄 Registering ${commands.length} slash commands...\n`);

        let result;

        if (GUILD_ID) {
            console.log(`📌 Guild-specific deployment (DISCORD_GUILD_ID: ${GUILD_ID})`);
            console.log(`⚡ Changes will be live immediately\n`);

            result = await rest.put(
                Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
                { body: commands }
            );
        } else {
            console.log(`🌐 Global deployment (no DISCORD_GUILD_ID set)`);
            console.log(`⏳ Changes will take up to 1 hour to propagate\n`);

            result = await rest.put(
                Routes.applicationCommands(CLIENT_ID),
                { body: commands }
            );
        }

        console.log(`✅ Successfully registered ${result.length} commands:`);
        for (const cmd of result) {
            console.log(`   • /${cmd.name} - ${cmd.description}`);
        }

        console.log(`\n🎉 Deployment complete!\n`);
        console.log(`Next steps:`);
        console.log(`  1. Start the bot: npm start`);
        console.log(`  2. Invite the bot: https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&permissions=8&scope=bot%20applications.commands`);
        console.log(`  3. Use /linkroblox to authorize your Roblox account\n`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Failed to register commands:', error);
        process.exit(1);
    }
})();
