const { cmd } = require('../command');

cmd({
    pattern: "Hamid",
    alias: ["md", "mdvideo", "botvideo", "deployvideo"],
    desc: "Hamid-Fida-MD bot deploy video command",
    react: "🎥",
    filename: __filename
},
async (conn, mek, m, { from, q, reply }) => {
    try {
        console.log("🎥 Hamid-Fida-MD deploy video command triggered!");
        await reply("🎥 *Hamid-Fida-MD bot lagane ka tarika batane wali video bhej raha hai...*");

        const autoVideoLinks = [
            "https://files.catbox.moe/ns1slt.mp4",
        ];

        const videoUrl = autoVideoLinks[Math.floor(Math.random() * autoVideoLinks.length)];

        // 1. Pehla Message: Video Setup Guide (Pair Code Link ke sath)
        await conn.sendMessage(
            from,
            {
                video: { url: videoUrl },
                caption: `🎬 *HAMID-FIDA-MD BOT SETUP GUIDE*\n\n✨ *Bot lagane ka poora tarika video mein dekhein.*\n\n🔗 *Pair Code Nikalne Ke Liye Website Link:*\nhttps://nobita-md.vercel.app\n\n🔥 *POWERED BY HAMID-FIDA-MD*`
            },
            { quoted: mek }
        );

        // 2. Dusra Message: YouTube Channel Updates Message
        await conn.sendMessage(
            from,
            {
                text: `📺 *OFFICIAL YOUTUBE CHANNEL*\n\n📢 *Bot ki tamam new updates, tutorials aur new features ab isi Official YouTube Channel par milenge!*\n\n🔔 *Tamam new updates ke liye channel ko zaroor subscribe karein:*\n\n🔗 *YouTube Link:*\nhttps://www.youtube.com/@NobitaMDbot\n\n🔥 *POWERED BY NOBITA-MD*`
            },
            { quoted: mek }
        );

    } catch (error) {
        console.error('ERROR:', error);
        return reply(`❌ Error aa gaya: ${error.message}`);
    }
});
    
