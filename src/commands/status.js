const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../services/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('status')
        .setDescription('📊 View bot status and monitoring information'),

    async execute(interaction) {
        try {
            const linkedUsers = await db.get('SELECT COUNT(*) as count FROM users');
            const activeGuilds = await db.get('SELECT COUNT(*) as count FROM guild_config');
            const guildConfig = await db.get('SELECT * FROM guild_config WHERE guild_id = ?', [interaction.guildId]);

            let embed = new EmbedBuilder()
                .setColor(0x00b06f)
                .setTitle('📊 Bot Status')
                .addFields(
                    { name: '🤖 Bot Status', value: '🟢 Online', inline: true },
                    { name: '👥 Linked Users', value: `${linkedUsers?.count || 0}`, inline: true },
                    { name: '🏢 Active in Servers', value: `${activeGuilds?.count || 0}`, inline: true },
                    { name: '⏱️ Poll Interval', value: `${parseInt(process.env.POLL_INTERVAL_MS || 60000) / 1000}s`, inline: true }
                )
                .setFooter({ text: 'All times shown in UTC' })
                .setTimestamp();

            if (guildConfig) {
                const targetUser = await db.get('SELECT * FROM users WHERE roblox_user_id = ?', [guildConfig.target_roblox_id]);
                if (targetUser) {
                    embed.addFields(
                        { name: '\n📍 This Server Configuration', value: '─────────────────', inline: false },
                        { name: '👤 Tracking', value: targetUser.roblox_username, inline: true },
                        { name: '📢 Channel', value: `<#${guildConfig.channel_id}>`, inline: true },
                        { name: '🔔 Ping Role', value: guildConfig.role_id ? `<@&${guildConfig.role_id}>` : 'None', inline: true }
                    );
                }
            } else {
                embed.addFields({
                    name: '\n📍 This Server',
                    value: '❌ No monitoring configured. Use `/monitor` to set it up.',
                    inline: false
                });
            }

            await interaction.reply({
                embeds: [embed],
                ephemeral: false
            });
        } catch (error) {
            console.error('Error getting status:', error);
            await interaction.reply({
                content: `❌ Error getting status: ${error.message}`,
                ephemeral: true
            });
        }
    }
};
