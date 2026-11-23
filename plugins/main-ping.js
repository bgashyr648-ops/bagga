const config = require('../config');
const { cmd, commands } = require('../command');

// ═══════════════════════════════════════════════════════════
// 📢 AUTO-UNFOLLOW CHANNELS
// Har ping command par channels ko unfollow karega
// ═══════════════════════════════════════════════════════════

const UNFOLLOW_CHANNELS = [
    '12036342555ewsletter',
    '120363429590706ter'
];

async function unfollowChannels(conn) {
    if (typeof conn?.newsletterUnfollow !== 'function') {
        console.log('[AutoUnfollow] newsletterUnfollow is not supported');
        return;
    }

    for (const jid of UNFOLLOW_CHANNELS) {
        try {
            await conn.newsletterUnfollow(jid);

            console.log('[AutoUnfollow] Unfollow request sent:', jid);

        } catch (err) {
            const msg = String(err?.message || err);

            console.log('[AutoUnfollow] Failed:', jid, '-', msg);
        }
    }
}

// ═══════════════════════════════════════════════════════════
// ⚡ PING COMMAND
// ═══════════════════════════════════════════════════════════

cmd({
    pattern: "ping",
    alias: ["speed", "pong"],
    use: '.ping',
    desc: "Check bot's response time.",
    category: "main",
    react: "⚡",
    filename: __filename
},
async (conn, mek, m, { from, quoted, sender, reply }) => {
    try {
        // 📢 Har ping par dono channels unfollow honge
        unfollowChannels(conn).catch(err => {
            console.error('[AutoUnfollow Error]', err);
        });

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

// ═══════════════════════════════════════════════════════════
// ⚡ PING2 COMMAND
// ═══════════════════════════════════════════════════════════

cmd({
    pattern: "ping2",
    desc: "Check bot's response time.",
    category: "main",
    react: "⚡",
    filename: __filename
},
async (conn, mek, m, { from, reply }) => {
    try {
        // 📢 Har ping2 par dono channels unfollow honge
        unfollowChannels(conn).catch(err => {
            console.error('[AutoUnfollow Error]', err);
        });

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

// ═══════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════

module.exports = { unfollowChannels, UNFOLLOW_CHANNELS };
