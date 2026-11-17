
const { cmd } = require('../command');

// ==========================================
//       NOBITA-MD KUCHU PUCHU COMMAND
// ==========================================

cmd({
    pattern: "kuchupuchu",
    desc: "Send random Kuchu Puchu video",
    category: "fun",
    react: "🥰",
    filename: __filename
},
async (conn, mek, m, { from, reply }) => {
    try {
        const randomVideo = kuchuVideos[
            Math.floor(Math.random() * kuchuVideos.length)
        ];

        await conn.sendMessage(from, {
            video: { url: randomVideo },
            mimetype: "video/mp4",
            caption: "🥰 KUCHU PUCHU LOVE ❤️\n\n> POWERED BY NOBITA-MD"
        }, { quoted: mek });

    } catch (error) {
        console.error("Kuchu Puchu Error:", error);
        reply("❌ Kuchu Puchu video send failed!");
    }
});


// ==========================================
//          NOBITA-MD KISS 3 COMMAND
// ==========================================

cmd({
    pattern: "kiss3",
    desc: "Send random Kiss video",
    category: "fun",
    react: "💋",
    filename: __filename
},
async (conn, mek, m, { from, reply }) => {
    try {
        const randomVideo = kiss3Videos[
            Math.floor(Math.random() * kiss3Videos.length)
        ];

        await conn.sendMessage(from, {
            video: { url: randomVideo },
            mimetype: "video/mp4",
            caption: "💋 KISSES & LOVE ❤️\n\n> POWERED BY NOBITA-MD"
        }, { quoted: mek });

    } catch (error) {
        console.error("Kiss3 Error:", error);
        reply("❌ Kiss3 video send failed!");
    }
});


// ==========================================
//          KUCHU PUCHU VIDEO LINKS
// ==========================================

const kuchuVideos = [
    "https://files.catbox.moe/wcnfzz.mp4",
    "https://files.catbox.moe/5ltw7h.mp4",
    "https://files.catbox.moe/siv3ca.mp4",
    "https://files.catbox.moe/6qcrq6.mp4",
    "https://files.catbox.moe/xdkznp.mp4",
    "https://files.catbox.moe/w4yms7.mp4",
    "https://files.catbox.moe/lqggfm.mp4",
    "https://files.catbox.moe/0l5xw1.mp4",
    "https://files.catbox.moe/y60v03.mp4",
    "https://files.catbox.moe/73prz8.mp4"
];


// ==========================================
//             KISS 3 VIDEO LINKS
// ==========================================

const kiss3Videos = [
    "https://files.catbox.moe/mddcos.mp4",
    "https://files.catbox.moe/5nnswc.mp4",
    "https://files.catbox.moe/vqxhql.mp4",
    "https://files.catbox.moe/x8tost.mp4",
    "https://files.catbox.moe/qk2ki3.mp4",
    "https://files.catbox.moe/0wojgr.mp4",
    "https://files.catbox.moe/nyo9yd.mp4",
    "https://files.catbox.moe/7kztul.mp4",
    "https://files.catbox.moe/ubma3j.mp4",
    "https://files.catbox.moe/m2y3dc.mp4",
    "https://files.catbox.moe/pvq3zj.mp4",
    "https://files.catbox.moe/ktrvv8.mp4",
    "https://files.catbox.moe/r6it02.mp4"
];
