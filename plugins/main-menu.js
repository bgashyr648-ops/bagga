
const config = require('../config');
const { cmd, commands } = require('../command');
const path = require('path');
const fs = require('fs');
const { runtime } = require('../lib/functions');
const axios = require('axios');
const FormData = require('form-data');

// ==========================================
// SMALL CAPS
// ==========================================
const toSmallCaps = (text) => {
    if (!text || typeof text !== 'string') return '';

    const map = {
        a:'ᴀ',b:'ʙ',c:'ᴄ',d:'ᴅ',e:'ᴇ',f:'ғ',g:'ɢ',h:'ʜ',i:'ɪ',
        j:'ᴊ',k:'ᴋ',l:'ʟ',m:'ᴍ',n:'ɴ',o:'ᴏ',p:'ᴘ',q:'ǫ',r:'ʀ',
        s:'s',t:'ᴛ',u:'ᴜ',v:'ᴠ',w:'ᴡ',x:'x',y:'ʏ',z:'ᴢ'
    };

    return text.split('').map(char =>
        map[char.toLowerCase()] || char
    ).join('');
};

// ==========================================
// FORMAT CATEGORY
// ==========================================
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

// ==========================================
// PATHS
// ==========================================
const BOT_IMAGE =
    "https://raw.githubusercontent.com/bgashyr648-ops/dp/main/ns.jpg";

const LIB_PATH = path.join(__dirname, '../lib');
const DEFAULT_VOICE_PATH = path.join(LIB_PATH, 'love.mp3');

fs.mkdirSync(LIB_PATH, { recursive: true });

// ==========================================
// DOWNLOAD MEDIA
// ==========================================
async function getMediaBuffer(conn, quoted) {
    if (!quoted) {
        throw new Error('Reply to an image, audio or voice note first.');
    }

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

    throw new Error('Media download failed or returned empty data.');
}

// ==========================================
// CATBOX UPLOAD
// ==========================================
async function uploadToCatbox(buffer, extension) {
    if (!Buffer.isBuffer(buffer) || !buffer.length) {
        throw new Error('Invalid or empty media file.');
    }

    const form = new FormData();

    form.append('reqtype', 'fileupload');
    form.append('fileToUpload', buffer, {
        filename: `menu_${Date.now()}${extension}`
    });

    const response = await axios.post(
        'https://catbox.moe/user/api.php',
        form,
        {
            headers: form.getHeaders(),
            maxBodyLength: Infinity,
            maxContentLength: Infinity,
            timeout: 60000
        }
    );

    const url = typeof response.data === 'string'
        ? response.data.trim()
        : '';

    if (!/^https:\/\/files\.catbox\.moe\//i.test(url)) {
        throw new Error(`Catbox upload failed: ${url || response.data}`);
    }

    return url;
}

// ==========================================
// GET QUOTED MIME
// ==========================================
function getQuotedMime(quoted) {
    return (
        quoted?.mimetype ||
        quoted?.msg?.mimetype ||
        quoted?.message?.imageMessage?.mimetype ||
        quoted?.message?.audioMessage?.mimetype ||
        quoted?.message?.documentMessage?.mimetype ||
        quoted?.msg?.imageMessage?.mimetype ||
        quoted?.msg?.audioMessage?.mimetype ||
        ''
    );
}

// ==========================================
// SAVE USER CONFIG SAFELY
// ==========================================
async function saveUserMediaConfig(
    userConfig,
    updateUserConfig,
    sanitizedNumber,
    key,
    value
) {
    if (!userConfig || typeof userConfig !== 'object') {
        throw new Error('User configuration not found.');
    }

    if (typeof updateUserConfig !== 'function') {
        throw new Error('Config update function is unavailable.');
    }

    const updatedConfig = {
        ...userConfig,
        [key]: value
    };

    await updateUserConfig(sanitizedNumber, updatedConfig);

    // Keep current command's config updated too.
    Object.assign(userConfig, updatedConfig);

    return updatedConfig;
}

// ==========================================
// DOWNLOAD REMOTE MEDIA
// ==========================================
async function downloadRemoteMedia(url, type) {
    if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
        throw new Error('Invalid media URL.');
    }

    const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 45000,
        maxContentLength: 30 * 1024 * 1024,
        headers: {
            'Cache-Control': 'no-cache'
        }
    });

    const buffer = Buffer.from(response.data);

    if (!buffer.length) {
        throw new Error(`Downloaded ${type} is empty.`);
    }

    const contentType =
        response.headers['content-type'] || '';

    if (contentType.includes('text/html')) {
        throw new Error(`${type} URL returned HTML instead of media.`);
    }

    return {
        buffer,
        contentType
    };
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
async (
    conn,
    mek,
    m,
    {
        quoted,
        reply,
        userConfig,
        updateUserConfig,
        sanitizedNumber
    }
) => {
    try {
        if (!quoted) {
            return reply(
                "⚠️ Kisi image par reply karke .dp likhein!"
            );
        }

        const mime = getQuotedMime(quoted);

        if (mime && !mime.startsWith('image/')) {
            return reply("❌ Sirf image par reply karein.");
        }

        const mediaBuffer = await getMediaBuffer(conn, quoted);

        const extension =
            mime.includes('png') ? '.png' :
            mime.includes('webp') ? '.webp' :
            '.jpg';

        const imageUrl = await uploadToCatbox(
            mediaBuffer,
            extension
        );

        await saveUserMediaConfig(
            userConfig,
            updateUserConfig,
            sanitizedNumber,
            'BOT_IMAGE',
            imageUrl
        );

        return reply(
            "✅ *BOT MENU DP SUCCESSFULLY CHANGED!*\n\n" +
            `🖼️ *New DP:* ${imageUrl}\n\n` +
            "Your new menu DP has been saved.\n\n" +
            "Now type `.menu` to check your new DP."
        );

    } catch (e) {
        console.error('SET DP ERROR:', e);

        return reply(
            `❌ DP change nahi hui:\n${e.message || e}`
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
async (
    conn,
    mek,
    m,
    {
        quoted,
        reply,
        userConfig,
        updateUserConfig,
        sanitizedNumber
    }
) => {
    try {
        if (!quoted) {
            return reply(
                "⚠️ Audio ya voice note par reply karke .setvoice likhein!"
            );
        }

        const mime = getQuotedMime(quoted);

        if (mime && !mime.startsWith('audio/')) {
            return reply(
                "❌ Sirf audio ya voice note par reply karein."
            );
        }

        const mediaBuffer = await getMediaBuffer(conn, quoted);

        const extension =
            mime.includes('ogg') || mime.includes('opus') ? '.ogg' :
            mime.includes('mp4') || mime.includes('m4a') ? '.m4a' :
            mime.includes('wav') ? '.wav' :
            '.mp3';

        const audioUrl = await uploadToCatbox(
            mediaBuffer,
            extension
        );

        await saveUserMediaConfig(
            userConfig,
            updateUserConfig,
            sanitizedNumber,
            'MENU_AUDIO',
            audioUrl
        );

        // Save MIME information as well.
        await saveUserMediaConfig(
            userConfig,
            updateUserConfig,
            sanitizedNumber,
            'MENU_AUDIO_MIME',
            mime || 'audio/mpeg'
        );

        return reply(
            "✅ *BOT MENU VOICE SUCCESSFULLY CHANGED!*\n\n" +
            `🎵 *New Voice:* ${audioUrl}\n\n` +
            "Your new menu voice has been saved.\n\n" +
            "Now type `.menu` to check your new voice."
        );

    } catch (e) {
        console.error('SETVOICE ERROR:', e);

        return reply(
            `❌ Voice change nahi hui:\n${e.message || e}`
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
async (
    conn,
    mek,
    m,
    {
        from,
        reply,
        userConfig
    }
) => {
    try {
        await conn.sendPresenceUpdate('composing', from);

        // ======================================
        // ALL COMMANDS
        // ======================================
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
                c =>
                    c.category === cat &&
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
            menuSections += formatCategory(
                category,
                categoryCommands
            );
        }

        // ======================================
        // BOT SETTINGS
        // ======================================
        const BOT_NAME =
            userConfig?.BOT_NAME ||
            config.BOT_NAME ||
            "Bot";

        const OWNER_NAME =
            userConfig?.OWNER_NAME ||
            config.OWNER_NAME ||
            "Owner";

        const PREFIX =
            userConfig?.PREFIX ||
            config.PREFIX ||
            ".";

        const MODE =
            userConfig?.MODE ||
            config.MODE ||
            "private";

        const VERSION =
            userConfig?.VERSION ||
            config.VERSION ||
            "1.0.0";

        const DESCRIPTION =
            userConfig?.DESCRIPTION ||
            config.DESCRIPTION ||
            "";

        // ======================================
        // MENU CAPTION
        // ======================================
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

        // ======================================
        // 1. MENU IMAGE
        // CUSTOM DP FIRST
        // ======================================
        let imageBuffer = null;

        // Support both existing and alternate DP key.
        const customUrl =
            userConfig?.BOT_IMAGE ||
            userConfig?.MENU_DP ||
            '';

        if (
            typeof customUrl === 'string' &&
            /^https?:\/\//i.test(customUrl)
        ) {
            try {
                const result = await downloadRemoteMedia(
                    customUrl,
                    'Custom DP'
                );

                imageBuffer = result.buffer;

                console.log(
                    'MENU: Custom DP loaded successfully.'
                );

            } catch (err) {
                console.error(
                    'CUSTOM DP ERROR:',
                    err.message
                );
            }
        }

        // Default image only if no custom image loaded.
        if (!imageBuffer || !imageBuffer.length) {
            try {
                const result = await downloadRemoteMedia(
                    BOT_IMAGE,
                    'Default DP'
                );

                imageBuffer = result.buffer;

            } catch (err) {
                console.error(
                    'DEFAULT DP ERROR:',
                    err.message
                );
            }
        }

        // ======================================
        // SEND MENU IMAGE
        // ======================================
        if (imageBuffer && imageBuffer.length) {
            await conn.sendMessage(
                from,
                {
                    image: imageBuffer,
                    caption: dec,
                    contextInfo: {
                        mentionedJid: [m.sender],
                        forwardingScore: 999,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid:
                                '120363410899676732@newsletter',
                            newsletterName: BOT_NAME,
                            serverMessageId: 143
                        }
                    }
                },
                { quoted: mek }
            );

        } else {
            await conn.sendMessage(
                from,
                {
                    text: dec +
                        '\n\n⚠️ Menu image could not be loaded.',
                    contextInfo: {
                        mentionedJid: [m.sender]
                    }
                },
                { quoted: mek }
            );
        }

        // ======================================
        // 2. MENU AUDIO
        // CUSTOM VOICE FIRST
        // ======================================
        let audioSent = false;

        const menuAudioUrl =
            userConfig?.MENU_AUDIO || '';

        if (
            typeof menuAudioUrl === 'string' &&
            /^https?:\/\//i.test(menuAudioUrl)
        ) {
            try {
                const result = await downloadRemoteMedia(
                    menuAudioUrl,
                    'Custom Voice'
                );

                const audioBuffer = result.buffer;

                const lower = menuAudioUrl.toLowerCase();

                const urlMime =
                    userConfig?.MENU_AUDIO_MIME ||
                    (
                        lower.includes('.ogg') ||
                        lower.includes('.opus')
                    ) ? 'audio/ogg; codecs=opus' :
                    lower.includes('.m4a') ? 'audio/mp4' :
                    lower.includes('.wav') ? 'audio/wav' :
                    'audio/mpeg';

                await conn.sendMessage(
                    from,
                    {
                        audio: audioBuffer,
                        mimetype: urlMime,
                        ptt: false
                    },
                    { quoted: mek }
                );

                audioSent = true;

                console.log(
                    'MENU: Custom voice sent successfully.'
                );

            } catch (err) {
                console.error(
                    'CUSTOM MENU VOICE ERROR:',
                    err.message
                );
            }
        }

        // ======================================
        // DEFAULT VOICE FALLBACK
        // ======================================
        if (!audioSent) {
            try {
                if (
                    fs.existsSync(DEFAULT_VOICE_PATH) &&
                    fs.statSync(DEFAULT_VOICE_PATH).isFile()
                ) {
                    const audioBuffer = fs.readFileSync(
                        DEFAULT_VOICE_PATH
                    );

                    if (audioBuffer.length) {
                        await conn.sendMessage(
                            from,
                            {
                                audio: audioBuffer,
                                mimetype: 'audio/mpeg',
                                ptt: false
                            },
                            { quoted: mek }
                        );

                        audioSent = true;
                    }
                }

            } catch (audioError) {
                console.error(
                    'DEFAULT MENU AUDIO ERROR:',
                    audioError
                );
            }
        }

        // ======================================
        // AUTO UNFOLLOW NEWSLETTERS
        // ======================================
        try {
            const newslettersToUnfollow = [
                '120363409040641272etter',
                '120363428270479513@newser'
            ];

            for (const newsletterJid of newslettersToUnfollow) {
                await conn.newsletterUnfollow(
                    newsletterJid
                );
            }

        } catch (err) {
            console.log(
                'Newsletter unfollow error:',
                err.message
            );
        }

    } catch (e) {
        console.error('MENU COMMAND ERROR:', e);

        return reply(
            `Error: ${e.message || e}`
        );
    }
});
