const config = require('../config');
const { cmd, commands } = require('../command');
const axios = require('axios');
const yts = require('yt-search');

const MAX_FILE_SIZE = 95 * 1024 * 1024;

const AXIOS_CONFIG = {
    timeout: 30000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*'
    }
};

const NEWSLETTER_CONTEXT = {
    forwardingScore: 999,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
        newsletterJid: '120363410899676732@newsletter',
        newsletterName: "Nobita-MD",
        serverMessageId: 143
    }
};

function normalizeYouTubeUrl(url) {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/.*[?&]v=)([a-zA-Z0-9_-]{11})/);
    return match ? `https://youtube.com/watch?v=${match[1]}` : null;
}

function extractDownloadUrl(data, type = 'video') {
    if (!data) return null;
    const result = data.result || data.data || data;

    if (typeof result === 'string' && result.startsWith('http')) {
        return result;
    }

    if (type === 'audio') {
        return result?.mp3 || result?.audio || result?.download_url || result?.download || result?.url || result?.link || data?.download_url || data?.url || null;
    } else {
        return result?.mp4 || result?.download_url || result?.download || result?.url || result?.link || result?.video || result?.video_url || data?.download_url || data?.url || null;
    }
}

// ==================== API CALL FUNCTIONS ====================

// Audio API 1 (EliteProTech)
async function eliteProTechAudioAPI(url) {
    const apiUrl = `https://eliteprotech-apis.zone.id/download/ytmp3?url=${encodeURIComponent(url)}`;
    const response = await axios.get(apiUrl, AXIOS_CONFIG);
    const data = response.data;
    const audioUrl = extractDownloadUrl(data, 'audio');

    if (!audioUrl) throw new Error('EliteProTech Audio: URL not found');
    return { audio_url: audioUrl, title: data?.result?.title || data?.title || 'Nobita-MD Audio' };
}

// Audio API 2 (Dark Shan Audio)
async function darkShanAudioAPI(url) {
    const apiUrl = `https://api-dark-shan-yt.koyeb.app/download/ytmp3?url=${encodeURIComponent(url)}&apikey=72209ca3742e5a36`;
    const response = await axios.get(apiUrl, AXIOS_CONFIG);
    const data = response.data;
    const audioUrl = extractDownloadUrl(data, 'audio');

    if (!audioUrl) throw new Error('Dark Shan Audio: URL not found');
    return { audio_url: audioUrl, title: data?.result?.title || data?.title || 'Nobita-MD Audio' };
}

// Video API 1 (Dark Shan Video)
async function darkShanVideoAPI(url) {
    const apiUrl = `https://api-dark-shan-yt.koyeb.app/download/ytmp4?url=${encodeURIComponent(url)}&apikey=72209ca3742e5a36`;
    const response = await axios.get(apiUrl, AXIOS_CONFIG);
    const data = response.data;
    const videoUrl = extractDownloadUrl(data, 'video');

    if (!videoUrl) throw new Error('Dark Shan Video: URL not found');
    return { video_url: videoUrl, title: data?.result?.title || data?.title || 'Nobita-MD Video' };
}

// Media Buffer Downloader
async function downloadMediaBuffer(mediaUrl) {
    const response = await axios.get(mediaUrl, {
        responseType: 'arraybuffer',
        timeout: 120000,
        maxContentLength: MAX_FILE_SIZE,
        maxBodyLength: MAX_FILE_SIZE
    });

    const buffer = Buffer.from(response.data);
    if (!buffer.length) throw new Error('Empty media buffer');
    if (buffer.length > MAX_FILE_SIZE) throw new Error('File size exceeds WhatsApp limit');
    return buffer;
}

// Fetch Audio with Fallback
async function fetchAudioData(url) {
    const apis = [
        { name: 'EliteProTech Audio', fn: () => eliteProTechAudioAPI(url) },
        { name: 'Dark Shan Audio', fn: () => darkShanAudioAPI(url) }
    ];

    let lastError;
    for (const api of apis) {
        try {
            console.log(`[AUDIO] Trying ${api.name}...`);
            const data = await api.fn();
            if (data?.audio_url) return data;
        } catch (err) {
            lastError = err;
            console.log(`[AUDIO] ❌ ${api.name} failed:`, err?.message || err);
        }
    }
    throw lastError || new Error('All Audio APIs failed');
}

// Fetch Video with Fallback
async function fetchVideoData(url) {
    const apis = [
        { name: 'Dark Shan Video', fn: () => darkShanVideoAPI(url) }
    ];

    let lastError;
    for (const api of apis) {
        try {
            console.log(`[VIDEO] Trying ${api.name}...`);
            const data = await api.fn();
            if (data?.video_url) return data;
        } catch (err) {
            lastError = err;
            console.log(`[VIDEO] ❌ ${api.name} failed:`, err?.message || err);
        }
    }
    throw lastError || new Error('All Video APIs failed');
}

// ==================== 1. AUDIO COMMAND (.song) ====================
cmd({
    pattern: "song",
    alias: ["play", "ytmp3", "audio"],
    use: '.song <song name / link>',
    desc: "Download YouTube Audio (MP3)",
    category: "download",
    react: "🎶",
    filename: __filename
},
async (conn, mek, m, { from, q, reply, prefix, command, sender }) => {
    try {
        if (!q) {
            return reply(`⚠️ *Usage:* ${prefix + command} song name or link`);
        }

        await conn.sendMessage(from, { react: { text: "🔍", key: mek.key } });

        const normalizedUrl = normalizeYouTubeUrl(q);
        let ytdata;

        if (normalizedUrl) {
            const videoId = normalizedUrl.split("v=")[1];
            try {
                ytdata = await yts({ videoId });
            } catch {
                ytdata = { url: normalizedUrl, title: "YouTube Audio", timestamp: "Unknown" };
            }
        } else {
            const searchResults = await yts(q);
            if (!searchResults.videos?.length) {
                return reply("❌ *No song found on YouTube!*");
            }
            ytdata = searchResults.videos[0];
        }

        const targetUrl = normalizedUrl || ytdata.url;

        const caption = `
╭┈──〔 ⚡ *NOBITA-MD AUDIO* 〕─⊷
├▢ 🎬 *Title:* ${ytdata.title}
├▢ 📺 *Channel:* ${ytdata.author?.name || 'Unknown'}
├▢ ⏱️ *Duration:* ${ytdata.timestamp || 'Unknown'}
├▢ 🎵 *Format:* Audio (MP3)
╰───────────────────────────⊷
> 📥 *Downloading audio, please wait...*`;

        await conn.sendMessage(from, {
            image: { url: ytdata.thumbnail || ytdata.image },
            caption: caption.trim(),
            contextInfo: { ...NEWSLETTER_CONTEXT, mentionedJid: [sender] }
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } });

        const audioData = await fetchAudioData(targetUrl);
        const audioBuffer = await downloadMediaBuffer(audioData.audio_url);

        await conn.sendMessage(from, {
            audio: audioBuffer,
            mimetype: "audio/mpeg",
            ptt: false,
            contextInfo: { ...NEWSLETTER_CONTEXT, mentionedJid: [sender] }
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

    } catch (e) {
        console.error("Error in song command:", e);
        await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
        reply(`⚠️ *Error:* ${e.message || "Unable to download audio"}`);
    }
});

// ==================== 2. VIDEO COMMAND (.video) ====================
cmd({
    pattern: "video",
    alias: ["vdl", "ytmp4"],
    use: '.video <video name / link>',
    desc: "Download YouTube Video (MP4)",
    category: "download",
    react: "🎬",
    filename: __filename
},
async (conn, mek, m, { from, q, reply, prefix, command, sender }) => {
    try {
        if (!q) {
            return reply(`⚠️ *Usage:* ${prefix + command} video name or link`);
        }

        await conn.sendMessage(from, { react: { text: "🔍", key: mek.key } });

        const normalizedUrl = normalizeYouTubeUrl(q);
        let ytdata;

        if (normalizedUrl) {
            const videoId = normalizedUrl.split("v=")[1];
            try {
                ytdata = await yts({ videoId });
            } catch {
                ytdata = { url: normalizedUrl, title: "YouTube Video", timestamp: "Unknown" };
            }
        } else {
            const searchResults = await yts(q);
            if (!searchResults.videos?.length) {
                return reply("❌ *No video found on YouTube!*");
            }
            ytdata = searchResults.videos[0];
        }

        const targetUrl = normalizedUrl || ytdata.url;

        const caption = `
╭┈──〔 ⚡ *NOBITA-MD VIDEO* 〕─⊷
├▢ 🎬 *Title:* ${ytdata.title}
├▢ 📺 *Channel:* ${ytdata.author?.name || 'Unknown'}
├▢ ⏱️ *Duration:* ${ytdata.timestamp || 'Unknown'}
├▢ 🎥 *Format:* Video (MP4)
╰───────────────────────────⊷
> 📥 *Downloading video, please wait...*`;

        await conn.sendMessage(from, {
            image: { url: ytdata.thumbnail || ytdata.image },
            caption: caption.trim(),
            contextInfo: { ...NEWSLETTER_CONTEXT, mentionedJid: [sender] }
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } });

        const videoData = await fetchVideoData(targetUrl);
        const videoBuffer = await downloadMediaBuffer(videoData.video_url);

        await conn.sendMessage(from, {
            video: videoBuffer,
            mimetype: "video/mp4",
            caption: `🎬 *${videoData.title || ytdata.title}*\n\n> © ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝙽𝙾𝙱𝙸𝚃𝙰-𝙼𝙳`,
            contextInfo: { ...NEWSLETTER_CONTEXT, mentionedJid: [sender] }
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

    } catch (e) {
        console.error("Error in video command:", e);
        await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
        reply(`⚠️ *Error:* ${e.message || "Unable to download video"}`);
    }
});
        
