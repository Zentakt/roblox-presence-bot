const axios = require('axios');
const { User, OAuthState } = require('./db');
const { encrypt, decrypt } = require('../utils/crypto');
const crypto = require('crypto');

const ROBLOX_TOKEN_URL = 'https://apis.roblox.com/oauth/v1/token';
const ROBLOX_USER_INFO = 'https://apis.roblox.com/oauth/v1/userinfo';

class RobloxAuth {
    generateStateToken(discordId) {
        const stateToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        OAuthState.create({
            state_token: stateToken,
            discord_id: discordId,
            expires_at: expiresAt
        }).catch(err => {
            console.error('Error saving state token:', err);
        });

        return stateToken;
    }

    async verifyStateToken(stateToken) {
        try {
            const result = await OAuthState.findOne({
                state_token: stateToken,
                expires_at: { $gt: new Date() }
            });

            if (result) {
                await OAuthState.deleteOne({ state_token: stateToken });
                return result.discord_id;
            }

            return null;
        } catch (error) {
            console.error('Error verifying state token:', error);
            return null;
        }
    }

    async exchangeCode(code, discordId) {
        const params = new URLSearchParams({
            client_id: process.env.ROBLOX_CLIENT_ID,
            client_secret: process.env.ROBLOX_CLIENT_SECRET,
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: process.env.ROBLOX_REDIRECT_URI
        });

        try {
            const { data: tokenData } = await axios.post(ROBLOX_TOKEN_URL, params, {
                timeout: 10000,
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });

            const { data: userInfo } = await axios.get(ROBLOX_USER_INFO, {
                headers: { Authorization: `Bearer ${tokenData.access_token}` },
                timeout: 10000
            });

            await this.saveTokens(discordId, userInfo.sub, userInfo.preferred_username, tokenData);

            return {
                robloxUserId: userInfo.sub,
                username: userInfo.preferred_username,
                email: userInfo.email || null
            };
        } catch (error) {
            console.error('❌ OAuth Exchange Failed:', error.response?.data || error.message);
            throw new Error(
                error.response?.data?.error_description ||
                'Failed to exchange authorization code. Please try again.'
            );
        }
    }

    async getValidToken(robloxUserId) {
        try {
            const user = await User.findOne({ roblox_user_id: robloxUserId });

            if (!user) {
                console.warn(`⚠️ No user record found for ${robloxUserId}`);
                return null;
            }

            if (Date.now() < new Date(user.token_expires_at).getTime() - 60000) {
                try {
                    const decrypted = decrypt(JSON.parse(user.access_token));
                    return decrypted;
                } catch (error) {
                    console.error('❌ Failed to decrypt access token:', error.message);
                    return null;
                }
            }

            return await this.refreshToken(user.discord_id, robloxUserId, user.refresh_token);
        } catch (error) {
            console.error('Error getting valid token:', error);
            return null;
        }
    }

    async refreshToken(discordId, robloxUserId, encryptedRefreshToken) {
        try {
            const decryptedRefresh = decrypt(JSON.parse(encryptedRefreshToken));

            const params = new URLSearchParams({
                client_id: process.env.ROBLOX_CLIENT_ID,
                client_secret: process.env.ROBLOX_CLIENT_SECRET,
                grant_type: 'refresh_token',
                refresh_token: decryptedRefresh
            });

            const { data: tokenData } = await axios.post(ROBLOX_TOKEN_URL, params, {
                timeout: 10000,
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });

            const encAccess = JSON.stringify(encrypt(tokenData.access_token));
            const encRefresh = JSON.stringify(encrypt(tokenData.refresh_token));
            const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

            await User.updateOne(
                { discord_id: discordId },
                {
                    access_token: encAccess,
                    refresh_token: encRefresh,
                    token_expires_at: expiresAt,
                    updated_at: new Date()
                }
            );

            console.log(`✅ Token refreshed for ${robloxUserId}`);
            return tokenData.access_token;
        } catch (error) {
            if (error.response?.status === 401) {
                console.warn(`⚠️ Refresh token revoked for ${robloxUserId}. User needs to re-authorize.`);
                return null;
            }
            console.error(`❌ Token refresh failed for ${robloxUserId}:`, error.message);
            return null;
        }
    }

    async saveTokens(discordId, robloxId, username, tokenData) {
        try {
            const encAccess = JSON.stringify(encrypt(tokenData.access_token));
            const encRefresh = JSON.stringify(encrypt(tokenData.refresh_token));
            const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

            await User.findOneAndUpdate(
                { discord_id: discordId },
                {
                    roblox_user_id: robloxId,
                    roblox_username: username,
                    access_token: encAccess,
                    refresh_token: encRefresh,
                    token_expires_at: expiresAt,
                    updated_at: new Date(),
                    // Ensure created_at is only set on insert, not update (handled by default if not specified in update)
                    $setOnInsert: { created_at: new Date(), last_state: 'Offline' }
                },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );

            console.log(`✅ Tokens saved for user ${username}`);
        } catch (error) {
            console.error('Error saving tokens:', error);
            throw error;
        }
    }

    async revokeTokens(discordId) {
        try {
            await User.deleteOne({ discord_id: discordId });
            console.log(`✅ Tokens revoked for user ${discordId}`);
        } catch (error) {
            console.error('Error revoking tokens:', error);
            throw error;
        }
    }
}

module.exports = new RobloxAuth();
