const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('../services/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('monitor')
        .setDescription('⚙️ Set up presence monitoring for this server')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('The Discord user whose Roblox account to track')
                .setRequired(true)
        )
        .addChannelOption(option =>
            option
                .setName('channel')
                .setDescription('The channel to send notifications to')
                .setRequired(true)
        )
        .addRoleOption(option =>
            option
                .setName('role')
                .setDescription('Optional role to ping on notifications')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('user');
        const channel = interaction.options.getChannel('channel');
        const role = interaction.options.getRole('role');

        if (!channel.isTextBased()) {
            return interaction.reply({
                content: '❌ Channel must be a text channel',
                ephemeral: true
            });
        }

        const userRecord = await db.get('SELECT * FROM users WHERE discord_id = ?', [targetUser.id]);

        if (!userRecord) {
            return interaction.reply({
                content: `❌ **${targetUser.username}** has not linked their Roblox account yet.\n\n` +
                    `Ask them to run \`/linkroblox\` first to authorize the bot.`,
                ephemeral: true
            });
        }

        try {
            await db.run(`
                INSERT OR REPLACE INTO guild_config
                (guild_id, target_roblox_id, channel_id, role_id, created_by)
                VALUES (?, ?, ?, ?, ?)
            `, [
                interaction.guildId,
                userRecord.roblox_user_id,
                channel.id,
                role?.id || null,
                interaction.user.id
            ]);

            const embed = new EmbedBuilder()
                .setColor(0x00b06f)
                .setTitle('✅ Monitoring Configured')
                .addFields(
                    { name: '👤 Tracking User', value: `**${userRecord.roblox_username}** (${userRecord.roblox_user_id})`, inline: false },
                    { name: '📢 Notification Channel', value: `${channel}`, inline: false },
                    { name: '🔔 Ping Role', value: role ? `${role}` : 'None', inline: false }
                )
                .setFooter({ text: 'Notifications will be sent when this player starts a game' });

            await interaction.reply({
                embeds: [embed],
                ephemeral: true
            });
        } catch (error) {
            console.error('Error setting up monitoring:', error);
            return interaction.reply({
                content: `❌ Error setting up monitoring: ${error.message}`,
                ephemeral: true
            });
        }
    }
};
