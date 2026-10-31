// commands/setchannel.js
const { loadSettings, saveSettings } = require('../lib/newsletters');

module.exports = {
    name: 'setchannel',
    alias: ['channelset', 'changechannel'],
    desc: 'Update the bot channel JID and link dynamically for menu and ping.',
    category: 'owner',
    async execute(conn, mek, m, { args, isOwner, reply }) {
        // Check if user is owner
        if (!isOwner) return reply("❌ Ye command sirf bot owner ke liye hai!");

        if (args.length < 1) {
            return reply(
                `⚠️ Sahi format use karein!\n\n` +
                `*Example:* \n.setchannel 1203634xxxx@newsletter | Nobita-MD Updates | https://whatsapp.com/channel/xyz`
            );
        }

        // Join args to support text with spaces if split by '|'
        let fullText = args.join(" ");
        let parts = fullText.split("|").map(p => p.trim());

        let newJid = parts[0];
        let newName = parts[1] || "Nobita-MD Official Updates";
        let newLink = parts[2] || `https://whatsapp.com/channel/${newJid.split('@')[0]}`;

        if (!newJid.endsWith('@newsletter')) {
            return reply("❌ Invalid Newsletter JID! JID ke aakhir mein `@newsletter` hona zaroori hai.");
        }

        let settings = loadSettings();

        // Update values
        settings.newsletterJids = [newJid];
        settings.FollowChannelJids = [newJid];
        settings.channelName = newName;
        settings.channelLink = newLink;

        if (saveSettings(settings)) {
            return reply(
                `✅ *Channel Successfully Updated!*\n\n` +
                `📢 *Name:* ${newName}\n` +
                `🔗 *JID:* \`${newJid}\`\n` +
                `🌐 *Link:* ${newLink}\n\n` +
                `Ab `.menu` aur `.ping` par yahi naya channel show hoga!`
            );
        } else {
            return reply("❌ Settings save karne mein koi error aa gaya hai.");
        }
    }
};
