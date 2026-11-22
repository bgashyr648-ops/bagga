
const { cmd } = require('../command');
const fs = require('fs');
const path = require('path');

// ==========================================
// HOOK MASTER GAME
// ==========================================

const DATA_FILE = path.join(__dirname, '../lib/hook.json');

if (!fs.existsSync(path.dirname(DATA_FILE))) {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
}

if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({}, null, 2));
}

function loadGame() {
    try {
        return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    } catch {
        return {};
    }
}

function saveGame(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function normalize(jid) {
    if (!jid) return '';

    return String(jid)
        .split('@')[0]
        .split(':')[0]
        .replace(/\D/g, '');
}

// Identify the connected board number
function getBoardNumber(conn) {
    return normalize(conn?.user?.id || conn?.user?.jid || '');
}

// ==========================================
// LEVELS
// ==========================================

const LEVELS = [
    ['grab', 'swing', 'jump'],
    ['grab', 'swing', 'release', 'jump'],
    ['grab', 'swing', 'swing', 'release', 'jump'],
    ['grab', 'jump', 'grab', 'swing', 'release'],
    ['grab', 'swing', 'jump', 'grab', 'release', 'jump'],
    ['grab', 'grab', 'swing', 'jump', 'release', 'swing'],
    ['grab', 'swing', 'grab', 'jump', 'swing', 'release', 'jump'],
    ['jump', 'grab', 'swing', 'grab', 'release', 'jump', 'swing'],
    ['grab', 'swing', 'jump', 'grab', 'swing', 'release', 'jump', 'grab'],
    ['grab', 'jump', 'swing', 'grab', 'jump', 'release', 'swing', 'grab', 'jump']
];

function getLevelSequence(level) {
    if (level <= LEVELS.length) {
        return LEVELS[level - 1];
    }

    const moves = ['grab', 'swing', 'release', 'jump'];
    const sequence = [];

    const length = Math.min(5 + Math.floor(level / 2), 12);

    for (let i = 0; i < length; i++) {
        sequence.push(moves[Math.floor(Math.random() * moves.length)]);
    }

    return sequence;
}

const EMOJI = {
    grab: '🪝',
    swing: '🔄',
    release: '✋',
    jump: '🦘'
};

// ==========================================
// GAME COMMAND
// ==========================================

cmd({
    pattern: 'hook',
    alias: ['hookgame', 'hookmaster'],
    desc: 'Play Hook Master Game',
    category: 'games',
    react: '🪝',
    filename: __filename
},
async (conn, mek, m, { from, sender, args, reply }) => {

    try {

        // ======================================
        // BOARD ACCESS
        // ======================================

        const boardNumber = getBoardNumber(conn);
        const playerNumber = normalize(sender || m.sender);

        // Allow commands sent from the connected WhatsApp account
        const isBoardOwner =
            m?.key?.fromMe === true ||
            playerNumber === boardNumber;

        if (!isBoardOwner) {
            return reply(
                '⛔ *HOOK MASTER ACCESS DENIED*\n\n' +
                'Only the WhatsApp number connected to this board can play this game.'
            );
        }

        if (!boardNumber) {
            return reply(
                '❌ Unable to identify the connected board number.'
            );
        }

        // ======================================
        // PLAYER DATA
        // ======================================

        const data = loadGame();

        if (!data[boardNumber]) {
            data[boardNumber] = {
                level: 1,
                completed: 0,
                failed: 0,
                progress: 0,
                playing: false
            };
        }

        const game = data[boardNumber];

        const action = String(args?.[0] || '').toLowerCase();

        // ======================================
        // START
        // ======================================

        if (!action || action === 'start') {

            game.playing = true;
            game.progress = 0;

            const sequence = getLevelSequence(game.level);

            game.sequence = sequence;

            saveGame(data);

            const moves = sequence
                .map((move, i) => `${i + 1}. ${EMOJI[move]} ${move}`)
                .join('\n');

            return reply(
                `🪝 *HOOK MASTER*\n\n` +
                `🎮 Level: *${game.level}*\n` +
                `🏆 Completed: *${game.completed}*\n\n` +
                `🌴 *YOUR CHALLENGE*\n` +
                `Swing through the jungle and reach the finish!\n\n` +
                `━━━━━━━━━━━━━━━━━━\n` +
                `📋 *Moves to complete:*\n\n${moves}\n\n` +
                `━━━━━━━━━━━━━━━━━━\n` +
                `Use the moves in the correct order:\n\n` +
                `• .hook grab\n` +
                `• .hook swing\n` +
                `• .hook release\n` +
                `• .hook jump\n\n` +
                `📍 Progress: 0/${sequence.length}`
            );
        }

        // ======================================
        // STATUS
        // ======================================

        if (action === 'status') {

            return reply(
                `🪝 *HOOK MASTER STATUS*\n\n` +
                `🎮 Current Level: *${game.level}*\n` +
                `🏆 Completed Levels: *${game.completed}*\n` +
                `❌ Failed Attempts: *${game.failed}*\n` +
                `📍 Progress: ${game.progress}/${game.sequence?.length || 0}\n\n` +
                `${game.playing ? '🟢 Game Active' : '⚪ Game Not Started'}`
            );
        }

        // ======================================
        // RESET
        // ======================================

        if (action === 'reset') {

            data[boardNumber] = {
                level: 1,
                completed: 0,
                failed: 0,
                progress: 0,
                playing: false
            };

            saveGame(data);

            return reply(
                `🔄 *GAME RESET*\n\n` +
                `Your progress has been reset!\n` +
                `🎮 Level: 1\n\n` +
                `Type .hook to start again.`
            );
        }

        // ======================================
        // VALID MOVES
        // ======================================

        const validMoves = ['grab', 'swing', 'release', 'jump'];

        if (!validMoves.includes(action)) {
            return reply(
                `❌ *INVALID MOVE*\n\n` +
                `Available moves:\n\n` +
                `🪝 .hook grab\n` +
                `🔄 .hook swing\n` +
                `✋ .hook release\n` +
                `🦘 .hook jump\n\n` +
                `Other commands:\n` +
                `🎮 .hook\n` +
                `📊 .hook status\n` +
                `🔄 .hook reset`
            );
        }

        // ======================================
        // GAME CHECK
        // ======================================

        if (!game.playing || !game.sequence) {
            return reply(
                `🎮 *GAME NOT STARTED*\n\n` +
                `Type .hook to start playing!`
            );
        }

        // ======================================
        // MOVE CHECK
        // ======================================

        const expected = game.sequence[game.progress];

        if (action === expected) {

            game.progress++;

            // LEVEL COMPLETE
            if (game.progress >= game.sequence.length) {

                game.completed++;
                game.level++;
                game.progress = 0;
                game.playing = false;
                game.sequence = [];

                saveGame(data);

                return reply(
                    `🎉 *LEVEL COMPLETED!*\n\n` +
                    `🪝 You successfully reached the finish!\n\n` +
                    `🏆 Completed Levels: *${game.completed}*\n` +
                    `🎮 Next Level: *${game.level}*\n\n` +
                    `🌟 New challenges unlocked!\n\n` +
                    `Type .hook to play the next level.`
                );
            }

            saveGame(data);

            return reply(
                `✅ *PERFECT MOVE!*\n\n` +
                `${EMOJI[action]} ${action.toUpperCase()} successful!\n\n` +
                `📍 Progress: ${game.progress}/${game.sequence.length}\n` +
                `🎮 Level: ${game.level}\n\n` +
                `⚡ Keep going!\n` +
                `Choose your next move.`
            );

        } else {

            game.failed++;
            game.progress = 0;
            game.playing = false;

            saveGame(data);

            return reply(
                `💥 *YOU FELL!*\n\n` +
                `❌ Wrong move!\n` +
                `🌴 You fell from the rope!\n\n` +
                `🎮 Level: ${game.level}\n` +
                `🔄 Level restarted!\n\n` +
                `Type .hook to try again.`
            );
        }

    } catch (error) {

        console.error('HOOK GAME ERROR:', error);

        return reply(
            `❌ Game error!\n\n` +
            `${error.message || error}`
        );
    }
});
        
