const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User, GuildConfig } = require('../services/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unlink')
        .setDescription('🔐 Revoke bot access to your Roblox account'),

    async execute(interaction) {
        const userRecord = await User.findOne({ discord_id: interaction.user.id });

        if (!userRecord) {
            return interaction.reply({
                content: '❌ You have not linked a Roblox account with this bot.',
                ephemeral: true
            });
        }

        try {
            await User.deleteOne({ discord_id: interaction.user.id });
            await GuildConfig.deleteMany({ target_roblox_id: userRecord.roblox_user_id });

            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setTitle('🔐 Account Unlinked')
                .setDescription(
                    `Your Roblox account **${userRecord.roblox_username}** has been unlinked from this bot.\n\n` +
                    'The bot will no longer have access to your presence data. ' +
                    'You can re-authorize at any time using `/linkroblox`.'
                )
                .setFooter({ text: 'Your data has been deleted from our database' });

            await interaction.reply({
                embeds: [embed],
                ephemeral: true
            });

            console.log(`🔐 User ${interaction.user.id} (${userRecord.roblox_username}) has been unlinked`);
        } catch (error) {
            console.error('Error unlinking account:', error);
            await interaction.reply({
                content: `❌ Error unlinking account: ${error.message}`,
                ephemeral: true
            });
        }
    }
};
