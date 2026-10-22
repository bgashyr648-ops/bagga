// plugins/mention.js
// Nobita MD - GitHub Audio Voice Note
// Command: .g

const { cmd } = require('../command');
const config = require('../config');
const axios = require('axios');
const { execFile } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const os = require('os');
const path = require('path');

const execFileAsync = promisify(execFile);

const GITHUB_API =
    'https://api.github.com/repos/bgashyr648-ops/mp3.js/contents/';

let audioFiles = [];
let cacheTime = 0;
let lastUrl = '';

async function getAudioFile() {
    if (!audioFiles.length || Date.now() - cacheTime > 60000) {
        const response = await axios.get(GITHUB_API, {
            headers: { Accept: 'application/vnd.github+json' },
            timeout: 20000
        });

        if (!Array.isArray(response.data)) {
            throw new Error('GitHub audio list is invalid.');
        }

        audioFiles = response.data.filter(file =>
            file.type === 'file' &&
            /\.(mp3|ogg|oga|opus|m4a|wav|aac|amr|3gp)$/i.test(file.name) &&
            file.download_url
        );

        cacheTime = Date.now();
    }

    if (!audioFiles.length) {
        throw new Error('No audio files found in GitHub repository.');
    }

    let available = audioFiles.filter(
        file => file.download_url !== lastUrl
    );

    if (!available.length) available = audioFiles;

    const file = available[
        Math.floor(Math.random() * available.length)
    ];

    lastUrl = file.download_url;
    return file;
}

async function downloadAudio(url) {
    const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 45000,
        maxContentLength: 30 * 1024 * 1024
    });

    return Buffer.from(response.data);
}

async function convertToVoiceNote(inputBuffer) {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const inputFile = path.join(os.tmpdir(), `nobita-${id}.input`);
    const outputFile = path.join(os.tmpdir(), `nobita-${id}.ogg`);

    try {
        fs.writeFileSync(inputFile, inputBuffer);

        // FFmpeg detects the input format automatically.
        await execFileAsync('ffmpeg', [
            '-hide_banner',
            '-loglevel', 'error',
            '-y',
            '-i', inputFile,
            '-vn',
            '-ac', '1',
            '-ar', '48000',
            '-c:a', 'libopus',
            '-b:a', '32k',
            '-application', 'voip',
            '-f', 'ogg',
            outputFile
        ], {
            timeout: 90000,
            maxBuffer: 2 * 1024 * 1024
        });

        if (!fs.existsSync(outputFile) || fs.statSync(outputFile).size < 100) {
            throw new Error('FFmpeg did not create a valid voice note.');
        }

        return fs.readFileSync(outputFile);
    } finally {
        for (const file of [inputFile, outputFile]) {
            try {
                if (fs.existsSync(file)) fs.unlinkSync(file);
            } catch (_) {}
        }
    }
}

async function sendRandomVoice(conn, chatId, quoted) {
    await conn.sendPresenceUpdate('recording', chatId);

    const file = await getAudioFile();
    const downloaded = await downloadAudio(file.download_url);
    const voice = await convertToVoiceNote(downloaded);

    await conn.sendMessage(
        chatId,
        {
            audio: voice,
            mimetype: 'audio/ogg; codecs=opus',
            ptt: true
        },
        { quoted }
    );
}

// Automatic voice reply when mentioned in a group
cmd({
    on: 'body'
}, async (conn, m, store, { isGroup, botNumber2, userConfig }) => {
    try {
        if (m.mek?.key?.fromMe || m.key?.fromMe) return;

        const enabled =
            userConfig?.MENTION_REPLY ??
            config.MENTION_REPLY ??
            'false';

        if (enabled !== 'true' || !isGroup || !botNumber2) return;
        if (!(m.mentionedJid || []).includes(botNumber2)) return;

        await sendRandomVoice(conn, m.chat, m);
    } catch (error) {
        console.error('Mention audio error:', error.message);
    }
});

// .g command
cmd({
    pattern: 'g',
    desc: 'Send a random playable GitHub voice note',
    category: 'other',
    react: '🎵',
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    try {
        await sendRandomVoice(conn, from, m);
    } catch (error) {
        console.error('.g audio error:', error);

        await reply(
            '❌ Voice note convert nahi ho saki. Server par FFmpeg aur libopus support check karein.'
        );
    }
});
