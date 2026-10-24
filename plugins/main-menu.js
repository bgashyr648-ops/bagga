const config = require('../config');
const { cmd, commands } = require('../command');
const path = require('path');
const fs = require('fs');
const { runtime } = require('../lib/functions');
const axios = require('axios');

// Small caps text
const toSmallCaps = (text) => {
    if (!text || typeof text !== 'string') return '';

    const map = {
        a:'ᴀ',b:'ʙ',c:'ᴄ',d:'ᴅ',e:'ᴇ',f:'ғ',g:'ɢ',h:'ʜ',i:'ɪ',
        j:'ᴊ',k:'ᴋ',l:'ʟ',m:'ᴍ',n:'ɴ',o:'ᴏ',p:'ᴘ',q:'ǫ',r:'ʀ',
        s:'s',t:'ᴛ',u:'ᴜ',v:'ᴠ',w:'ᴡ',x:'x',y:'ʏ',z:'ᴢ'
    };

    return text.split('').map(char => map[char.toLowerCase()] || char).join('');
};

// Format category
const formatCategory = (category, cmds) => {
    const validCmds = cmds.filter(
        c => c.pattern && c.pattern.trim() !== ''
    );

    if (!validCmds.length) return '';

    const title =
        `\n\`『 ${toSmallCaps(category.toUpperCase())} 』\`\n` +
        `╭───────────────────⊷\n`;

    const body = validCmds.map(c =>
        `*┋ ⬡ ${toSmallCaps(c.pattern)}*`
    ).join('\n');

    return `${title}${body}\n╰───────────────────⊷`;
};

// Paths
const BOT_IMAGE =
    "https://raw.githubusercontent.com/bgashyr648-ops/dp/main/ns.jpg";

const LIB_PATH = path.join(__dirname, '../lib');
const CUSTOM_DP_PATH = path.join(LIB_PATH, 'custom_dp.jpg');
const CUSTOM_VOICE_PATH = path.join(LIB_PATH, 'custom_menu_voice.mp3');
const VOICE_META_PATH = CUSTOM_VOICE_PATH + '.json';
const DEFAULT_VOICE_PATH = path.join(LIB_PATH, 'love.mp3');

fs.mkdirSync(LIB_PATH, { recursive: true });

// Download media and always return a Buffer
async function getMediaBuffer(conn, quoted) {
    if (!quoted) {
        throw new Error('Reply to an image, audio or voice note first.');
    }

    // Pass the complete quoted object to the existing bot helper.
    const result = await conn.downloadAndSaveMediaMessage(quoted);

    if (Buffer.isBuffer(result) && result.length) {
        return result;
    }

    if (
        typeof result === 'string' &&
        fs.existsSync(result) &&
        fs.statSync(result).isFile()
    ) {
        const buffer = fs.readFileSync(result);

        // Remove temporary downloaded file after reading it.
        if (path.resolve(result) !== path.resolve(CUSTOM_DP_PATH) &&
            path.resolve(result) !== path.resolve(CUSTOM_VOICE_PATH)) {
            try {
                fs.unlinkSync(result);
            } catch (_) {}
        }

        if (buffer.length) return buffer;
    }

    throw new Error('Media download failed or returned empty data.');
}

// ==========================================
// 1. SET MENU DP (.dp)
// ==========================================
cmd({
    pattern: "dp",
    alias: ["setdp", "menudp"],
    use: '.dp (Reply to an image)',
    desc: "Set custom image for bot menu",
    category: "main",
    react: "🖼️",
    filename: __filename
},
async (conn, mek, m, { quoted, reply }) => {
    try {
        if (!quoted) {
            return reply(
                "⚠️ Kisi image par reply karke .dp likhein!"
            );
        }

        const mediaBuffer = await getMediaBuffer(conn, quoted);

        // Atomic replacement prevents an incomplete custom image.
        const tempPath = CUSTOM_DP_PATH + '.tmp';

        fs.writeFileSync(tempPath, mediaBuffer);
        fs.renameSync(tempPath, CUSTOM_DP_PATH);

        return reply(
            "✅ *Bot Menu DP Successfully Changed!*\n\n" +
            "Ab `.m` ya `.menu` likh kar check karein."
        );

    } catch (e) {
        console.error('SET DP ERROR:', e);

        return reply(
            `❌ DP change nahi hui: ${e.message || e}`
        );
    }
});

// ==========================================
// 2. SET MENU VOICE (.setvoice)
// ==========================================
cmd({
    pattern: "setvoice",
    alias: ["menuvoice", "setmenuvoice"],
    use: '.setvoice (Reply to an audio/voice)',
    desc: "Set custom audio for bot menu",
    category: "main",
    react: "🎙️",
    filename: __filename
},
async (conn, mek, m, { quoted, reply }) => {
    try {
        if (!quoted) {
            return reply(
                "⚠️ Audio ya voice note par reply karke .setvoice likhein!"
            );
        }

        const mediaBuffer = await getMediaBuffer(conn, quoted);

        // Preserve the original MIME type when available.
        const mimeType =
            quoted.mimetype ||
            quoted.msg?.mimetype ||
            quoted.message?.audioMessage?.mimetype ||
            quoted.message?.documentMessage?.mimetype ||
            "audio/mpeg";

        const tempPath = CUSTOM_VOICE_PATH + '.tmp';

        fs.writeFileSync(tempPath, mediaBuffer);
        fs.renameSync(tempPath, CUSTOM_VOICE_PATH);

        fs.writeFileSync(
            VOICE_META_PATH,
            JSON.stringify({
                mimetype: mimeType,
                ptt: mimeType.includes('ogg')
            })
        );

        return reply(
            "✅ *Bot Menu Voice Successfully Changed!*\n\n" +
            "Ab `.m` ya `.menu` likh kar check karein."
        );

    } catch (e) {
        console.error('SETVOICE ERROR:', e);

        return reply(
            `❌ Voice change nahi hui: ${e.message || e}`
        );
    }
});

// ==========================================
// 3. MAIN MENU (.menu)
// ==========================================
cmd({
    pattern: "menu",
    alias: ["m", "help", "allmenu", "fullmenu"],
    use: '.menu',
    desc: "Show all bot commands",
    category: "main",
    react: "⚡",
    filename: __filename
},
async (conn, mek, m, {
    from, reply, userConfig
}) => {
    try {
        await conn.sendPresenceUpdate('composing', from);

        const allCommands = Object.values(commands);
        const totalCommands = allCommands.length;

        const categories = [
            ...new Set(allCommands.map(c => c.category))
        ].filter(cat =>
            typeof cat === 'string' &&
            cat.trim() !== '' &&
            cat !== 'undefined'
        );

        const categorized = {};

        categories.forEach(cat => {
            const categoryCommands = allCommands.filter(
                c => c.category === cat &&
                c.pattern &&
                c.pattern.trim() !== ''
            );

            if (categoryCommands.length) {
                categorized[cat] = categoryCommands;
            }
        });

        let menuSections = '';

        for (const [category, categoryCommands] of
            Object.entries(categorized)) {
            menuSections += formatCategory(category, categoryCommands);
        }

        const BOT_NAME =
            userConfig?.BOT_NAME || config.BOT_NAME || "Bot";

        const OWNER_NAME =
            userConfig?.OWNER_NAME || config.OWNER_NAME || "Owner";

        const PREFIX =
            userConfig?.PREFIX || config.PREFIX || ".";

        const MODE =
            userConfig?.MODE || config.MODE || "private";

        const VERSION =
            userConfig?.VERSION || config.VERSION || "1.0.0";

        const DESCRIPTION =
            userConfig?.DESCRIPTION || config.DESCRIPTION || "";

        const dec = `*╭┈───〔 ${BOT_NAME} 〕┈───⊷*
*├▢ 🤖 ${toSmallCaps('Owner')}:* ${OWNER_NAME}
*├▢ 📜 ${toSmallCaps('Commands')}:* ${totalCommands}
*├▢ ⏱️ ${toSmallCaps('Runtime')}:* ${runtime(process.uptime())}
*├▢ 📦 ${toSmallCaps('Prefix')}:* ${PREFIX}
*├▢ ⚙️ ${toSmallCaps('Mode')}:* ${MODE}
*├▢ 🏷️ ${toSmallCaps('Version')}:* ${VERSION}
*╰───────────────────⊷*
${menuSections}

> ${DESCRIPTION || ''}`;

        // 1. Read the selected menu DP.
        let imageBuffer = null;

        try {
            if (
                fs.existsSync(CUSTOM_DP_PATH) &&
                fs.statSync(CUSTOM_DP_PATH).isFile()
            ) {
                imageBuffer = fs.readFileSync(CUSTOM_DP_PATH);
            } else {
                const response = await axios.get(BOT_IMAGE, {
                    responseType: 'arraybuffer',
                    timeout: 15000
                });

                imageBuffer = Buffer.from(response.data);
            }
        } catch (err) {
            console.error('MENU IMAGE ERROR:', err.message);
        }

        // 2. Send menu image and caption.
        if (imageBuffer && imageBuffer.length) {
            await conn.sendMessage(from, {
                image: imageBuffer,
                caption: dec,
                contextInfo: {
                    mentionedJid: [m.sender],
                    forwardingScore: 999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363410899676732@newsletter',
                        newsletterName: BOT_NAME,
                        serverMessageId: 143
                    }
                }
            }, { quoted: mek });
        } else {
            await conn.sendMessage(from, {
                text: dec + '\n\n⚠️ Menu image could not be loaded.',
                contextInfo: {
                    mentionedJid: [m.sender]
                }
            }, { quoted: mek });
        }

        // 3. Send custom voice, or default love.mp3.
        try {
            let audioBuffer = null;
            let mimeType = 'audio/mpeg';
            let isPtt = false;

            if (
                fs.existsSync(CUSTOM_VOICE_PATH) &&
                fs.statSync(CUSTOM_VOICE_PATH).isFile()
            ) {
                audioBuffer = fs.readFileSync(CUSTOM_VOICE_PATH);

                if (fs.existsSync(VOICE_META_PATH)) {
                    try {
                        const meta = JSON.parse(
                            fs.readFileSync(VOICE_META_PATH, 'utf8')
                        );

                        mimeType = meta.mimetype || 'audio/mpeg';
                        isPtt = Boolean(meta.ptt);
                    } catch (_) {}
                }
            } else if (
                fs.existsSync(DEFAULT_VOICE_PATH) &&
                fs.statSync(DEFAULT_VOICE_PATH).isFile()
            ) {
                audioBuffer = fs.readFileSync(DEFAULT_VOICE_PATH);
            }

            if (audioBuffer && audioBuffer.length) {
                await conn.sendMessage(from, {
                    audio: audioBuffer,
                    mimetype: mimeType,
                    ptt: isPtt
                }, { quoted: mek });
            }
        } catch (audioError) {
            console.error('MENU AUDIO ERROR:', audioError);
        }

    } catch (e) {
        console.error('MENU COMMAND ERROR:', e);

        return reply(`Error: ${e.message || e}`);
    }
});
