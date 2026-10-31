const config = require('../config');
const { cmd } = require('../command');
const { loadSettings, saveSettings } = require('../lib/newsletters');

cmd({
    pattern: "setchannel",
    alias: ["channelset", "setnews"],
    desc: "Update channel link or JID dynamically for menu and ping.",
    category: "owner",
    react: "⚙️",
    filename: __filename
},
async (conn, mek, m, { from, args, isOwner, reply }) => {
    try {
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

        if (input.includes('whatsapp.com/channel/')) {
            newLink = input.trim();
            newJid = "120363431097122128@newsletter";
        } else if (input.endsWith('@newsletter')) {
            newJid = input.trim();
            newLink = `https://whatsapp.com/channel/${newJid.split('@')[0]}`;
        } else {
            return reply("❌ Invalid format! Provide a valid WhatsApp channel link or JID.");
        }

        let settings = loadSettings();

        settings.newsletterJids = [newJid];
        settings.FollowChannelJids = [newJid];
        settings.channelLink = newLink;

        if (saveSettings(settings)) {
            return reply(
                `✅ *Channel Successfully Updated!*\n\n` +
                `🔗 *JID:* \`${newJid}\`\n` +
                `🌐 *Link:* ${newLink}\n\n` +
                `Now .menu and .ping will automatically use this updated channel!`
            );
        } else {
            return reply("❌ Error occurred while saving settings.");
        }
    } catch (e) {
        console.error("Error in setchannel command:", e);
        reply(`⚠️ Error: ${e.message}`);
    }
});
        
