
const { cmd } = require("../command");
const fs = require("fs");
const path = require("path");

// ======================================
// NAVEED AHMADI - WELCOME & GOODBYE
// ======================================

const DB_FILE = path.join(__dirname, "welcome-goodbye.json");

function loadDB() {
    try {
        if (!fs.existsSync(DB_FILE)) return {};
        return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
    } catch (e) {
        console.error("Welcome DB Error:", e);
        return {};
    }
}

function saveDB(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// ======================================
// SET WELCOME
// ======================================

cmd({
    pattern: "setwelcome",
    desc: "Set custom welcome message",
    category: "group",
    filename: __filename
}, async (conn, mek, m, { from, q, reply, isGroup, isAdmins, isCreator }) => {
    try {
        if (!isGroup) return reply("❌ Groups only!");
        if (!isAdmins && !isCreator) return reply("❌ Only admins can use this command!");
        if (!q) return reply("Example: .setwelcome Welcome @user to our group!");

        const db = loadDB();
        db[from] = db[from] || {};
        db[from].welcome = q;
        saveDB(db);

        return reply("✅ Welcome message saved successfully!");
    } catch (e) {
        console.error(e);
        return reply("❌ " + e.message);
    }
});

// ======================================
// SET GOODBYE
// ======================================

cmd({
    pattern: "setgoodbye",
    desc: "Set custom goodbye message",
    category: "group",
    filename: __filename
}, async (conn, mek, m, { from, q, reply, isGroup, isAdmins, isCreator }) => {
    try {
        if (!isGroup) return reply("❌ Groups only!");
        if (!isAdmins && !isCreator) return reply("❌ Only admins can use this command!");
        if (!q) return reply("Example: .setgoodbye Goodbye @user!");

        const db = loadDB();
        db[from] = db[from] || {};
        db[from].goodbye = q;
        saveDB(db);

        return reply("✅ Goodbye message saved successfully!");
    } catch (e) {
        console.error(e);
        return reply("❌ " + e.message);
    }
});

// ======================================
// RESET WELCOME
// ======================================

cmd({
    pattern: "resetwelcome",
    desc: "Reset welcome message",
    category: "group",
    filename: __filename
}, async (conn, mek, m, { from, reply, isGroup, isAdmins, isCreator }) => {
    try {
        if (!isGroup) return reply("❌ Groups only!");
        if (!isAdmins && !isCreator) return reply("❌ Admins only!");

        const db = loadDB();
        if (db[from]) delete db[from].welcome;
        saveDB(db);

        return reply("✅ Welcome message reset!");
    } catch (e) {
        console.error(e);
        return reply("❌ " + e.message);
    }
});

// ======================================
// RESET GOODBYE
// ======================================

cmd({
    pattern: "resetgoodbye",
    desc: "Reset goodbye message",
    category: "group",
    filename: __filename
}, async (conn, mek, m, { from, reply, isGroup, isAdmins, isCreator }) => {
    try {
        if (!isGroup) return reply("❌ Groups only!");
        if (!isAdmins && !isCreator) return reply("❌ Admins only!");

        const db = loadDB();
        if (db[from]) delete db[from].goodbye;
        saveDB(db);

        return reply("✅ Goodbye message reset!");
    } catch (e) {
        console.error(e);
        return reply("❌ " + e.message);
    }
});

// ======================================
// GROUP PARTICIPANT EVENT
// ======================================

const registered = new WeakSet();

function registerWelcomeEvents(conn) {
    if (registered.has(conn)) return;
    registered.add(conn);

    conn.ev.on("group-participants.update", async (update) => {
        try {
            const db = loadDB();
            const settings = db[update.id];

            if (!settings) return;

            for (const jid of update.participants || []) {
                let message = "";

                if (update.action === "add" && settings.welcome) {
                    message = settings.welcome;
                } else if (
                    (update.action === "remove" || update.action === "leave") &&
                    settings.goodbye
                ) {
                    message = settings.goodbye;
                }

                if (!message) continue;

                const number = jid.split("@")[0];
                message = message.replace(/@user/gi, "@" + number);

                await conn.sendMessage(update.id, {
                    text: message,
                    mentions: [jid]
                });
            }
        } catch (e) {
            console.error("Welcome/Goodbye Event Error:", e);
        }
    });
}

// ======================================
// EVENT REGISTRATION
// ======================================

// Register the event when the plugin is loaded.
// The bot must pass its connection to this function.
module.exports = { registerWelcomeEvents };
