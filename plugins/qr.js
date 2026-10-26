const config = require('../config');
const { cmd, commands } = require('../command');
const QRCode = require('qrcode');

cmd({
    pattern: "qr",
    alias: ["qrcode"],
    use: '.qr <text or link>',
    desc: "Generate a QR code image from given text or link.",
    category: "main",
    react: "📱",
    filename: __filename
},
async (conn, mek, m, { from, q, reply, quoted }) => {
    try {
        // Check if user provided text/link
        if (!q) {
            return reply("⚠️ Please provide text or a link to generate a QR code!\n\n*Example:* `.qr https://youtube.com/@NobitaMDbot`");
        }

        // Send processing reaction
        await conn.sendMessage(from, {
            react: { text: '⏳', key: mek.key }
        });

        // Generate QR code as a Buffer (Image) locally without any external API
        const buffer = await QRCode.toBuffer(q, {
            errorCorrectionLevel: 'H',
            type: 'image/png',
            margin: 2,
            width: 500
        });

        // Clean caption showing bot name, input text, and utility info
        const text = `> *Nobita-MD QR Code Generator* 📱
> 
> *📌 Input:* ${q}
> *💡 What you can do:* Scan this QR code with any mobile camera to instantly open the link, text, or info without typing!
> *✨ Status:* Generated Successfully ✅`;

        // Send the QR code image directly with caption
        await conn.sendMessage(from, {
            image: buffer,
            caption: text,
            contextInfo: {
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363410899676732@newsletter',
                    newsletterName: "Nobita-MD",
                    serverMessageId: 143
                }
            }
        }, { quoted: mek });

        // Success reaction
        await conn.sendMessage(from, {
            react: { text: '✅', key: mek.key }
        });

    } catch (e) {
        console.error("Error in qr command:", e);
        reply(`⚠️ An error occurred while generating QR code: ${e.message}`);
    }
});
