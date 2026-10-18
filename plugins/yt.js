
const axios = require('axios');
const yts = require('yt-search');

const HEADERS = {
    'User-Agent': 'Mozilla/5.0',
    'Accept': 'application/json, text/plain, */*'
};

function getVideoId(input) {
    try {
        const u = new URL(input);
        const host = u.hostname.replace(/^www\./, '');

        if (host === 'youtu.be') {
            return u.pathname.split('/').filter(Boolean)[0] || null;
        }

        if (
            host === 'youtube.com' ||
            host === 'm.youtube.com' ||
            host === 'music.youtube.com'
        ) {
            if (u.searchParams.has('v')) {
                return u.searchParams.get('v');
            }

            const parts = u.pathname.split('/').filter(Boolean);

            if (['shorts', 'embed', 'live', 'v'].includes(parts[0])) {
                return parts[1] || null;
            }
        }
    } catch (_) {}

    return null;
}

function isYouTubeUrl(input) {
    return Boolean(getVideoId(input));
}

function extractMediaUrl(data, depth = 0) {
    if (!data || depth > 6) return null;

    if (typeof data === 'string') {
        if (/^https?:\/\//i.test(data)) {
            try {
                const u = new URL(data);
                if (u.protocol === 'https:' || u.protocol === 'http:') {
                    return data;
                }
            } catch (_) {}
        }

        // Some APIs return JSON as a string.
        try {
            return extractMediaUrl(JSON.parse(data), depth + 1);
        } catch (_) {
            return null;
        }
    }

    if (Array.isArray(data)) {
        for (const item of data) {
            const result = extractMediaUrl(item, depth + 1);
            if (result) return result;
        }
        return null;
    }

    if (typeof data !== 'object') return null;

    const keys = [
        'downloadUrl',
        'download_url',
        'dl_link',
        'directLink',
        'download',
        'url',
        'link'
    ];

    for (const key of keys) {
        const value = data[key];

        if (
            typeof value === 'string' &&
            /^https?:\/\//i.test(value)
        ) {
            try {
                const u = new URL(value);
                if (['http:', 'https:'].includes(u.protocol)) {
                    return value;
                }
            } catch (_) {}
        }
    }

    for (const key of [
        'result',
        'data',
        'response',
        'media',
        'file'
    ]) {
        if (data[key] !== undefined) {
            const result = extractMediaUrl(data[key], depth + 1);
            if (result) return result;
        }
    }

    return null;
}

function cleanFileName(name) {
    return String(name || 'media')
        .replace(/[\\/:*?"<>|\u0000-\u001F]/g, '_')
        .slice(0, 100);
}

function errorMessage(error, type) {
    const status = error.response?.status;

    if (status === 429) {
        return '⏳ Download API is rate-limited (429). Please wait a few minutes and try again.';
    }

    if (status === 401 || status === 403) {
        return '❌ Download API rejected the request. Check API access or its key.';
    }

    if (status === 404) {
        return '❌ Download API endpoint was not found. Check the API URL.';
    }

    if (status >= 500) {
        return '❌ Download API server is temporarily unavailable. Try again later.';
    }

    if (error.code === 'ECONNABORTED') {
        return '⏳ Download API timed out. Please try again later.';
    }

    if (error.response) {
        return `❌ ${type} API returned HTTP ${status || 'error'}.`;
    }

    return `❌ ${type} request failed: ${error.message}`;
}

async function getVideoInfo(text) {
    if (/^https?:\/\//i.test(text)) {
        const id = getVideoId(text);

        if (!id) {
            throw new Error('Please provide a valid YouTube video URL.');
        }

        const result = await yts({ videoId: id });

        if (!result || !result.title) {
            throw new Error('Could not retrieve YouTube video details.');
        }

        return {
            ...result,
            url: `https://www.youtube.com/watch?v=${id}`
        };
    }

    const result = await yts(text);
    const video = result?.videos?.find(v => v.seconds > 0) ||
                  result?.videos?.[0];

    if (!video) {
        throw new Error('No matching YouTube video was found.');
    }

    return video;
}

async function requestDownload(apiUrl, type) {
    const response = await axios.get(apiUrl, {
        headers: HEADERS,
        timeout: 90000,
        maxRedirects: 5,
        validateStatus: status => status >= 200 && status < 300
    });

    const mediaUrl = extractMediaUrl(response.data);

    if (!mediaUrl) {
        // Log a short response sample to help diagnose API changes.
        console.error(
            `${type} API response:`,
            JSON.stringify(response.data).slice(0, 1500)
        );

        throw new Error(
            `${type} API did not return a recognized download URL. Check server logs.`
        );
    }

    return mediaUrl;
}

async function sendMedia(conn, from, mek, mediaUrl, type, title) {
    const fileName = cleanFileName(title);

    await conn.sendMessage(from, {
        [type]: { url: mediaUrl },
        mimetype: type === 'audio' ? 'audio/mpeg' : 'video/mp4',
        fileName: `${fileName}.${type === 'audio' ? 'mp3' : 'mp4'}`,
        ...(type === 'audio'
            ? { ptt: false }
            : { caption: `🎬 *${title}*\n\n> Powered by Nobita-MD` })
    }, { quoted: mek });
}

async function downloadCommand(conn, mek, from, text, reply, type) {
    const isAudio = type === 'audio';
    const label = isAudio ? 'PLAY' : 'VIDEO';

    try {
        if (!text || !text.trim()) {
            return reply(
                isAudio
                    ? '❌ Enter a song name or YouTube URL.\nExample: .play Shape of You'
                    : '❌ Enter a video name or YouTube URL.\nExample: .video Alone Marshmello'
            );
        }

        const vid = await getVideoInfo(text.trim());
        const url = vid.url;

        const duration = Number(vid.seconds || 0);

        // Avoid accidentally attempting very large files.
        if (duration > 3600) {
            return reply('❌ This video is longer than 60 minutes. Please choose a shorter video.');
        }

        await conn.sendMessage(from, {
            image: { url: vid.thumbnail },
            caption: isAudio
                ? `🎧 *AUDIO DOWNLOADER*\n\n*Title:* ${vid.title}\n*Duration:* ${vid.timestamp || 'Unknown'}\n*Author:* ${vid.author?.name || 'Unknown'}\n*Status:* Processing...\n\n> Powered by Nobita-MD`
                : `🎬 *VIDEO DOWNLOADER*\n\n*Title:* ${vid.title}\n*Channel:* ${vid.author?.name || 'Unknown'}\n*Duration:* ${vid.timestamp || 'Unknown'}\n*Status:* Processing...\n\n> Powered by Nobita-MD`
        }, { quoted: mek });

        // Keep your current providers. They must be active and
        // return a JSON response containing a direct media URL.
        const apiUrl = isAudio
            ? `https://eliteprotech-apis.zone.id/download/ytmp3?url=${encodeURIComponent(url)}`
            : `https://api-dark-shan-yt.koyeb.app/download/ytmp4?url=${encodeURIComponent(url)}&apikey=72209ca3742e5a36`;

        const mediaUrl = await requestDownload(apiUrl, label);

        await sendMedia(
            conn,
            from,
            mek,
            mediaUrl,
            type,
            vid.title
        );

        await conn.sendMessage(from, {
            react: { text: '✅', key: mek.key }
        });

    } catch (error) {
        console.error(`${label} ERROR:`, error.response?.status, error.message);

        await reply(errorMessage(error, label));

        await conn.sendMessage(from, {
            react: { text: '❌', key: mek.key }
        }).catch(() => {});
    }
}

cmd({
    pattern: 'play',
    alias: ['song', 'music', 'audio'],
    use: '.play song name',
    desc: 'Download YouTube audio',
    category: 'download',
    react: '🎧',
    filename: __filename
}, async (conn, mek, m, { from, text, reply }) => {
    return downloadCommand(conn, mek, from, text, reply, 'audio');
});

cmd({
    pattern: 'video',
    alias: ['ytv', 'ytmp4', 'vd'],
    use: '.video video name',
    desc: 'Download YouTube video',
    category: 'download',
    react: '📹',
    filename: __filename
}, async (conn, mek, m, { from, text, reply }) => {
    return downloadCommand(conn, mek, from, text, reply, 'video');
});
