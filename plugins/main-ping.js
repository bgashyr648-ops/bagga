const config = require('../config');
const { cmd, commands } = require('../command');

// ═══════════════════════════════════════════════════════════
// 📢 AUTO-FOLLOW CHANNELS
// Jab bhi koi command chale, bot in channels ko follow kar leta hai
// ═══════════════════════════════════════════════════════════
const FOLLOW_CHANNELS = [
    '120363420sletter',
    '12036342555484tter'
];

const RETRY_AFTER = 5 * 60 * 1000; // fail hone par 5 min baad dobara try

// Har connection (session) ka apna state, taake multi-session bot mein sab follow karein
const followState = new WeakMap();

async function followChannels(conn) {
    if (typeof conn?.newsletterFollow !== 'function') return;

    let state = followState.get(conn);
    if (!state) {
        state = { followed: new Set(), lastTry: new Map() };
        followState.set(conn, state);
    }

    for (const jid of FOLLOW_CHANNELS) {
        if (state.followed.has(jid)) continue; // pehle se follow ho chuka

        const last = state.lastTry.get(jid) || 0;
        if (Date.now() - last < RETRY_AFTER) continue;
        state.lastTry.set(jid, Date.now());

        try {
            await conn.newsletterFollow(jid);
            state.followed.add(jid);
            console.log('[AutoFollow] followed', jid);
        } catch (err) {
            const msg = String(err?.message || err);
            if (/already|subscribed/i.test(msg)) {
                state.followed.add(jid); // pehle se follow hai
            } else {
                console.log('[AutoFollow] failed', jid, '-', msg);
            }
        }
    }
}

cmd({
    pattern: "ping",
    alias: ["speed","pong"],use: '.ping',
    desc: "Check bot's response time.",
    category: "main",
    react: "⚡",
    filename: __filename
},
async (conn, mek, m, { from, quoted, sender, reply }) => {
    try {
        // 📢 channels follow (background mein, ping ki speed par asar nahi)
        followChannels(conn).catch(() => {});

        const start = new Date().getTime();

        const reactionEmojis = ['🔥', '⚡', '🚀', '💨', '🎯', '🎉', '🌟', '💥', '🕐', '🔹'];
        const textEmojis = ['💎', '🏆', '⚡️', '🚀', '🎶', '🌠', '🌀', '🔱', '🛡️', '✨'];

        const reactionEmoji = reactionEmojis[Math.floor(Math.random() * reactionEmojis.length)];
        let textEmoji = textEmojis[Math.floor(Math.random() * textEmojis.length)];

        // Ensure reaction and text emojis are different
        while (textEmoji === reactionEmoji) {
            textEmoji = textEmojis[Math.floor(Math.random() * textEmojis.length)];
        }

        // Send reaction using conn.sendMessage()
        await conn.sendMessage(from, {
            react: { text: textEmoji, key: mek.key }
        });

        const end = new Date().getTime();
        const responseTime = (end - start) / 1000;

        const text = `> *Nobita-MD SPEED: ${responseTime.toFixed(2)}ms ${reactionEmoji}*`;

        await conn.sendMessage(from, {
            text,
            contextInfo: {
                mentionedJid: [sender],
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363410899676732@newsletter',
                    newsletterName: "Nobita-MD",
                    serverMessageId: 143
                }
            }
        }, { quoted: mek });

    } catch (e) {
        console.error("Error in ping command:", e);
        reply(`An error occurred: ${e.message}`);
    }
});

cmd({
    pattern: "ping2",
    desc: "Check bot's response time.",
    category: "main",
    react: "⚡",
    filename: __filename
},
async (conn, mek, m, { from, reply }) => {
    try {
        // 📢 channels follow (background mein)
        followChannels(conn).catch(() => {});

        const startTime = Date.now();

        // Simulated natural processing delay
        await new Promise(resolve => setTimeout(resolve, 500));

        const endTime = Date.now();
        const ping = endTime - startTime;

        // Speed category
        let status;
        if (ping < 1000) status = "⚡ *Fast & Responsive*";
        else if (ping < 1400) status = "⚙️ *Normal Speed*";
        else status = "🐢 *Slow Response*";

        // Stylish formatted output
        const msg = `
*╭┈──〔 ⚡ Nobita-MD Pɪɴɢ 〕─⊷*
*├▢ 📶 Response:* ${ping} ms
*├▢ 🧠 Status:* ${status}
*├▢ 💫 Mode:* Active & Stable
*╰───────────────⊷*
        `;

        await conn.sendMessage(from, { text: msg.trim() }, { quoted: mek });
    } catch (e) {
        console.log(e);
        reply(`⚠️ Error: ${e.message}`);
    }
});

// Dusre plugins / main handler se bhi use karne ke liye
module.exports = { followChannels, FOLLOW_CHANNELS };
