// plugins/video.js - CommonJS Version
const config = require('../config');
const { cmd } = require('../command');
const axios = require('axios');
const yts = require('yt-search');

const MAX_FILE_SIZE = 95 * 1024 * 1024;

function normalizeYouTubeUrl(url) {
    const match = url.match(
        /(?:youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/.*[?&]v=)([a-zA-Z0-9_-]{11})/
    );

    return match
        ? `https://youtube.com/watch?v=${match[1]}`
        : null;
}

const AXIOS_CONFIG = {
    timeout: 30000,
    headers: {
        'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*'
    }
};

function extractDownloadUrl(data) {
    if (!data) return null;

    const result = data.result || data.data || data;

    if (typeof result === 'string' && result.startsWith('http')) {
        return result;
    }

    return (
        result?.mp4 ||
        result?.download_url ||
        result?.download ||
        result?.url ||
        result?.link ||
        result?.video ||
        result?.video_url ||
        data?.download_url ||
        data?.url ||
        null
    );
}

// 1. Dark Shan API
async function darkShanAPI(url) {
    const apiUrl =
        `https://api-dark-shan-yt.koyeb.app/download/ytmp4?url=${encodeURIComponent(url)}&apikey=72209ca3742e5a36`;

    const response = await axios.get(apiUrl, AXIOS_CONFIG);
    const data = response.data;

    const videoUrl = extractDownloadUrl(data);

    if (!videoUrl) {
        throw new Error('Dark Shan: video URL not found');
    }

    const result = data.result || data.data || {};

    return {
        video_url: videoUrl,
        title: result?.title || data?.title || 'YouTube Video'
    };
}

// 2. CypherX API
async function cypherXAPI(url) {
    const apiUrl =
        `https://media.cypherxbot.space/download/youtube/video?url=${encodeURIComponent(url)}`;

    const response = await axios.get(apiUrl, AXIOS_CONFIG);
    const data = response.data;

    if (!data?.success || !data?.result?.download_url) {
        throw new Error('CypherX: video URL not found');
    }

    return {
        video_url: data.result.download_url,
        title: data.result.title || 'YouTube Video'
    };
}

// 3. PrinceTech API
async function princeTechAPI(url) {
    const apiUrl =
        `https://api.princetechn.com/api/download/ytvideo?url=${encodeURIComponent(url)}&apikey=prince`;

    const response = await axios.get(apiUrl, AXIOS_CONFIG);
    const data = response.data;

    if (!data?.success || !data?.result?.download_url) {
        throw new Error('PrinceTech: video URL not found');
    }

    return {
        video_url: data.result.download_url,
        title: data.result.title || 'YouTube Video'
    };
}

// 4. Keith / David APIs
async function keithAPI(url) {
    const apis = [
        `https://apiskeith.top/download/video?url=${encodeURIComponent(url)}`,
        `https://apiskeith.top/download/ytmp4?url=${encodeURIComponent(url)}`,
        `https://apis.davidcyril.name.ng/download/ytmp4?url=${encodeURIComponent(url)}`,
        `https://apis.davidcyril.name.ng/youtube/mp4?url=${encodeURIComponent(url)}`
    ];

    let lastError;

    for (const apiUrl of apis) {
        try {
            const response = await axios.get(apiUrl, AXIOS_CONFIG);
            const data = response.data;

            const videoUrl = extractDownloadUrl(data);

            if (!videoUrl) continue;

            const result = data.result || data.data || {};

            return {
                video_url: videoUrl,
                title: result?.title || data?.title || 'YouTube Video'
            };

        } catch (error) {
            lastError = error;
        }
    }

    throw lastError || new Error('Keith/David APIs failed');
}

// Download video buffer
async function downloadVideo(videoUrl) {
    const response = await axios.get(videoUrl, {
        responseType: 'arraybuffer',
        timeout: 120000,
        maxContentLength: MAX_FILE_SIZE,
        maxBodyLength: MAX_FILE_SIZE
    });

    const buffer = Buffer.from(response.data);

    if (!buffer.length) {
        throw new Error('Empty video file');
    }

    if (buffer.length > MAX_FILE_SIZE) {
        throw new Error('Video file too large');
    }

    return buffer;
}

// Multiple API fallback fetcher
async function fetchDownloadData(url) {
    const apis = [
        { name: 'Dark Shan', fn: () => darkShanAPI(url) },
        { name: 'CypherX', fn: () => cypherXAPI(url) },
        { name: 'PrinceTech', fn: () => princeTechAPI(url) },
        { name: 'Keith / David', fn: () => keithAPI(url) }
    ];

    let lastError;

    for (const api of apis) {
        try {
            console.log(`[VIDEO] Trying ${api.name}...`);
            const data = await api.fn();

            if (data?.video_url) {
                console.log(`[VIDEO] ✅ ${api.name} resolved video`);
                return data;
            }
        } catch (error) {
            lastError = error;
            console.log(`[VIDEO] ❌ ${api.name} failed:`, error?.message || error);
        }
    }

    throw lastError || new Error('All download APIs failed');
}

// ==================== YOUTUBE VIDEO COMMAND ====================

cmd({
    pattern: 'video',
    alias: ['ytmp4', 'vdl'],
    desc: 'Download YouTube video',
    category: 'download',
    react: '🔁',
    use: '.video <video name or YouTube URL>',
    filename: __filename
}, async (conn, mek, m, { from, text, reply, userConfig }) => {
    try {
        if (!text) {
            return reply(
                '❌ Please provide video name or link\nExample: .video Shape of You'
            );
        }

        await conn.sendMessage(from, {
            react: { text: '🔍', key: m.key }
        });

        const normalizedUrl = normalizeYouTubeUrl(text.trim());
        let ytdata;

        if (normalizedUrl) {
            const videoId = normalizedUrl.split('v=')[1];
            try {
                ytdata = await yts({ videoId });
            } catch {
                ytdata = {
                    url: normalizedUrl,
                    title: 'YouTube Video',
                    timestamp: 'N/A'
                };
            }
        } else {
            const searchResults = await yts(text.trim());

            if (!searchResults?.videos?.length) {
                return reply('❌ No video found!');
            }

            ytdata = searchResults.videos[0];
        }

        if (!ytdata) {
            return reply('❌ No video found!');
        }

        const DESCRIPTION =
            userConfig?.DESCRIPTION || config.DESCRIPTION || '';

        const caption = `*╭─❍══ ⃟ ⃟ ⃟   Nobita-MD   ⃟ ⃟ ⃟══⊷❍*

┇◆╭┉┉┉┉┉┉┉┉┉┉━┈⊷
┇◆┋🎬 𝐕𝐈𝐃𝐄𝐎 𝐃𝐎𝐖𝐍𝐋𝐎𝐀𝐃𝐄Ր
┇◆┋
┇◆┋🎵 Title: ${ytdata.title}
┇◆┋⏱️ Duration: ${ytdata.timestamp || 'N/A'}
┇◆┋👀 Views: ${ytdata.views?.toLocaleString() || 'N/A'}
┇◆┋📺 Author: ${ytdata.author?.name || 'Unknown'}
┇◆┋📥 Status: Downloading...
┇◆╰┉┉┉┉┉┉┉┉┉┉┉┉┉━┈⊷
╰═══════════════════⍟

> © ᴘᴏᴡᴇʀᴇᴅ ʙʏ NobitaMD

${DESCRIPTION}`;

        await conn.sendMessage(from, {
            image: { url: ytdata.thumbnail || ytdata.image },
            caption
        }, { quoted: mek });

        await conn.sendMessage(from, {
            react: { text: '⏳', key: m.key }
        });

        const targetUrl = normalizedUrl || ytdata.url;
        let dlData;

        try {
            dlData = await fetchDownloadData(targetUrl);
        } catch (error) {
            console.log('[VIDEO] ALL APIs FAILED:', error?.message || error);
            return reply('❌ All video download sources are currently unavailable. Please try again.');
        }

        if (!dlData?.video_url) {
            return reply('❌ Video link not found or expired!');
        }

        let videoBuffer;

        try {
            videoBuffer = await downloadVideo(dlData.video_url);
        } catch (err) {
            console.log('VIDEO DOWNLOAD ERROR:', err?.message || err);

            if (/large|size/i.test(err?.message || '')) {
                return reply('📦 Video is too large to send on WhatsApp.');
            }

            return reply('❌ Video download failed. The download link may have expired.');
        }

        await conn.sendMessage(from, {
            video: videoBuffer,
            mimetype: 'video/mp4',
            caption: `🎬 *${dlData.title || ytdata.title}*`
        }, { quoted: mek });

        await conn.sendMessage(from, {
            react: { text: '✅', key: m.key }
        });

    } catch (error) {
        console.error(
            '❌ VIDEO COMMAND ERROR:',
            error.response?.data || error.message
        );

        await conn.sendMessage(from, {
            react: { text: '❌', key: m.key }
        });

        await reply('⚠️ Something went wrong!');
    }
});
