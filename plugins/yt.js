const config = require('../config');
const { cmd, commands } = require('../command');
const axios = require('axios');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const VERCEL_API = "https://h-c82d.vercel.app";

const toSmallCaps = (text) => {
    const map = {
        'a': 'ᴀ', 'b': 'ʙ', 'c': 'ᴄ', 'd': 'ᴅ', 'e': 'ᴇ', 'f': 'ғ', 'g': 'ɢ', 'h': 'ʜ', 'i': 'ɪ', 'j': 'ᴊ',
        'k': 'ᴋ', 'l': 'ʟ', 'm': 'ᴍ', 'n': 'ɴ', 'o': 'ᴏ', 'p': 'ᴘ', 'q': 'ǫ', 'r': 'ʀ', 's': 's', 't': 'ᴛ',
        'u': 'ᴜ', 'v': 'ᴠ', 'w': 'ᴡ', 'x': 'x', 'y': 'ʏ', 'z': 'ᴢ'
    };
    return text.split('').map(c => map[c.toLowerCase()] || c).join('');
};

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

async function fetchFromVercelApi(queryOrUrl) {
    try {
        const response = await axios.get(`${VERCEL_API}/api/song?query=${encodeURIComponent(queryOrUrl)}`, { timeout: 25000 });
        if (response.data) {
            return response.data.downloadUrl || response.data.url || response.data.result?.url || response.data.result?.downloadUrl || null;
        }
    } catch (e) {
        console.error(`⚠️ Vercel API Error:`, e.message);
    }
    return null;
}

cmd({
    pattern: "play",
    alias: ["music", "audio"],
    desc: "Download YouTube audio",
    category: "download",
    react: "🎧",
    filename: __filename
}, async (conn, mek, m, { from, text, reply }) => {
    try {
        if (!text) return reply("❌ Please provide song name\nExample: .play Shape of You");

        const yts = require('yt-search');
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
        }

        if (!vid) return reply("❌ No results found!");

        await conn.sendMessage(from, {
            image: { url: vid.thumbnail },
            caption: `- *AUDIO DOWNLOADER 🎧*\n╭━━❐━⪼\n┇๏ *Title* - ${vid.title}\n┇๏ *Duration* - ${vid.timestamp}\n┇๏ *Views* - ${vid.views?.toLocaleString() || 'N/A'}\n┇๏ *Author* - ${vid.author?.name || 'Unknown'}\n┇๏ *Status* - Downloading...\n╰━━❑━⪼\n> Powered by TIGER-MD`
        }, { quoted: mek });

        const audioUrl = await fetchFromVercelApi(vid.url || text);

        if (audioUrl) {
            await conn.sendMessage(from, {
                audio: { url: audioUrl },
                mimetype: "audio/mpeg",
                fileName: `${vid.title}.mp3`,
                ptt: false
            }, { quoted: mek });
            await conn.sendMessage(from, { react: { text: '✅', key: m.key } });
        } else {
            reply("❌ Audio download failed! API didn't return a valid stream.");
            await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
        }

    } catch (err) {
        console.error("❌ PLAY ERROR:", err);
        reply("❌ Error occurred! Please try again later.");
        await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
    }
});

cmd({
    pattern: "video",
    alias: ["ytv", "ytmp4", "vd"],
    desc: "Download YouTube video",
    category: "download",
    react: "📹",
    filename: __filename
}, async (conn, mek, m, { from, text, reply }) => {
    try {
        if (!text) return reply("🎥 Please provide a video name or link!\n\nExample: `.video Alone Marshmello`");

        const yts = require('yt-search');
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
        }

        if (!vid) return reply("❌ No results found!");

        await conn.sendMessage(from, {
            image: { url: vid.thumbnail },
            caption: `*🎬 VIDEO DOWNLOADER*\n\n🎞️ *Title:* ${vid.title}\n📺 *Channel:* ${vid.author?.name || 'Unknown'}\n🕒 *Duration:* ${vid.timestamp}\n\n*Status:* Downloading Video...\n\n> Powered by TIGER-MD`
        }, { quoted: mek });

        const videoUrl = await fetchFromVercelApi(vid.url || text);

        if (videoUrl) {
            await conn.sendMessage(from, {
                video: { url: videoUrl },
                caption: `🎬 *${vid.title}*\n\n> Powered by TIGER-MD`
            }, { quoted: mek });
            await conn.sendMessage(from, { react: { text: '✅', key: m.key } });
        } else {
            reply("❌ Video download failed! Try again later.");
            await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
        }

    } catch (e) {
        console.error("Error in .video command:", e);
        reply("❌ Error occurred, please try again later!");
        await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
    }
});

cmd({
    pattern: "song",
    alias: ["yt", "ytdl"],
    desc: "Download YouTube song or video (interactive)",
    category: "download",
    react: "🎧",
    filename: __filename
}, async (conn, mek, m, { from, text, reply }) => {
    try {
        if (!text) return reply("🎶 Please provide a YouTube video name or link.\n\nExample: `.song Alone - Alan Walker`");

        const yts = require('yt-search');
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
                return reply("❌ No results found!");
            }
            vid = search.videos[0];
        }

        if (!vid) return reply("❌ No results found!");

        const caption = `*╭┈───〔 ${toSmallCaps('YT Downloader')} 〕┈───⊷*
*├▢ 🎬 Title:* ${vid.title}
*├▢ 📺 Channel:* ${vid.author?.name || 'Unknown'}
*├▢ ⏰ Duration:* ${vid.timestamp}
*├▢ 👀 Views:* ${vid.views?.toLocaleString() || 'N/A'}
*╰───────────────────⊷*
*╭───⬡ ${toSmallCaps('Select Format')} ⬡───*
*┋ ⬡ 1* 🎧 ${toSmallCaps('Audio (MP3)')}
*┋ ⬡ 2* 📹 ${toSmallCaps('Video (MP4)')}
*┋ ⬡ 3* 📄 ${toSmallCaps('Audio as Document')}
*┋ ⬡ 4* 📄 ${toSmallCaps('Video as Document')}
*╰───────────────────⊷*

> Powered by TIGER-MD`;

        const sent = await conn.sendMessage(from, {
            image: { url: vid.thumbnail },
            caption
        }, { quoted: mek });

        const msgId = sent.key.id;

        const songListener = async (msgData) => {
            const received = msgData.messages[0];
            if (!received.message) return;

            const selected = received.message.conversation || received.message.extendedTextMessage?.text;
            const replyToBot = received.message.extendedTextMessage?.contextInfo?.stanzaId === msgId;

            if (replyToBot) {
                conn.ev.off("messages.upsert", songListener);
                await conn.sendMessage(from, { react: { text: '⬇️', key: received.key } });

                const cleanSelect = selected?.trim();

                if (["1", "2", "3", "4"].includes(cleanSelect)) {
                    const mediaUrl = await fetchFromVercelApi(vid.url);

                    if (!mediaUrl) {
                        return await conn.sendMessage(from, { text: "❌ Failed to fetch media from Vercel API!" }, { quoted: received });
                    }

                    if (cleanSelect === "1") {
                        await conn.sendMessage(from, {
                            audio: { url: mediaUrl },
                            mimetype: "audio/mpeg",
                            fileName: `${vid.title}.mp3`,
                            ptt: false
                        }, { quoted: received });
                    } else if (cleanSelect === "2") {
                        await conn.sendMessage(from, {
                            video: { url: mediaUrl },
                            caption: `🎬 *${vid.title}*\n\n> Powered by TIGER-MD`
                        }, { quoted: received });
                    } else if (cleanSelect === "3") {
                        await conn.sendMessage(from, {
                            document: { url: mediaUrl },
                            mimetype: "audio/mpeg",
                            fileName: `${vid.title}.mp3`,
                            caption: `📄 *${vid.title}*\n🎧 Audio Document\n\n> Powered by TIGER-MD`
                        }, { quoted: received });
                    } else if (cleanSelect === "4") {
                        await conn.sendMessage(from, {
                            document: { url: mediaUrl },
                            mimetype: "video/mp4",
                            fileName: `${vid.title}.mp4`,
                            caption: `📄 *${vid.title}*\n📹 Video Document\n\n> Powered by TIGER-MD`
                        }, { quoted: received });
                    }

                    await conn.sendMessage(from, { react: { text: '✅', key: received.key } });
                } else {
                    await conn.sendMessage(from, {
                        text: `❌ *Invalid selection!*\nPlease reply with 1, 2, 3 or 4.`
                    }, { quoted: received });
                }
            }
        };

        conn.ev.on("messages.upsert", songListener);
        setTimeout(() => { conn.ev.off("messages.upsert", songListener); }, 30000);

    } catch (e) {
        console.error(e);
        reply(`❌ Error: ${e.message}`);
        await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
    }
});

cmd({
    pattern: "cartoon",
    alias: ["toon", "kids"],
    desc: "Download YouTube cartoon video",
    category: "download",
    react: "🧸",
    filename: __filename
}, async (conn, mek, m, { from, text, reply }) => {
    try {
        if (!text) return reply("🧸 Please provide a cartoon name!\n\nExample: `.cartoon Tom and Jerry`");

        const yts = require('yt-search');
        const search = await yts(`${text} cartoon`);

        if (!search || !search.videos || !search.videos.length) {
            return reply("❌ No cartoon results found!");
        }

        const vid = search.videos[0];

        await conn.sendMessage(from, {
            image: { url: vid.thumbnail },
            caption: `*🧸 CARTOON DOWNLOADER*\n\n🎞️ *Title:* ${vid.title}\n📺 *Channel:* ${vid.author?.name || 'Unknown'}\n🕒 *Duration:* ${vid.timestamp}\n\n*Status:* Downloading Cartoon...\n\n> Powered by TIGER-MD`
        }, { quoted: mek });

        const videoUrl = await fetchFromVercelApi(vid.url);

        if (videoUrl) {
            await conn.sendMessage(from, {
                video: { url: videoUrl },
                caption: `🎬 *${vid.title}*\n\n> Powered by TIGER-MD`
            }, { quoted: mek });
            await conn.sendMessage(from, { react: { text: '✅', key: m.key } });
        } else {
            reply("❌ Cartoon download failed! Try again later.");
            await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
        }

    } catch (e) {
        console.error("Error in .cartoon command:", e);
        reply("❌ Error occurred, please try again later!");
        await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
    }
});

cmd({
    pattern: "yts",
    alias: ["ytsearch", "searchyt"],
    desc: "Search YouTube and get video details",
    category: "search",
    react: "🔎",
    filename: __filename
}, async (conn, mek, m, { from, text, reply }) => {
    try {
        if (!text) return reply('*Please provide search words!*\n\nExample: .yts Alan Walker Faded');

        const yts = require('yt-search');
        const search = await yts(text);

        if (!search.videos || !search.videos.length) {
            return reply('*No results found!*');
        }

        const results = search.videos.slice(0, 5);
        let mesaj = `*╭┈───〔 ${toSmallCaps('YouTube Search')} 〕┈───⊷*\n`;
        mesaj += `*├▢ 🔎 Query:* ${text}\n`;
        mesaj += `*╰───────────────────⊷*\n\n`;

        results.forEach((video, i) => {
            mesaj += `*${i + 1}. ${video.title}*\n`;
            mesaj += `*├▢ Duration:* ${video.timestamp}\n`;
            mesaj += `*├▢ Link:* ${video.url}\n\n`;
        });

        mesaj += `> Powered by TIGER-MD`;
        return reply(mesaj);

    } catch (e) {
        console.error("Error in .yts command:", e);
        reply("❌ Error occurred, please try again later!");
    }
});
                
