
const { cmd } = require('../command');
const config = require('../config');
const fs = require('fs');
const path = require('path');

// ==========================================
// HOOK MASTER - SINGLE PLAYER LEVEL GAME
// ==========================================

const DATA_PATH = path.join(__dirname, '../lib/hookgame.json');

if (!fs.existsSync(path.dirname(DATA_PATH))) {
    fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
}

if (!fs.existsSync(DATA_PATH)) {
    fs.writeFileSync(DATA_PATH, JSON.stringify({}, null, 2));
}

function loadData() {
    try {
        return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
    } catch {
        return {};
    }
}

function saveData(data) {
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
}

// Normalize WhatsApp number
function normalizeNumber(jid) {
    return String(jid || '').split('@')[0].replace(/\D/g, '');
}

// Board owner access
function getAllowedNumbers() {
    const owners =
        config.GAME_OWNER_NUMBER ||
        config.OWNER_NUMBER ||
        config.OWNER ||
        [];

    if (Array.isArray(owners)) {
        return owners.map(normalizeNumber);
    }

    return [normalizeNumber(owners)];
}

function isAllowed(sender) {
    const allowed = getAllowedNumbers().filter(Boolean);

    return allowed.includes(normalizeNumber(sender));
}

// Game action sequence
function createLevel(level) {
    const actions = ['grab', 'swing', 'release', 'jump'];

    let sequence = [];

    const length = Math.min(3 + Math.floor(level / 2), 7);

    for (let i = 0; i < length; i++) {
        sequence.push(
            actions[Math.floor(Math.random() * actions.length)]
        );
    }

    return sequence;
}

function actionEmoji(action) {
    const emojis = {
        grab: '🪝',
        swing: '🔄',
        release: '✋',
        jump: '🦘'
    };

    return emojis[action] || '🎮';
}

// ==========================================
// GAME COMMAND
// ==========================================

cmd({
    pattern: "hook",
    alias: ["hookgame", "hookmaster"],
    desc: "Play Hook Master Level Game",
    category: "games",
    react: "🪝",
    filename: __filename
},
async (conn, mek, m, { from, sender, args, reply }) => {

    try {

        // Only board owner can play
        if (!isAllowed(sender || m.sender)) {
            return reply(
                "⛔ *HOOK MASTER ACCESS DENIED*\n\n" +
                "This game is only available for the board owner."
            );
        }

        const player = normalizeNumber(sender || m.sender);
        const data = loadData();

        if (!data[player]) {
            data[player] = {
                level: 1,
                wins: 0,
                failures: 0,
                sequence: [],
                progress: 0,
                playing: false
            };
        }

        const game = data[player];

        const action = String(args?.[0] || '').toLowerCase();

        // ======================================
        // START GAME
        // ======================================

        if (!action || action === 'start') {

            if (!game.playing) {
                game.sequence = createLevel(game.level);
                game.progress = 0;
                game.playing = true;
            }

            saveData(data);

            return reply(
                `🪝 *HOOK MASTER*\n\n` +
                `🎮 Level: *${game.level}*\n` +
                `🏆 Completed Levels: *${game.wins}*\n\n` +
                `🌴 You are swinging through the jungle!\n` +
                `Avoid obstacles and reach the finish.\n\n` +
                `━━━━━━━━━━━━━━━━━━\n` +
                `🎯 *Your Moves:*\n\n` +
                `🪝 .hook grab\n` +
                `🔄 .hook swing\n` +
                `✋ .hook release\n` +
                `🦘 .hook jump\n\n` +
                `━━━━━━━━━━━━━━━━━━\n` +
                `📍 Progress: ${game.progress}/${game.sequence.length}\n\n` +
                `Choose your next move!`
            );
        }

        // ======================================
        // STATUS
        // ======================================

        if (action === 'status') {

            return reply(
                `🪝 *HOOK MASTER STATUS*\n\n` +
                `🎮 Current Level: *${game.level}*\n` +
                `🏆 Levels Completed: *${game.wins}*\n` +
                `❌ Failed Attempts: *${game.failures}*\n` +
                `📍 Current Progress: ${game.progress}/${game.sequence.length}\n\n` +
                `${game.playing ? '🟢 Game Active' : '⚪ Game Not Started'}`
            );
        }

        // ======================================
        // RESET
        // ======================================

        if (action === 'reset') {

            data[player] = {
                level: 1,
                wins: 0,
                failures: 0,
                sequence: [],
                progress: 0,
                playing: false
            };

            saveData(data);

            return reply(
                "🔄 *HOOK MASTER RESET*\n\n" +
                "Your game has been reset.\n" +
                "🎮 Level: 1\n\n" +
                "Type `.hook` to start again!"
            );
        }

        // ======================================
        // VALID ACTIONS
        // ======================================

        const validActions = ['grab', 'swing', 'release', 'jump'];

        if (!validActions.includes(action)) {

            return reply(
                `❌ Invalid move!\n\n` +
                `Available moves:\n` +
                `🪝 grab\n` +
                `🔄 swing\n` +
                `✋ release\n` +
                `🦘 jump\n\n` +
                `Example: .hook swing`
            );
        }

        // ======================================
        // GAME NOT STARTED
        // ======================================

        if (!game.playing) {
            return reply(
                "🎮 Game is not active!\n\n" +
                "Type `.hook` to start playing."
            );
        }

        // ======================================
        // CHECK MOVE
        // ======================================

        const expected = game.sequence[game.progress];

        if (action === expected) {

            game.progress++;

            // Level completed
            if (game.progress >= game.sequence.length) {

                game.wins++;
                game.level++;

                game.progress = 0;
                game.sequence = createLevel(game.level);

                saveData(data);

                return reply(
                    `🎉 *LEVEL COMPLETED!*\n\n` +
                    `🪝 You successfully completed the level!\n\n` +
                    `🏆 Levels Completed: *${game.wins}*\n` +
                    `🎮 Next Level: *${game.level}*\n\n` +
                    `━━━━━━━━━━━━━━━━━━\n` +
                    `🌟 New obstacles unlocked!\n\n` +
                    `Type `.hook` to continue your adventure.`
                );
            }

            saveData(data);

            return reply(
                `✅ *PERFECT MOVE!*\n\n` +
                `${actionEmoji(action)} ${action.toUpperCase()} successful!\n\n` +
                `📍 Progress: ${game.progress}/${game.sequence.length}\n` +
                `🎮 Level: ${game.level}\n\n` +
                `⚡ Keep going!\n` +
                `Choose your next move.`
            );

        } else {

            game.failures++;
            game.progress = 0;

            saveData(data);

            return reply(
                `💥 *OOPS! YOU MISSED!*\n\n` +
                `❌ Wrong move!\n` +
                `🌴 You fell down from the rope!\n\n` +
                `🎮 Level: ${game.level}\n` +
                `🔄 Level restarted!\n\n` +
                `🪝 Try again!\n` +
                `Type `.hook` to continue.`
            );
        }

    } catch (error) {

        console.error('HOOK GAME ERROR:', error);

        return reply(
            "❌ Game error!\nPlease try again."
        );
    }
});
