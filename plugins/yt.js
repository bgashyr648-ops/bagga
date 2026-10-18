const config = require('../config');
const { cmd, commands } = require('../command');
const axios = require('axios');
const yts = require('yt-search');

function getVideoId(url) {
    if (!url || typeof url !== 'string') return null;
    const patterns = [
        /(?:youtube\.com\/watch\?.*v=)([a-zA-Z0-9_-]{11})/,
        /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
        /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
        /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
        /(?:youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/,
        /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
        /(?:m\.youtube\.com\/watch\?.*v=)([a-zA-Z0-9_-]{11})/,
        /(?:youtube\.com\/watch\/)([a-zA-Z0-9_-]{11})/,
        /(?:music\.youtube\.com\/watch\?.*v=)([a-zA-Z0-9_-]{11})/
    ];
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) return match[1];
    }
    return null;
}

function extractMediaUrl(data) {
    if (!data) return null;
    if (typeof data === 'string' && data.startsWith('http')) return data;
    
    return data?.download?.url || 
           data?.result?.downloadUrl || 
           data?.result?.url || 
           data?.result?.download ||
           data?.url || 
           data?.data?.dl_link || 
           data?.data?.url ||
           data?.downloadUrl ||
           data?.link || 
           (typeof data?.result === 'string' && data.result.startsWith('http') ? data.result : null);
}

const getHeaders = () => ({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://google.com'
});

cmd({
    pattern: "play",
    alias: ["song", "music", "audio", "Play"],
    use: '.play sad song',
    desc: "Download YouTube audio",
    category: "download",
    react: "🎧",
    filename: __filename
},
async (conn, mek, m, { from, text, reply }) => {
    try {
        if (!text) return reply("❌ Please provide a song name or link!\nExample: .play Shape of You");

        let url = text;
        let vid = null;

        if (text.startsWith('http://') || text.startsWith('https://')) {
            if (!text.includes("youtube.com") && !text.includes("youtu.be")) {
                return reply("❌ Please provide a valid YouTube URL!");
            }
            const videoId = getVideoId(text);
            if (!videoId) return reply("❌ Invalid YouTube URL!");
            vid = await yts({ videoId: videoId });
        } else {
            const search = await yts(text);
            if (!search || !search.videos || !search.videos.length) {
                return reply("❌ No song found!");
            }
            vid = search.videos[0];
            url = vid.url;
        }

        if (!vid) return reply("❌ No results found!");

        await conn.sendMessage(from, {
            image: { url: vid.thumbnail },
            caption: `- *AUDIO DOWNLOADER 🎧*\n╭━━❐━⪼\n┇๏ *Title* - ${vid.title}\n┇๏ *Duration* - ${vid.timestamp}\n┇๏ *Author* - ${vid.author?.name || 'Unknown'}\n┇๏ *Status* - Downloading Audio...\n╰━━❑━⪼\n> Powered by Nobita-MD`
        }, { quoted: mek });

        const apiUrl = `https://eliteprotech-apis.zone.id/download/ytmp3?url=${encodeURIComponent(url)}`;
        const response = await axios.get(apiUrl, { headers: getHeaders(), timeout: 45000 });
        const audioUrl = extractMediaUrl(response.data);

        if (!audioUrl) {
            return reply("❌ Download failed from API. Try again later!");
        }

        await conn.sendMessage(from, {
            audio: { url: audioUrl },
            mimetype: "audio/mpeg",
            fileName: `${vid.title}.mp3`,
            ptt: false
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });

    } catch (err) {
        console.error("PLAY ERROR:", err);
        reply(`❌ Error occurred: ${err.message}`);
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
    }
});

cmd({
    pattern: "video",
    alias: ["ytv", "ytmp4", "vd", "Video"],
    use: '.video sad song',
    desc: "Download YouTube video",
    category: "download",
    react: "📹",
    filename: __filename
},
async (conn, mek, m, { from, text, reply }) => {
    try {
        if (!text) return reply("🎥 Please provide a video name or link!\nExample: .video Alone Marshmello");

        let url = text;
        let vid = null;

        if (text.startsWith('http://') || text.startsWith('https://')) {
            if (!text.includes("youtube.com") && !text.includes("youtu.be")) {
                return reply("❌ Please provide a valid YouTube URL!");
            }
            const videoId = getVideoId(text);
            if (!videoId) return reply("❌ Invalid YouTube URL!");
            vid = await yts({ videoId: videoId });
        } else {
            const search = await yts(text);
            if (!search || !search.videos || !search.videos.length) {
                return reply("❌ No video results found!");
            }
            vid = search.videos[0];
            url = vid.url;
        }

        if (!vid) return reply("❌ No results found!");

        await conn.sendMessage(from, {
            image: { url: vid.thumbnail },
            caption: `*🎬 VIDEO DOWNLOADER*\n\n🎞️ *Title:* ${vid.title}\n📺 *Channel:* ${vid.author?.name || 'Unknown'}\n🕒 *Duration:* ${vid.timestamp}\n\n*Status:* Downloading Video...\n\n> Powered by Nobita-MD`
        }, { quoted: mek });

        const apiUrl = `https://api-dark-shan-yt.koyeb.app/download/ytmp4?url=${encodeURIComponent(url)}&apikey=72209ca3742e5a36`;
        const response = await axios.get(apiUrl, { headers: getHeaders(), timeout: 45000 });
        const videoUrl = extractMediaUrl(response.data);

        if (!videoUrl) {
            return reply("❌ Video download failed from API. Try again later!");
        }

        await conn.sendMessage(from, {
            video: { url: videoUrl },
            caption: `🎬 *${vid.title}*\n\n> Powered by Nobita-MD`
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });

    } catch (e) {
        console.error("Error in video command:", e);
        reply(`❌ Error occurred: ${e.message}`);
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
    }
});
