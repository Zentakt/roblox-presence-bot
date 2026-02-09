const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const auth = require('../services/auth');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('linkroblox')
        .setDescription('🔗 Connect your Roblox account to enable presence tracking'),

    async execute(interaction) {
        const stateToken = auth.generateStateToken(interaction.user.id);

        const redirectUri = encodeURIComponent(process.env.ROBLOX_REDIRECT_URI);
        const clientId = process.env.ROBLOX_CLIENT_ID;
        const scopes = encodeURIComponent('openid profile');

        const authUrl = `https://apis.roblox.com/oauth/v1/authorize?` +
            `client_id=${clientId}&` +
            `redirect_uri=${redirectUri}&` +
            `scope=${scopes}&` +
            `response_type=code&` +
            `state=${stateToken}`;

        const embed = new EmbedBuilder()
            .setColor(0x00b06f)
            .setTitle('🔗 Link Your Roblox Account')
            .setDescription(
                'Click the button below to authorize this bot to access your Roblox presence.\n\n' +
                '**Permissions requested:**\n' +
                '• View your profile\n' +
                '• Monitor your game activity\n' +
                '• See when you go online/offline\n\n' +
                '**Security:** Your tokens are encrypted and securely stored. We never store your password.'
            )
            .setFooter({ text: 'This link expires in 10 minutes' });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('✅ Authorize on Roblox')
                .setStyle(ButtonStyle.Link)
                .setURL(authUrl)
        );

        await interaction.reply({
            embeds: [embed],
            components: [row],
            ephemeral: true
        });
    }
};
