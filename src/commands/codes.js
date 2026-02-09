const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const FandomWikiService = require('../services/wiki');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('codes')
        .setDescription('🎁 Find Roblox game promo codes from Fandom wiki')
        .addStringOption(option =>
            option
                .setName('game')
                .setDescription('The Roblox game name to search for')
                .setRequired(true)
                .setAutocomplete(false) // You can enable this if you implement autocomplete
        ),

    async execute(interaction) {
        const gameName = interaction.options.getString('game').trim();

        // Defer the reply since this might take a moment
        await interaction.deferReply();

        try {
            // Input validation
            if (gameName.length < 2) {
                return await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0xff6b6b)
                            .setTitle('❌ Invalid Input')
                            .setDescription('Game name must be at least 2 characters long.')
                    ]
                });
            }

            const wiki = new FandomWikiService();

            // Step 1: Search for the game
            console.log(`\n🎮 Searching for game: "${gameName}"\n`);
            const gameMatch = await wiki.searchGame(gameName);

            if (!gameMatch) {
                return await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0xff9500)
                            .setTitle('🔎 No Matches Found')
                            .setDescription(
                                `Could not find a wiki page for **${gameName}**.\n\n` +
                                `**Suggestions:**\n` +
                                `• Check your spelling\n` +
                                `• Try the official game name from Roblox\n` +
                                `• The game might not have a Fandom wiki page yet`
                            )
                            .setFooter({ text: 'Try another game name' })
                    ]
                });
            }

            // Step 2: Fetch page content
            console.log(`\n📖 Fetching page: "${gameMatch.title}"\n`);
            const htmlContent = await wiki.fetchPageContent(gameMatch.title);

            // Step 3: Extract codes
            console.log(`\n🔍 Extracting codes from page...\n`);
            const codesData = await wiki.extractCodesFromHTML(htmlContent);

            // Step 4: Build response
            if (!codesData.found || codesData.codes.length === 0) {
                return await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0xff9500)
                            .setTitle('⚠️ No Codes Found')
                            .setDescription(
                                `Found the page for **${gameMatch.title}**, but no active promo codes were found.\n\n` +
                                `The wiki page might:\n` +
                                `• Not have a Codes section\n` +
                                `• Have codes in a different format\n` +
                                `• Be outdated`
                            )
                            .setFooter({ text: 'Check the wiki directly for more info' })
                    ]
                });
            }

            // Build the codes embed
            const codesEmbed = new EmbedBuilder()
                .setColor(0x00b06f)
                .setTitle(`🎁 ${gameMatch.title} - Promo Codes`)
                .setDescription(`Found **${codesData.codes.length}** active code${codesData.codes.length === 1 ? '' : 's'}!`)
                .setFooter({
                    text: `Source: Fandom Wiki | Last Updated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
                    iconURL: 'https://www.fandom.com/favicon.ico'
                })
                .setTimestamp();

            // Add codes as fields (max 25 fields per embed, we'll use 15 to be safe)
            const codesPerField = Math.ceil(codesData.codes.length / 2);
            let currentFieldIndex = 0;

            for (let i = 0; i < codesData.codes.length; i += codesPerField) {
                const batch = codesData.codes.slice(i, Math.min(i + codesPerField, codesData.codes.length));
                const fieldValue = batch
                    .map(c => `\`${c.code}\`\n${c.reward}`)
                    .join('\n\n');

                codesEmbed.addFields({
                    name: i === 0 ? '💰 Active Codes' : '​', // Zero-width space for inline display
                    value: fieldValue,
                    inline: false
                });

                currentFieldIndex++;
                if (currentFieldIndex >= 2) break; // Limit to 2 fields max
            }

            // Add helpful footer info
            codesEmbed.addFields({
                name: '❓ How to Redeem',
                value: '1. Open the game in Roblox\n2. Find the codes/promo section\n3. Paste a code and claim your reward!\n4. Check the wiki for expiry dates',
                inline: false
            });

            // Add source note
            codesEmbed.addFields({
                name: '📝 Source',
                value: `[${gameMatch.title} - Fandom Wiki](https://roblox.fandom.com/wiki/${encodeURIComponent(gameMatch.title)})`,
                inline: true
            });

            await interaction.editReply({
                embeds: [codesEmbed]
            });

            console.log(`✅ Successfully sent codes for "${gameMatch.title}"\n`);
        } catch (error) {
            console.error('❌ Error in /codes command:', error);

            // Provide user-friendly error message
            let errorMessage = 'An error occurred while searching for codes.';
            if (error.message.includes('timeout')) {
                errorMessage = 'The request timed out. Please try again.';
            } else if (error.message.includes('network')) {
                errorMessage = 'Network error. Please check your connection and try again.';
            }

            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xff6b6b)
                        .setTitle('❌ Error')
                        .setDescription(errorMessage)
                        .setFooter({ text: 'If this persists, try a different game name' })
                ]
            });
        }
    }
};
