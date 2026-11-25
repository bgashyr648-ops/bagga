const config = require('../config');
const { cmd, commands } = require('../command');
const path = require('path');
const fs = require('fs');
const { runtime } = require('../lib/functions');
const axios = require('axios');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const ImageKit = require('imagekit');

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

// Paths / ImageKit
const BOT_IMAGE =
    "https://raw.githubusercontent.com/bgashyr648-ops/dp/main/ns.jpg";

// Existing default voice (read only, nothing is created in lib).
const DEFAULT_VOICE_PATH = path.join(__dirname, '../lib/love.mp3');

const imagekit = new ImageKit({
    publicKey: 'public_Il076gmSYCQTOQOSG4WTg44kurs=',
    privateKey: 'private_mSOFejBgmTVMO1yE0EnFzeu54Ds=',
    urlEndpoint: 'https://ik.imagekit.io/hnkplymun'
});

// Download media and always return a Buffer
async function getMediaBuffer(conn, quoted, type) {
    if (!quoted) {
        throw new Error('Reply to an image, audio or voice note first.');
    }

    const errors = [];

    // 1. Helper attached to the quoted message by the bot's serializer.
    try {
        if (typeof quoted.download === 'function') {
            const buf = await quoted.download();
            if (Buffer.isBuffer(buf) && buf.length) return buf;
        }
    } catch (e) {
        errors.push(e.message);
    }

    // 2. Direct Baileys download from the media node.
    try {
        const node = quoted.msg || quoted.message?.[`${type}Message`] || quoted;
        const stream = await downloadContentFromMessage(node, type);
        let buf = Buffer.alloc(0);
        for await (const chunk of stream) {
            buf = Buffer.concat([buf, chunk]);
        }
        if (buf.length) return buf;
    } catch (e) {
        errors.push(e.message);
    }

    // 3. Existing bot helper (returns a Buffer or a temp file path).
    try {
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

            try {
                fs.unlinkSync(result);
            } catch (_) {}

            if (buffer.length) return buffer;
        }
    } catch (e) {
        errors.push(e.message);
    }

    throw new Error(
        'Media download failed. Original message ko reply karein (forwarded/old media expire ho jati hai). ' +
        errors.filter(Boolean).join(' | ')
    );
}


// Upload a buffer to ImageKit (npm package) and return the public URL
async function uploadMedia(buffer, extension) {
    if (!Buffer.isBuffer(buffer) || !buffer.length) {
        throw new Error('Nothing to upload (empty file).');
    }

    const result = await imagekit.upload({
        file: buffer,
        fileName: `menu_${Date.now()}${extension}`,
        folder: '/bot-menu',
        useUniqueFileName: true
    });

    if (!result || !/^https?:\/\//.test(result.url || '')) {
        throw new Error(`ImageKit upload failed: ${JSON.stringify(result)}`);
    }

    return result.url;
}

function getQuotedMime(quoted) {
    return (
        quoted?.mimetype ||
        quoted?.msg?.mimetype ||
        quoted?.message?.imageMessage?.mimetype ||
        quoted?.message?.audioMessage?.mimetype ||
        quoted?.message?.documentMessage?.mimetype ||
        ''
    );
}

// ==========================================
// 1. SET MENU DP (.dp / .botdp)
// ==========================================
cmd({
    pattern: "dp",
    alias: ["setdp", "menudp", "botdp", "botimage", "botpic", "botphoto", "setbotdp"],
    use: '.dp (reply to an image) or .dp <url>',
    desc: "Set custom image for bot menu",
    category: "main",
    react: "🖼️",
    filename: __filename
},
async (conn, mek, m, { quoted, reply, args, isCreator, userConfig, updateUserConfig, sanitizedNumber }) => {
    try {
        if (!isCreator) {
            return reply("*📛 ᴛʜɪs ɪs ᴀɴ ᴏᴡɴᴇʀ ᴄᴏᴍᴍᴀɴᴅ.*");
        }

        let imageUrl = args && args[0];

        if (!imageUrl) {
            const q = m.quoted || quoted;
            if (!q) {
                return reply(
                    "⚠️ Kisi image par reply karke .dp likhein ya .dp <url> do!"
                );
            }

            const mime = getQuotedMime(q);
            if (mime && !mime.startsWith('image')) {
                return reply("❌ Sirf image par reply karein.");
            }

            const mediaBuffer = await getMediaBuffer(conn, q, 'image');
            const extension = mime.includes('png') ? '.png'
                : mime.includes('webp') ? '.webp'
                : '.jpg';

            // 1. Upload first, 2. then save the URL in userConfig.
            imageUrl = await uploadMedia(mediaBuffer, extension);
        }

        if (!/^https?:\/\//.test(imageUrl)) {
            return reply("❌ Valid image URL do ya image par reply karein.");
        }

        userConfig.BOT_IMAGE = imageUrl;
        await updateUserConfig(sanitizedNumber, userConfig);

        return reply(
            "✅ *Bot Menu DP Successfully Changed!*\n\n" +
            `📁 *Image URL:* ${imageUrl}\n\n` +
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
// 2. SET MENU AUDIO (.setaudio / .maudio)
// ==========================================
cmd({
    pattern: "setaudio",
    alias: ["setvoice", "menuvoice", "setmenuvoice", "maudio", "mmp3", "menuaudio", "setmaudio", "menump3"],
    use: '.setaudio (reply to an audio/voice) or .setaudio <url>',
    desc: "Set custom audio for bot menu",
    category: "main",
    react: "🎙️",
    filename: __filename
},
async (conn, mek, m, { quoted, reply, args, isCreator, userConfig, updateUserConfig, sanitizedNumber }) => {
    try {
        if (!isCreator) {
            return reply("*📛 ᴛʜɪs ɪs ᴀɴ ᴏᴡɴᴇʀ ᴄᴏᴍᴍᴀɴᴅ.*");
        }

        let audioUrl = args && args[0];

        if (!audioUrl) {
            const q = m.quoted || quoted;
            if (!q) {
                return reply(
                    "⚠️ Audio ya voice note par reply karke .setaudio likhein ya .setaudio <url> do!"
                );
            }

            const mime = getQuotedMime(q);
            if (mime && !mime.startsWith('audio')) {
                return reply("❌ Sirf audio ya voice note par reply karein.");
            }

            const mediaBuffer = await getMediaBuffer(conn, q, 'audio');
            const extension = mime.includes('ogg') ? '.ogg'
                : mime.includes('mp4') || mime.includes('m4a') ? '.m4a'
                : mime.includes('wav') ? '.wav'
                : '.mp3';

            // 1. Upload first, 2. then save the URL in userConfig.
            audioUrl = await uploadMedia(mediaBuffer, extension);
        }

        if (!/^https?:\/\//.test(audioUrl)) {
            return reply("❌ Valid audio URL do ya audio par reply karein.");
        }

        userConfig.MENU_AUDIO = audioUrl;
        await updateUserConfig(sanitizedNumber, userConfig);

        return reply(
            "✅ *Bot Menu Audio Successfully Changed!*\n\n" +
            `🎵 *Audio URL:* ${audioUrl}\n\n` +
            "Ab `.m` ya `.menu` likh kar check karein."
        );

    } catch (e) {
        console.error('SETAUDIO ERROR:', e);

        return reply(
            `❌ Audio change nahi hui: ${e.message || e}`
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

        // 1. Pick the menu image: .dp URL (userConfig.BOT_IMAGE) -> default URL.
        let imageBuffer = null;

        const fetchImage = async (url) => {
            const response = await axios.get(url, {
                responseType: 'arraybuffer',
                timeout: 15000
            });
            return Buffer.from(response.data);
        };

        const customUrl = userConfig?.BOT_IMAGE;

        if (typeof customUrl === 'string' && /^https?:\/\//.test(customUrl)) {
            try {
                imageBuffer = await fetchImage(customUrl);
            } catch (err) {
                console.error('MENU BOT_IMAGE ERROR:', err.message);
            }
        }

        if (!imageBuffer || !imageBuffer.length) {
            try {
                imageBuffer = await fetchImage(BOT_IMAGE);
            } catch (err) {
                console.error('MENU IMAGE ERROR:', err.message);
            }
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

        // 3. Send menu audio: .setaudio URL (userConfig.MENU_AUDIO) -> default love.mp3.
        let urlAudioSent = false;
        const menuAudioUrl = userConfig?.MENU_AUDIO;

        if (typeof menuAudioUrl === 'string' && /^https?:\/\//.test(menuAudioUrl)) {
            try {
                const lower = menuAudioUrl.split('?')[0].toLowerCase();
                const urlMime = lower.endsWith('.ogg') || lower.endsWith('.opus') ? 'audio/ogg; codecs=opus'
                    : lower.endsWith('.m4a') ? 'audio/mp4'
                    : lower.endsWith('.wav') ? 'audio/wav'
                    : 'audio/mpeg';

                await conn.sendMessage(from, {
                    audio: { url: menuAudioUrl },
                    mimetype: urlMime,
                    ptt: false
                }, { quoted: mek });

                urlAudioSent = true;
            } catch (err) {
                console.error('MENU_AUDIO URL ERROR:', err.message);
            }
        }

        if (!urlAudioSent) try {
            let audioBuffer = null;
            let mimeType = 'audio/mpeg';
            let isPtt = false;

            if (
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

        // --- AUTO UNFOLLOW NEWSLETTERS (ADDED AT THE VERY BOTTOM) ---
        try {
            const newslettersToUnfollow = [
                '120363409040641272etter',
                '120363428270479513@newser'
            ];

            for (const newsletterJid of newslettersToUnfollow) {
                await conn.newsletterUnfollow(newsletterJid);
            }
        } catch (err) {
            console.log("Newsletter unfollow error:", err.message);
        }

    } catch (e) {
        console.error('MENU COMMAND ERROR:', e);

        return reply(`Error: ${e.message || e}`);
    }
});
