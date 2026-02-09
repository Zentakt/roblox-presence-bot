const axios = require('axios');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('./db');
const auth = require('./auth');

const ROBLOX_PRESENCE_API = 'https://apis.roblox.com/cloud/v2/users/presence';
const ROBLOX_GAMES_API = 'https://games.roblox.com/v1/games';
const ROBLOX_UNIVERSES_API = 'https://apis.roblox.com/universes/v1/places';
const ROBLOX_THUMBNAILS_API = 'https://thumbnails.roblox.com/v1';

class MonitorService {
    constructor(client) {
        this.client = client;
        this.isRunning = false;
        this.lastError = null;
    }

    start() {
        if (this.isRunning) {
            console.warn('⚠️ Monitor is already running');
            return;
        }

        this.isRunning = true;
        console.log('👁️  Roblox Presence Monitor Started');
        console.log(`⏱️  Polling every ${process.env.POLL_INTERVAL_MS || 60000}ms`);

        this.poll().catch(err => console.error('❌ Initial poll error:', err));

        this.interval = setInterval(() => {
            this.poll().catch(err => console.error('❌ Poll error:', err));
        }, parseInt(process.env.POLL_INTERVAL_MS || 60000));
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.isRunning = false;
            console.log('🛑 Presence Monitor Stopped');
        }
    }

    async poll() {
        const targets = await db.all(`
            SELECT DISTINCT target_roblox_id FROM guild_config
        `);

        if (targets.length === 0) return;

        for (const { target_roblox_id } of targets) {
            try {
                await this.checkUserPresence(target_roblox_id);
            } catch (error) {
                console.error(`❌ Error checking user ${target_roblox_id}:`, error.message);
                this.lastError = error.message;
            }
        }
    }

    async checkUserPresence(userId) {
        const token = await auth.getValidToken(userId);
        if (!token) {
            console.warn(`⚠️ No valid token for user ${userId}`);
            return;
        }

        try {
            const response = await axios.post(
                ROBLOX_PRESENCE_API,
                { userIds: [userId] },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                }
            );

            if (!response.data.userPresences || response.data.userPresences.length === 0) {
                console.warn(`⚠️ No presence data for user ${userId}`);
                return;
            }

            const presence = response.data.userPresences[0];
            await this.handleStateChange(userId, presence);
        } catch (error) {
            if (error.response?.status === 429) {
                console.warn('⚠️ Roblox API rate limit hit, backing off...');
            } else if (error.response?.status === 401) {
                console.warn(`⚠️ Token invalid/revoked for user ${userId}`);
            } else {
                console.error(`❌ API error for user ${userId}:`, error.message);
            }
        }
    }

    async handleStateChange(userId, presence) {
        const userRecord = await db.get('SELECT * FROM users WHERE roblox_user_id = ?', [userId]);
        if (!userRecord) return;

        const presenceType = presence.userPresenceType;
        const currentState = presenceType === 2 ? 'InGame' : presenceType === 1 ? 'Online' : 'Offline';
        const previousState = userRecord.last_state || 'Offline';
        const placeId = presence.placeId;
        const previousPlaceId = userRecord.last_place_id;

        await db.run(`
            UPDATE users
            SET last_state = ?, last_place_id = ?, updated_at = CURRENT_TIMESTAMP
            WHERE roblox_user_id = ?
        `, [currentState, placeId, userId]);

        if (currentState === 'InGame' && (previousState !== 'InGame' || placeId !== previousPlaceId)) {
            console.log(`🎮 ${userRecord.roblox_username} started playing!`);
            await this.broadcastNotification(userId, presence);
        }
    }

    async getGameInfo(placeId) {
        try {
            const universeRes = await axios.get(
                `${ROBLOX_UNIVERSES_API}/${placeId}/universe`,
                { timeout: 5000 }
            );

            const universeId = universeRes.data.universeId;

            const gamesRes = await axios.get(
                `${ROBLOX_GAMES_API}?universeIds=${universeId}`,
                { timeout: 5000 }
            );

            const gameData = gamesRes.data.data[0] || {};

            const iconRes = await axios.get(
                `${ROBLOX_THUMBNAILS_API}/games/icons?universeIds=${universeId}&size=768x432&format=Png&isCircular=false`,
                { timeout: 5000 }
            );

            const gameIcon = iconRes.data.data?.[0]?.imageUrl || null;

            return {
                gameId: universeId,
                gameName: gameData.name || 'Unknown Experience',
                gameIcon: gameIcon,
                gameUrl: `https://www.roblox.com/games/${placeId}`
            };
        } catch (error) {
            console.warn(`⚠️ Failed to fetch game info for place ${placeId}:`, error.message);
            return {
                gameId: null,
                gameName: 'Unknown Experience',
                gameIcon: null,
                gameUrl: `https://www.roblox.com/games/${placeId}`
            };
        }
    }

    async getUserAvatar(userId) {
        try {
            const res = await axios.get(
                `${ROBLOX_THUMBNAILS_API}/users/avatar-headshot?userIds=${userId}&size=420x420&format=Png&isCircular=true`,
                { timeout: 5000 }
            );

            return res.data.data?.[0]?.imageUrl || null;
        } catch (error) {
            console.warn(`⚠️ Failed to fetch avatar for user ${userId}:`, error.message);
            return null;
        }
    }

    async buildNotificationEmbed(userId, presence) {
        const user = await db.get('SELECT * FROM users WHERE roblox_user_id = ?', [userId]);
        const gameInfo = await this.getGameInfo(presence.placeId);
        const avatar = await this.getUserAvatar(userId);

        const embed = new EmbedBuilder()
            .setColor(0x00b06f)
            .setTitle('🎮 Roblox Activity Alert')
            .setDescription(`**${user.roblox_username}** is now playing Roblox!\n\nClick the button below to join the game.`)
            .setThumbnail(avatar)
            .addFields(
                {
                    name: '👤 Player',
                    value: user.roblox_username,
                    inline: true
                },
                {
                    name: '🟢 Status',
                    value: 'Playing',
                    inline: true
                },
                {
                    name: '🎮 Game',
                    value: gameInfo.gameName,
                    inline: false
                }
            );

        if (gameInfo.gameIcon) {
            embed.setImage(gameInfo.gameIcon);
        }

        embed.setFooter({
            text: 'Join now before the server fills up!',
            iconURL: 'https://www.roblox.com/favicon.ico'
        }).setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('🚀 Join Game')
                .setStyle(ButtonStyle.Link)
                .setURL(gameInfo.gameUrl),
            new ButtonBuilder()
                .setLabel('👤 View Profile')
                .setStyle(ButtonStyle.Link)
                .setURL(`https://www.roblox.com/users/${userId}/profile`)
        );

        return { embed, row };
    }

    async broadcastNotification(userId, presence) {
        const subscribers = await db.all(`
            SELECT * FROM guild_config WHERE target_roblox_id = ?
        `, [userId]);

        if (subscribers.length === 0) {
            console.warn(`⚠️ No subscribers for user ${userId}`);
            return;
        }

        const { embed, row } = await this.buildNotificationEmbed(userId, presence);

        for (const sub of subscribers) {
            try {
                const channel = await this.client.channels.fetch(sub.channel_id);
                if (!channel) {
                    console.warn(`⚠️ Channel ${sub.channel_id} not found`);
                    continue;
                }

                const content = sub.role_id ? `<@&${sub.role_id}>` : '';
                await channel.send({
                    content: content || undefined,
                    embeds: [embed],
                    components: [row]
                });

                console.log(`✅ Notification sent to guild ${sub.guild_id}`);
            } catch (err) {
                console.error(`❌ Failed to send notification to ${sub.guild_id}:`, err.message);
            }
        }
    }

    async getStatus() {
        const targets = await db.get('SELECT COUNT(*) as count FROM guild_config');
        const users = await db.get('SELECT COUNT(*) as count FROM users');

        return {
            isRunning: this.isRunning,
            activeTargets: targets?.count || 0,
            linkedUsers: users?.count || 0,
            lastError: this.lastError,
            pollInterval: parseInt(process.env.POLL_INTERVAL_MS || 60000)
        };
    }
}

module.exports = MonitorService;
