
const axios = require('axios');

// KISS 1 COMMAND
cmd({
    pattern: "kiss1",
    desc: "Send Kiss GIF.",
    category: "fun",
    react: "💋",
    filename: __filename
},
async (conn, mek, m, { from, reply }) => {
    try {
        const response = await axios.get(
            "https://api.gifukai.com/v1/kiss?pairing=mf"
        );

        const gifUrl = response.data.url;

        if (!gifUrl) return reply("Kiss GIF not found!");

        await conn.sendMessage(from, {
            video: { url: gifUrl },
            gifPlayback: true,
            caption: "*💋 Sending Kiss...*"
        }, { quoted: mek });

    } catch (e) {
        console.error("Kiss1 Error:", e);
        reply("Kiss API Error: " + e.message);
    }
});


// KISS 2 COMMAND
cmd({
    pattern: "kiss2",
    desc: "Send Hug GIF.",
    category: "fun",
    react: "🤗",
    filename: __filename
},
async (conn, mek, m, { from, reply }) => {
    try {
        const response = await axios.get(
            "https://api.gifukai.com/v1/hug?pairing=mf"
        );

        const gifUrl = response.data.url;

        if (!gifUrl) return reply("Hug GIF not found!");

        await conn.sendMessage(from, {
            video: { url: gifUrl },
            gifPlayback: true,
            caption: "*🤗 Sending Hug...*"
        }, { quoted: mek });

    } catch (e) {
        console.error("Kiss2 Error:", e);
        reply("Hug API Error: " + e.message);
    }
});
