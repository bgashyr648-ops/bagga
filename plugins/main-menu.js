Const config = require('../config')
const { cmd, commands } = require('../command');
const path = require('path');
const os = require("os")
const fs = require('fs');
const {runtime} = require('../lib/functions')
const axios = require('axios')

// Helper function for small caps text
const toSmallCaps = (text) => {
    if (!text || typeof text !== 'string') return '';
    const smallCapsMap = {
        'a': 'ᴀ', 'b': 'ʙ', 'c': 'ᴄ', 'd': 'ᴅ', 'e': 'ᴇ', 'f': 'ғ', 'g': 'ɢ', 'h': 'ʜ', 'i': 'ɪ',
        'j': 'ᴊ', 'k': 'ᴋ', 'l': 'ʟ', 'm': 'ᴍ', 'n': 'ɴ', 'o': 'ᴏ', 'p': 'ᴘ', 'q': 'ǫ', 'r': 'ʀ',
        's': 's', 't': 'ᴛ', 'u': 'ᴜ', 'v': 'ᴠ', 'w': 'ᴡ', 'x': 'x', 'y': 'ʏ', 'z': 'ᴢ',
        'A': 'ᴀ', 'B': 'ʙ', 'C': 'ᴄ', 'D': 'ᴅ', 'E': 'ᴇ', 'F': 'ғ', 'G': 'ɢ', 'H': 'ʜ', 'I': 'ɪ',
        'J': 'ᴊ', 'K': 'ᴋ', 'L': 'ʟ', 'M': 'ᴍ', 'N': 'ɴ', 'O': 'ᴏ', 'P': 'ᴘ', 'Q': 'ǫ', 'R': 'ʀ',
        'S': 's', 'T': 'ᴛ', 'U': 'ᴜ', 'V': 'ᴠ', 'W': 'ᴡ', 'X': 'x', 'Y': 'ʏ', 'Z': 'ᴢ'
    };
    return text.split('').map(char => smallCapsMap[char] || char).join('');
};

// Format category
const formatCategory = (category, cmds) => {
    const validCmds = cmds.filter(cmd => cmd.pattern && cmd.pattern.trim() !== '');
    if (validCmds.length === 0) return '';

    let title = `\n\`『 ${toSmallCaps(category.toUpperCase())} 』\`\n╭───────────────────⊷\n`;
    let body = validCmds.map(cmd => {
        const commandName = cmd.pattern || '';
        return `*┋ ⬡ ${toSmallCaps(commandName)}*`;
    }).join('\n');
    let footer = `\n╰───────────────────⊷`;
    return `${title}${body}${footer}`;
};

// Paths & Default Images
const BOT_IMAGE = "https://raw.githubusercontent.com/bgashyr648-ops/dp/main/ns.jpg";
const CUSTOM_DP_PATH = path.join(__dirname, '../lib/custom_dp.jpg');
const CUSTOM_VOICE_PATH = path.join(__dirname, '../lib/custom_menu_voice.mp3');
const DEFAULT_VOICE_PATH = path.join(__dirname, '../lib/love.mp3');

// ==========================================
// 1. SET MENU DP COMMAND (.dp)
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
async (conn, mek, m, { from, quoted, reply }) => {
    try {
        const mime = quoted?.mtype || m.mtype;
        if (!quoted || !/image/.test(mime)) {
            return reply("⚠️ Please reply to an image with *.dp* to set your custom Menu DP!");
        }

        const mediaBuffer = await conn.downloadAndSaveMediaMessage(quoted);
        if (!mediaBuffer) {
            return reply("❌ Failed to download image. Try again.");
        }

        fs.copyFileSync(mediaBuffer, CUSTOM_DP_PATH);
        if (fs.existsSync(mediaBuffer)) fs.unlinkSync(mediaBuffer);

        return reply("✅ *Aapki Bot Menu DP Successfully Lag Gayi Hai!*\n\nAb `.m` ya `.menu` likhne par wahi nayi photo aayegi.");
    } catch (e) {
        console.error('Error setting DP:', e);
        reply(`Error setting DP: ${e.message || e}`);
    }
});

// ==========================================
// 2. SET MENU VOICE COMMAND (.setvoice)
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
async (conn, mek, m, { from, quoted, reply }) => {
    try {
        const mime = quoted?.mtype || m.mtype;
        if (!quoted || (!/audio/.test(mime) && !/voice/.test(mime))) {
            return reply("⚠️ Please reply to an audio or voice note with *.setvoice*!");
        }

        const mediaBuffer = await conn.downloadAndSaveMediaMessage(quoted);
        if (!mediaBuffer) {
            return reply("❌ Failed to download audio. Try again.");
        }

        fs.copyFileSync(mediaBuffer, CUSTOM_VOICE_PATH);
        if (fs.existsSync(mediaBuffer)) fs.unlinkSync(mediaBuffer);

        return reply("✅ *Aapki Bot Menu Voice Successfully Lag Gayi Hai!*\n\nAb `.m` ya `.menu` likhne par yahi naya audio aayega.");
    } catch (e) {
        console.error('Error setting Voice:', e);
        reply(`Error setting Voice: ${e.message || e}`);
    }
});

// ==========================================
// 3. MAIN MENU COMMAND (.menu)
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
    from, quoted, body, isCmd, command, args, q, isGroup,
    sender, senderNumber, botNumber2, botNumber, pushname,
    isMe, isOwner, groupMetadata, groupName, participants,
    groupAdmins, isBotAdmins, isAdmins, reply, userConfig
}) => {
    try {
        await conn.sendPresenceUpdate('composing', from);

        let totalCommands = Object.keys(commands).length;

        const categories = [...new Set(Object.values(commands).map(c => c.category))]
            .filter(cat => cat && cat.trim() !== '' && cat !== 'undefined');

        const categorized = {};
        categories.forEach(cat => {
            const categoryCommands = Object.values(commands).filter(c => c.category === cat);
            const validCommands = categoryCommands.filter(cmd => cmd.pattern && cmd.pattern.trim() !== '');
            if (validCommands.length > 0) {
                categorized[cat] = validCommands;
            }
        });

        let menuSections = '';
        for (const [category, cmds] of Object.entries(categorized)) {
            if (cmds && cmds.length > 0) {
                const section = formatCategory(category, cmds);
                if (section !== '') {
                    menuSections += section;
                }
            }
        }

        const BOT_NAME = userConfig?.BOT_NAME || config.BOT_NAME || "Bot";
        const OWNER_NAME = userConfig?.OWNER_NAME || config.OWNER_NAME || "Owner";
        const PREFIX = userConfig?.PREFIX || config.PREFIX || ".";
        const MODE = userConfig?.MODE || config.MODE || "private";
        const VERSION = userConfig?.VERSION || config.VERSION || "1.0.0";
        const DESCRIPTION = userConfig?.DESCRIPTION || config.DESCRIPTION || "";

        let dec = `*╭┈───〔 ${BOT_NAME} 〕┈───⊷*
*├▢ 🤖 ${toSmallCaps('Owner')}:* ${OWNER_NAME}
*├▢ 📜 ${toSmallCaps('Commands')}:* ${totalCommands}
*├▢ ⏱️ ${toSmallCaps('Runtime')}:* ${runtime(process.uptime())}
*├▢ 📦 ${toSmallCaps('Prefix')}:* ${PREFIX}
*├▢ ⚙️ ${toSmallCaps('Mode')}:* ${MODE}
*├▢ 🏷️ ${toSmallCaps('Version')}:* ${VERSION}
*╰───────────────────⊷*
${menuSections}

> ${DESCRIPTION || ''}`;

        // 1. Handle DP Image (Custom or Default)
        let imageToUse;
        try {
            if (fs.existsSync(CUSTOM_DP_PATH)) {
                imageToUse = fs.readFileSync(CUSTOM_DP_PATH);
            } else {
                const response = await axios.get(BOT_IMAGE, {
                    responseType: 'arraybuffer',
                    timeout: 15000
                });
                imageToUse = Buffer.from(response.data);
            }
        } catch (imageError) {
            console.error('Menu image download failed:', imageError.message);
            imageToUse = null;
        }

        if (imageToUse) {
            await conn.sendMessage(from, {
                image: imageToUse,
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
                text: dec + '\n\n⚠️ Menu image could not be downloaded.',
                contextInfo: {
                    mentionedJid: [m.sender]
                }
            }, { quoted: mek });
        }

        // 2. Handle Voice Audio (Custom or Default love.mp3)
        setTimeout(async () => {
            try {
                let finalAudioPath = null;

                if (fs.existsSync(CUSTOM_VOICE_PATH)) {
                    finalAudioPath = CUSTOM_VOICE_PATH;
                } else if (fs.existsSync(DEFAULT_VOICE_PATH)) {
                    finalAudioPath = DEFAULT_VOICE_PATH;
                }

                if (finalAudioPath) {
                    await conn.sendMessage(from, {
                        audio: { url: finalAudioPath },
                        mimetype: 'audio/mpeg',
                        ptt: false
                    }, { quoted: mek });
                }
            } catch (audioError) {
                console.log('Error sending audio:', audioError);
            }
        }, 1000);

    } catch (e) {
        console.log(e);
        reply(`Error: ${e}`);
    }
});
