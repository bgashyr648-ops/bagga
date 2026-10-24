const { cmd } = require('../command');
const config = require('../config');
const { sleep } = require('../lib/functions');
const fs = require('fs');
const path = require('path');

// File path to store custom owner details
const OWNER_DATA_PATH = path.join(__dirname, '../lib/custom_owner.json');

// Helper function to read saved custom owner
const getCustomOwner = () => {
  if (fs.existsSync(OWNER_DATA_PATH)) {
    try {
      const data = fs.readFileSync(OWNER_DATA_PATH, 'utf-8');
      return JSON.parse(data);
    } catch (e) {
      return null;
    }
  }
  return null;
};

// ==========================================
// 1. SET OWNER NUMBER COMMAND (.setowner)
// ==========================================
cmd({
  pattern: "setowner",
  alias: ["changeowner", "myowner"],
  desc: "Set custom owner number and name",
  category: "main",
  react: "⚙️",
  filename: __filename
}, async (sock, m, msg, { from, q, reply }) => {
  try {
    if (!q) {
      return reply("⚠️ *Usage:* `.setowner 923001234567` ya `.setowner 923001234567|Owner Name`");
    }

    let input = q.trim();
    let newNumber = "";
    let newName = "";

    if (input.includes('|')) {
      const parts = input.split('|');
      newNumber = parts[0].replace(/[^0-9]/g, '');
      newName = parts[1].trim();
    } else {
      newNumber = input.replace(/[^0-9]/g, '');
    }

    if (!newNumber || newNumber.length < 8) {
      return reply("❌ *Galt Number!* Sahi WhatsApp number likhein (e.g. 923001234567).");
    }

    const customOwnerData = {
      number: newNumber,
      name: newName || null
    };

    fs.writeFileSync(OWNER_DATA_PATH, JSON.stringify(customOwnerData, null, 2));

    return reply(`✅ *Owner Details Successfully Updated!*\n\n📱 *Number:* ${newNumber}\n👤 *Name:* ${newName || 'Default Name'}\n\nAb `.owner` likhne par yehi naya number aayega.`);
  } catch (e) {
    console.error("Error setting owner:", e);
    return reply(`❌ Error setting owner: ${e.message}`);
  }
});

// ==========================================
// 2. GET OWNER COMMAND (.owner)
// ==========================================
cmd({
  pattern: "owner",
  desc: "Get owner number",
  category: "main",
  react: "💀",
  filename: __filename
}, async (sock, m, msg, { from, userConfig }) => {
  try {
    await sock.sendPresenceUpdate("composing", from);

    // Read saved custom owner details if set
    const savedCustomOwner = getCustomOwner();

    const OWNER_NUMBER = savedCustomOwner?.number || userConfig?.OWNER_NUMBER || config.OWNER_NUMBER || "0000000000";
    const OWNER_NAME = savedCustomOwner?.name || userConfig?.OWNER_NAME || config.OWNER_NAME || "Bot Owner";
    const TEAM_NAME = "KHAN-MD TEAM"; // Direct hardcoded as requested

    const vcard =
      'BEGIN:VCARD\n' +
      'VERSION:3.0\n' +
      `FN:${OWNER_NAME}\n` +
      `ORG:${TEAM_NAME};\n` +
      `TEL;type=CELL;type=VOICE;waid=${OWNER_NUMBER}:${'+' + OWNER_NUMBER}\n` +
      'END:VCARD';

    await sock.sendMessage(from, {
      contacts: {
        displayName: OWNER_NAME,
        contacts: [{ vcard }]
      }
    });

    await sock.sendMessage(from, { react: { text: "✅", key: m.key } });

  } catch (e) {
    console.error("Error sending contact:", e);
    await sock.sendMessage(from, {
      text: `❌ Couldn't send contact:\n${e.message}`
    });
  }
});
          
