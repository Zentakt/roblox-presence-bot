const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const db = require('../services/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('testembed')
        .setDescription('👀 Send a preview notification embed (for testing)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const guildConfig = await db.get('SELECT * FROM guild_config WHERE guild_id = ?', [interaction.guildId]);

        if (!guildConfig) {
            return interaction.reply({
                content: '❌ No monitoring configured for this server. Use `/monitor` first.',
                ephemeral: true
            });
        }

        const targetUser = await db.get('SELECT * FROM users WHERE roblox_user_id = ?', [guildConfig.target_roblox_id]);

        if (!targetUser) {
            return interaction.reply({
                content: '❌ Could not find tracking user.',
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder()
            .setColor(0x00b06f)
            .setTitle('🎮 Roblox Activity Alert')
            .setDescription(
                `**${targetUser.roblox_username}** is now playing Roblox!\n\n` +
                'Click the button below to join the game.'
            )
            .setThumbnail('https://www.roblox.com/favicon.ico')
            .addFields(
                {
                    name: '👤 Player',
                    value: targetUser.roblox_username,
                    inline: true
                },
                {
                    name: '🟢 Status',
                    value: 'Playing',
                    inline: true
                },
                {
                    name: '🎮 Game',
                    value: 'Lumber Tycoon 2',
                    inline: false
                }
            )
            .setImage('https://www.roblox.com/favicon.ico')
            .setFooter({
                text: 'Join now before the server fills up!',
                iconURL: 'https://www.roblox.com/favicon.ico'
            })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('🚀 Join Game')
                .setStyle(ButtonStyle.Link)
                .setURL('https://www.roblox.com/games/1537690962'),
            new ButtonBuilder()
                .setLabel('👤 View Profile')
                .setStyle(ButtonStyle.Link)
                .setURL(`https://www.roblox.com/users/${targetUser.roblox_user_id}/profile`)
        );

        try {
            const channel = await interaction.client.channels.fetch(guildConfig.channel_id);
            if (!channel) {
                return interaction.reply({
                    content: '❌ Configured channel not found. Please reconfigure with `/monitor`.',
                    ephemeral: true
                });
            }

            const content = guildConfig.role_id ? `<@&${guildConfig.role_id}>` : '';

            await channel.send({
                content: content || undefined,
                embeds: [embed],
                components: [row]
            });

            await interaction.reply({
                content: `✅ Test notification sent to ${channel}!`,
                ephemeral: true
            });
        } catch (error) {
            console.error('Error sending test embed:', error);
            await interaction.reply({
                content: `❌ Error sending test notification: ${error.message}`,
                ephemeral: true
            });
        }
    }
};
