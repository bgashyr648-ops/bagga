
const config = require('../config');
const { cmd, commands } = require('../command');

// GIPHY API KEY
const GIPHY_API_KEY = "LQh0yEAey0xdUzixGdvR3LsCs0Db77SD";

// GIPHY SEARCH FUNCTION
async function searchGiphy(type, query) {
    const endpoint = type === "sticker"
        ? "https://api.giphy.com/v1/stickers/search"
        : "https://api.giphy.com/v1/gifs/search";

    const params = new URLSearchParams({
        api_key: GIPHY_API_KEY,
        q: query,
        limit: "25",
        rating: "g"
    });

    const response = await fetch(`${endpoint}?${params}`);

    if (!response.ok) {
        throw new Error(`GIPHY API Error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.data || data.data.length === 0) {
        throw new Error("No GIF or sticker found. Try another keyword.");
    }

    return data.data[Math.floor(Math.random() * data.data.length)];
}


// NOBITA GIF COMMAND
cmd({
    pattern: "nobita",
    alias: ["nobitagif"],
    use: ".nobita hello",
    desc: "Search and send animated GIFs.",
    category: "main",
    react: "🎬",
    filename: __filename
},
async (conn, mek, m, { from, q, reply }) => {
    try {
        const query = (q || "").trim();

        const searchTerm = !query || query.toLowerCase() === "random"
            ? "funny cartoon"
            : query;

        const result = await searchGiphy("gif", searchTerm);

        const videoUrl = result.images?.original?.mp4;

        if (!videoUrl) {
            return reply("No playable GIF found. Try another keyword.");
        }

        await conn.sendMessage(from, {
            video: { url: videoUrl },
            gifPlayback: true,
            caption: "> *🎬 NOBITA MD ANIMATED GIF*"
        }, { quoted: mek });

    } catch (e) {
        console.error("Nobita GIF Error:", e);
        reply(`❌ Error: ${e.message}`);
    }
});


// NOBITA ANIMATED STICKER COMMAND
cmd({
    pattern: "nobitasticker",
    alias: ["nobitastk"],
    use: ".nobitasticker hello",
    desc: "Search and send animated stickers.",
    category: "main",
    react: "🌟",
    filename: __filename
},
async (conn, mek, m, { from, q, reply }) => {
    try {
        const query = (q || "").trim();

        const searchTerm = !query || query.toLowerCase() === "random"
            ? "cartoon stickers"
            : query;

        const result = await searchGiphy("sticker", searchTerm);

        const stickerUrl =
            result.images?.original?.webp ||
            result.images?.fixed_width?.webp;

        if (!stickerUrl) {
            return reply("No WebP sticker found. Try another keyword.");
        }

        await conn.sendMessage(from, {
            sticker: { url: stickerUrl }
        }, { quoted: mek });

    } catch (e) {
        console.error("Nobita Sticker Error:", e);
        reply(`❌ Error: ${e.message}`);
    }
});
