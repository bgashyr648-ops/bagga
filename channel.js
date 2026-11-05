const config = require('../config');
const { cmd } = require('../command');

cmd({
    pattern: "cpost",
    alias: ["channelpost", "cstatus"],
    use: '.cpost <text or media with caption>',
    desc: "Post updates to WhatsApp channels",
    category: "owner",
    react: "📢",
    filename: __filename
},
async (conn, mek, m, { quoted, reply, text }) => {
    try {
        const q = quoted || m;
        const mime = (q.msg || q).mimetype || '';
        const caption = (text || q.text || '').trim();

        if (!caption && !/image|video/.test(mime)) {
            return reply("⚠️ Text, image or video required!");
        }

        await m.react("⏳");

        if (typeof conn.newsletterSubscribed !== 'function') {
            await m.react("❌");
            return reply("❌ Your WhatsApp library does not support newsletterSubscribed().");
        }

        const subscribed = await conn.newsletterSubscribed();
        const channels = [...new Set(
            (Array.isArray(subscribed) ? subscribed : [])
                .map(c => c.id || c.jid)
                .filter(Boolean)
        )];

        if (!channels.length) {
            await m.react("❌");
            return reply("❌ No subscribed channels found!");
        }

        let buffer = null;
        let type = null;

        if (/image|video/.test(mime)) {
            buffer = await q.download();

            if (!buffer) {
                await m.react("❌");
                return reply("❌ Media download failed!");
            }

            type = mime.includes("image") ? "image" : "video";
        }

        let success = 0;
        let failed = 0;

        for (const jid of channels) {
            try {
                if (buffer) {
                    await conn.sendMessage(jid, {
                        [type]: buffer,
                        caption
                    });
                } else {
                    await conn.sendMessage(jid, { text: caption });
                }

                success++;
            } catch (err) {
                failed++;
                console.error(`Channel ${jid}:`, err.message);
            }
        }

        await m.react(success ? "✅" : "❌");

        return reply(
            `📢 CHANNEL UPDATE REPORT\n\n` +
            `✅ Successful: ${success}\n` +
            `❌ Failed: ${failed}\n` +
            `📡 Total Channels: ${channels.length}`
        );

    } catch (err) {
        console.error("CPOST ERROR:", err);
        await m.react("❌");
        return reply(`❌ Error: ${err.message}`);
    }
});
