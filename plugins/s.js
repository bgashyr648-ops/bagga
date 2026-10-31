// commands/setchannel.js
const { loadSettings, saveSettings } = require('../lib/newsletters');

module.exports = {
    name: 'setchannel',
    alias: ['channelset', 'changechannel'],
    desc: 'Update bot channel JID and link dynamically using either link or JID.',
    category: 'owner',
    async execute(conn, mek, m, { args, isOwner, reply }) {
        if (!isOwner) return reply("❌ This command is only for the bot owner!");

        let input = args.join(" ").trim() || (m.quoted && m.quoted.text);
        if (!input) {
            return reply(
                `⚠️ Please provide a channel link or JID!\n\n` +
                `*Example 1:* .setchannel https://whatsapp.com/channel/0029VbEMtPjGehENE2Fkcr3C\n` +
                `*Example 2:* .setchannel 120363431097122128@newsletter`
            );
        }

        let newJid = "";
        let newLink = "";

        // Check if user provided a WhatsApp channel link
        if (input.includes('whatsapp.com/channel/')) {
            newLink = input.trim();
            // Agar link diya hai, toh default ya existing JID rakhein ya extract karein
            // Aap apna newsletter JID yahan automatically map kar sakte hain ya user ko prompt de sakte hain
            newJid = "120363431097122128@newsletter"; // Default fallback JID
        } else if (input.endsWith('@newsletter')) {
            newJid = input.trim();
            newLink = `https://whatsapp.com/channel/${newJid.split('@')[0]}`;
        } else {
            return reply("❌ Invalid format! Please send a valid WhatsApp channel link or JID.");
        }

        let settings = loadSettings();

        // Update settings
        settings.newsletterJids = [newJid];
        settings.FollowChannelJids = [newJid];
        settings.channelLink = newLink;

        if (saveSettings(settings)) {
            return reply(
                `✅ *Channel Successfully Updated!*\n\n` +
                `🔗 *JID:* \`${newJid}\`\n` +
                `🌐 *Link:* ${newLink}\n\n` +
                `Now `.menu` and `.ping` will show this new channel!`
            );
        } else {
            return reply("❌ Error occurred while saving settings.");
        }
    }
};
