const { cmd } = require('../command')

cmd({
    pattern: "botdp",
    alias: ["setbotdp", "setdp", "botpp"],
    desc: "TIGER-MD ki Profile Picture change karne ke liye",
    category: "owner",
    react: "🖼️",
    filename: __filename
},
async (conn, mek, m, { from, isOwner, reply }) => {
    try {
        // Sirf Owner chala sake
        if (!isOwner) return reply("❌ Yeh command sirf TIGER-MD ka owner use kar sakta hai!");

        // Check karo ki photo par reply hai ya nahi
        let mime = m.quoted ? m.quoted.mtype : m.mtype;
        if (!/image/.test(mime)) return reply("❌ Kisi photo par reply karke `.botdp` likhein!");

        // Media download karo
        let media = await m.quoted.download();

        // TIGER-MD ki profile picture update karo
        await conn.updateProfilePicture(conn.user.jid, media);

        return reply("✅ *TIGER-MD Display Picture Updated Successfully!*");

    } catch (e) {
        console.log(e);
        reply(`❌ Error: ${e.message}`);
    }
});
