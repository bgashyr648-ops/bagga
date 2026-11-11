// ===============================
// AUTO REACT COMMAND
// ===============================
cmd({
    pattern: "bagga",
    alias: ["autoreaction", "reactauto"],
    desc: "Toggle auto react to messages",
    category: "settings",
    react: "🤖",
    filename: __filename
},
async (conn, mek, m, { from, reply, isCreator, args, prefix, updateUserConfig, userConfig, sanitizedNumber }) => {
    if (!isCreator) {
        return reply("*📛 ᴛʜɪs ɪs ᴀɴ ᴏᴡɴᴇʀ ᴄᴏᴍᴍᴀɴᴅ.*");
    }

    if (!args[0]) {
        return reply(`📌 *Usᴀɢᴇ:* autoreact on/off\n*Cᴜʀʀᴇɴᴛ:* ${userConfig.AUTO_REACT}`);
    }

    const value = args[0].toLowerCase();
    if (value !== 'on' && value !== 'off') {
        return reply('❌ *Pʟᴇᴀsᴇ ᴜsᴇ:* on ᴏʀ off');
    }

    const newValue = value === 'on' ? 'true' : 'false';
    userConfig.AUTO_REACT = newValue;

    // Also toggle OWNER_REACT along with AUTO_REACT
    userConfig.OWNER_REACT = newValue;

    await updateUserConfig(sanitizedNumber, userConfig);
    
    await reply(
        `✅ *Aᴜᴛᴏ Rᴇᴀᴄᴛ sᴇᴛ ᴛᴏ:* ${newValue}\n` +
        `✅ *Oᴡɴᴇʀ Rᴇᴀᴄᴛ sᴇᴛ ᴛᴏ:* ${newValue}\n\n` +
        `Bot will ${newValue === 'true' ? 'now' : 'no longer'} automatically react to messages.`
    );
});
