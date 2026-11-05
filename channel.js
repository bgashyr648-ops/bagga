// plugins/cpost.js - CommonJS Version
const config = require('../config');
const { cmd } = require('../command');

// ==================== CHANNEL POST COMMAND ====================

cmd({
    pattern: 'cpost',
    alias: ['channelpost', 'cstatus'],
    desc: 'Post updates to all subscribed WhatsApp channels',
    category: 'owner',
    react: '📢',
    use: '.cpost <text or media with caption>',
    filename: __filename
}, async (conn, mek, m, { from, text, quoted, reply, userConfig }) => {
    try {
        const q = quoted ? quoted : m;
        const mime = (q.msg || q).mimetype || '';
        const caption = (text || q.text || '').trim();

        if (!caption && !/image|video/.test(mime)) {
            return reply('❌ Please provide text, an image, or a video to post!\nExample: .cpost Hello channels');
        }

        await conn.sendMessage(from, {
            react: { text: '⏳', key: m.key }
        });

        if (typeof conn.newsletterSubscribed !== 'function') {
            await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
            return reply('❌ Your bot version does not support fetching channels automatically.');
        }

        const subscribed = await conn.newsletterSubscribed();
        const channels = [...new Set(
            (Array.isArray(subscribed) ? subscribed : [])
                .map(c => c.id || c.jid)
                .filter(Boolean)
        )];

        if (!channels.length) {
            await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
            return reply('❌ No subscribed channels found linked to your number!');
        }

        let mediaBuffer = null;
        let mediaType = null;

        if (/image|video/.test(mime)) {
            mediaBuffer = await q.download();

            if (!mediaBuffer) {
                await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
                return reply('❌ Media download failed!');
            }

            mediaType = mime.includes('image') ? 'image' : 'video';
        }

        let successCount = 0;
        let failedCount = 0;

        for (const channelJid of channels) {
            try {
                if (mediaBuffer) {
                    await conn.sendMessage(channelJid, {
                        [mediaType]: mediaBuffer,
                        caption: caption
                    });
                } else {
                    await conn.sendMessage(channelJid, {
                        text: caption
                    });
                }
                successCount++;
            } catch (err) {
                failedCount++;
                console.error(`[CPOST] Failed to post on channel ${channelJid}:`, err?.message || err);
            }
        }

        await conn.sendMessage(from, {
            react: { text: successCount > 0 ? '✅' : '❌', key: m.key }
        });

        const DESCRIPTION = userConfig?.DESCRIPTION || config.DESCRIPTION || '';

        const reportCaption = `*╭─❍══ ⃟ ⃟ ⃟   Nobita-MD   ⃟ ⃟ ⃟══⊷❍*

┇◆╭┉┉┉┉┉┉┉┉┉┉━┈⊷
┇◆┋📢 𝐂𝐇𝐀𝐍𝐍𝐄𝐋 𝐏𝐎𝐒𝐓 𝐑𝐄𝐏𝐎𝐑𝐓
┇◆┋
┇◆┋✅ Success: ${successCount}
┇◆┋❌ Failed: ${failedCount}
┇◆┋📡 Total Channels: ${channels.length}
┇◆╰┉┉┉┉┉┉┉┉┉┉┉┉┉━┈⊷
╰═══════════════════⍟

> © ᴘᴏᴡᴇʀᴇᴅ ʙʏ NobitaMD

${DESCRIPTION}`;

        return reply(reportCaption);

    } catch (error) {
        console.error('❌ CPOST COMMAND ERROR:', error?.message || error);

        await conn.sendMessage(from, {
            react: { text: '❌', key: m.key }
        });

        return reply('⚠️ Something went wrong while posting to channels!');
    }
});
