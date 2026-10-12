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

        await conn.sendMessage(
            from,
            {
                video: { url: videoUrl },
                caption: `🎬 *HAMID-FIDA-MD BOT SETUP GUIDE*\n\n✨ *Bot lagane ka poora tarika video mein dekhein.*\n\n🔗 *Pair Code Nikalne Ke Liye Website Link:*\nhttps://hamid-fida-md.vercel.app\n\n🔥 *POWERED BY HAMID-FIDA-MD*`
            },
            { quoted: mek }
        );

    } catch (error) {
        console.error('ERROR:', error);
        return reply(`❌ Error aa gaya: ${error.message}`);
    }
});
