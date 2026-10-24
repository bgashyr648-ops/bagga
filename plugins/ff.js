const config = require('../config');
const { cmd, commands } = require('../command');

cmd({
    pattern: "vote",
    alias: ["autovote", "pvote"],
    use: '.vote 1',
    desc: "Auto Cast Vote on Channel/Group Poll.",
    category: "tools",
    react: "🗳️",
    filename: __filename
},
async (conn, mek, m, { from, quoted, sender, reply, args }) => {
    try {
        // Step 1: Check if replied to a poll message
        if (!quoted) {
            return reply("⚠️ *Nobita-MD Helper:* Bhai jis poll par vote dalna hai, pehle us message ko **Reply (Quote)** karke command do!");
        }

        // Step 2: Check option number
        if (!args[0]) {
            return reply("⚠️ *Nobita-MD Helper:* Option number bhi likho!\n\n*Example:* `.vote 1` ya `.vote 2`");
        }

        const optionIndex = parseInt(args[0]) - 1;

        // Step 3: Verify if it is a Poll Message
        const pollCreationMsg = quoted.pollCreationMessage || quoted.message?.pollCreationMessage;

        if (!pollCreationMsg) {
            return reply("❌ *Nobita-MD Error:* Yeh message Poll nahi hai! Kisi Poll message ko reply karein.");
        }

        // Step 4: Extract Poll Options
        const pollOptions = pollCreationMsg.options;
        if (!pollOptions || !pollOptions[optionIndex]) {
            return reply(`❌ *Nobita-MD Error:* Galat option number! Is poll mein sirf **${pollOptions ? pollOptions.length : 0}** options hain.`);
        }

        const selectedOptionName = pollOptions[optionIndex].optionName;

        // Reaction Emoji
        await conn.sendMessage(from, {
            react: { text: "🗳️", key: mek.key }
        });

        // Step 5: Send Native Vote Request via Baileys Protocol
        await conn.sendMessage(from, {
            pollUpdate: {
                pollCreationMessageKey: quoted.key,
                pollServerTimestamp: Date.now(),
                selectedOptions: [selectedOptionName]
            }
        });

        const successText = `*╭┈──〔 🗳️ Nobita-MD Aᴜᴛᴏ-Vᴏᴛᴇ 〕─⊷*\n` +
                            `*├▢ 📌 Selected:* Option ${args[0]} ("${selectedOptionName}")\n` +
                            `*├▢ 💫 Status:* Vote Successfully Casted!\n` +
                            `*╰───────────────⊷*`;

        await conn.sendMessage(from, {
            text: successText.trim(),
            contextInfo: {
                mentionedJid: [sender],
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363410899676732@newsletter',
                    newsletterName: "Nobita-MD",
                    serverMessageId: 143
                }
            }
        }, { quoted: mek });

    } catch (e) {
        console.error("Error in vote command:", e);
        reply(`⚠️ Error: ${e.message}`);
    }
});
