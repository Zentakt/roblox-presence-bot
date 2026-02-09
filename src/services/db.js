const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../../database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Database connection error:', err);
    } else {
        console.log('✅ Connected to SQLite database');
    }
});

db.run('PRAGMA foreign_keys = ON');

const initDb = () => {
    db.serialize(() => {
        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                discord_id TEXT PRIMARY KEY,
                roblox_user_id TEXT UNIQUE NOT NULL,
                roblox_username TEXT,
                access_token TEXT NOT NULL,
                refresh_token TEXT NOT NULL,
                token_expires_at INTEGER NOT NULL,
                last_state TEXT DEFAULT 'Offline',
                last_place_id TEXT,
                last_game_name TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS guild_config (
                guild_id TEXT PRIMARY KEY,
                target_roblox_id TEXT NOT NULL,
                channel_id TEXT NOT NULL,
                role_id TEXT,
                created_by TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (target_roblox_id) REFERENCES users(roblox_user_id) ON DELETE CASCADE
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS oauth_state (
                state_token TEXT PRIMARY KEY,
                discord_id TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                expires_at DATETIME NOT NULL
            )
        `);

        db.run('CREATE INDEX IF NOT EXISTS idx_users_roblox_id ON users(roblox_user_id)');
        db.run('CREATE INDEX IF NOT EXISTS idx_guild_config_roblox_id ON guild_config(target_roblox_id)');
        db.run('CREATE INDEX IF NOT EXISTS idx_oauth_state_expires ON oauth_state(expires_at)');
    });
};

db.on('open', initDb);

const dbPromise = {
    run: (sql, params = []) => new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve({ lastID: this.lastID, changes: this.changes });
        });
    }),

    get: (sql, params = []) => new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    }),

    all: (sql, params = []) => new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
        });
    }),

    exec: (sql) => new Promise((resolve, reject) => {
        db.exec(sql, (err) => {
            if (err) reject(err);
            else resolve();
        });
    }),

    close: () => new Promise((resolve, reject) => {
        db.close((err) => {
            if (err) reject(err);
            else resolve();
        });
    })
};

module.exports = dbPromise;
