const { cmd } = require('../command');

const enabledConnections = new WeakSet();
const registeredConnections = new WeakSet();

const emojis = [
    '❤️', '🔥', '😍', '⚡', '🥰',
    '💯', '✨', '👍', '😂', '💖',
    '🚀', '🤩', '😎', '🌟'
];

function getContent(message) {
    let content = message?.message;

    while (
        content?.ephemeralMessage ||
        content?.viewOnceMessage ||
        content?.viewOnceMessageV2
    ) {
        content =
            content.ephemeralMessage?.message ||
            content.viewOnceMessage?.message ||
            content.viewOnceMessageV2?.message;
    }

    return content;
}

cmd({
    pattern: "bugga",
    alias: [],
    use: ".bugga on/off",
    desc: "Enable or disable automatic reactions.",
    category: "settings",
    react: "⚡",
    filename: __filename
},
async (conn, mek, m, { reply, q }) => {
    try {
        const action = String(q || '').trim().toLowerCase();

        if (action === "on") {
            enabledConnections.add(conn);

            if (!registeredConnections.has(conn)) {
                registeredConnections.add(conn);

                conn.ev.on('messages.upsert', async ({ messages }) => {
                    if (!enabledConnections.has(conn)) return;

                    for (const msg of messages || []) {
                        try {
                            const jid = msg?.key?.remoteJid;
                            const content = getContent(msg);

                            if (!jid || !content) continue;
                            if (jid === 'status@broadcast') continue;

                            if (
                                content.reactionMessage ||
                                content.protocolMessage
                            ) continue;

                            const emoji =
                                emojis[Math.floor(Math.random() * emojis.length)];

                            await conn.sendMessage(jid, {
                                react: {
                                    text: emoji,
                                    key: msg.key
                                }
                            });

                        } catch (error) {
                            console.error("AutoReact Error:", error);
                        }
                    }
                });
            }

            return reply(
                "╭━━〔 ⚡ BUGGA 〕━━╮\n" +
                "┃\n" +
                "┃ Status: ON ✅\n" +
                "┃ Incoming: Enabled\n" +
                "┃ Outgoing: Enabled\n" +
                "┃\n" +
                "╰━━━━━━━━━━━━━━━━━━╯"
            );

        } else if (action === "off") {
            enabledConnections.delete(conn);

            return reply(
                "╭━━〔 ⚡ BUGGA 〕━━╮\n" +
                "┃\n" +
                "┃ Status: OFF ❌\n" +
                "┃ Auto Reaction Disabled\n" +
                "┃\n" +
                "╰━━━━━━━━━━━━━━━━━━╯"
            );

        } else {
            return reply(
                "⚡ BUGGA SETTINGS\n\n" +
                "Use:\n" +
                ".bugga on\n" +
                ".bugga off\n\n" +
                "Default Status: OFF"
            );
        }

    } catch (error) {
        console.error("Bugga Command Error:", error);
        reply(`Error: ${error.message}`);
    }
});
