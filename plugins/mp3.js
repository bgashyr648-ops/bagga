// plugins/mention.js - GitHub Random Voice
const { cmd } = require('../command');
const config = require('../config');
const converter = require('../lib/converter');
const axios = require('axios');

const GITHUB_API =
    'https://api.github.com/repos/bgashyr648-ops/mp3.js/contents/';

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

let lastClipUrl = null;
let cachedFiles = [];
let cacheTime = 0;

async function getGitHubAudioUrl() {
    const now = Date.now();

    // Refresh the file list every 60 seconds
    if (!cachedFiles.length || now - cacheTime > 60000) {
        const response = await axios.get(GITHUB_API, {
            headers: {
                Accept: 'application/vnd.github+json'
            },
            timeout: 15000
        });

        if (!Array.isArray(response.data)) {
            throw new Error('Invalid GitHub repository response.');
        }

        cachedFiles = response.data.filter(file =>
            file.type === 'file' &&
            /\.(mp3|ogg|oga|opus|m4a|wav|aac|amr|3gp)$/i.test(file.name) &&
            file.download_url
        );

        cacheTime = now;
    }

    if (!cachedFiles.length) {
        throw new Error('No supported audio files found on GitHub.');
    }

    let choices = cachedFiles.filter(
        file => file.download_url !== lastClipUrl
    );

    if (!choices.length) choices = cachedFiles;

    const selected = choices[
        Math.floor(Math.random() * choices.length)
    ];

    lastClipUrl = selected.download_url;
    return selected.download_url;
}

async function fetchAudioBuffer(url) {
    const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 30000,
        maxContentLength: 25 * 1024 * 1024
    });

    return Buffer.from(response.data);
}

async function makePTT(buffer) {
    if (typeof converter.toPTT === 'function') {
        return await converter.toPTT(buffer, 'mp3');
    }

    if (typeof converter === 'function') {
        return await converter(buffer, 'mp3');
    }

    return buffer;
}

async function sendRandomVoice(conn, chatId, quoted) {
    await conn.sendPresenceUpdate('recording', chatId);

    const url = await getGitHubAudioUrl();
    const buffer = await fetchAudioBuffer(url);

    await delay(3000);

    const audio = await makePTT(buffer);

    await conn.sendMessage(
        chatId,
        {
            audio,
            mimetype: 'audio/ogg; codecs=opus',
            ptt: true
        },
        { quoted }
    );
}

// Auto-reply when bot is mentioned in a group
cmd({
    on: 'body'
}, async (conn, m, store, {
    isGroup,
    botNumber2,
    userConfig
}) => {
    try {
        const mek = m.mek || m;
        if (mek.key?.fromMe) return;

        const mentionReply =
            userConfig?.MENTION_REPLY ??
            config.MENTION_REPLY ??
            'false';

        if (
            mentionReply !== 'true' ||
            !isGroup ||
            !botNumber2
        ) return;

        if (!(m.mentionedJid || []).includes(botNumber2)) return;

        await sendRandomVoice(conn, m.chat, m);
    } catch (error) {
        console.error('GitHub mention voice error:', error.message);
    }
});

// Command: .g
cmd({
    pattern: 'g',
    desc: 'Send a random GitHub voice note',
    category: 'other',
    react: '🎵',
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    try {
        await sendRandomVoice(conn, from, m);
    } catch (error) {
        console.error('GitHub .g command error:', error);

        await reply(
            '❌ Audio send nahi ho saka. GitHub repository, audio format aur converter check karein.'
        );
    }
});
