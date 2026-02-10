const mongoose = require('mongoose');

// --- Schemas ---

const userSchema = new mongoose.Schema({
    discord_id: { type: String, required: true, unique: true },
    roblox_user_id: { type: String, required: true, unique: true },
    roblox_username: String,
    access_token: { type: String, required: true },
    refresh_token: { type: String, required: true },
    token_expires_at: { type: Date, required: true },
    last_state: { type: String, default: 'Offline' },
    last_place_id: String,
    last_game_name: String,
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
});

const guildConfigSchema = new mongoose.Schema({
    guild_id: { type: String, required: true, unique: true },
    target_roblox_id: { type: String, required: true, ref: 'User' },
    channel_id: { type: String, required: true },
    role_id: String,
    created_by: { type: String, required: true },
    created_at: { type: Date, default: Date.now }
});

const oauthStateSchema = new mongoose.Schema({
    state_token: { type: String, required: true, unique: true },
    discord_id: { type: String, required: true },
    created_at: { type: Date, default: Date.now },
    expires_at: { type: Date, required: true }
});

// --- Models ---

const User = mongoose.model('User', userSchema);
const GuildConfig = mongoose.model('GuildConfig', guildConfigSchema);
const OAuthState = mongoose.model('OAuthState', oauthStateSchema);

// --- Connection ---

const connect = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI environment variable is not set');
        }
        
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
};

module.exports = {
    connect,
    User,
    GuildConfig,
    OAuthState
};
