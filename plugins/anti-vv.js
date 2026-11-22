const { cmd } = require("../command");
const config = require("../config");

// Exact keywords
const positiveKeywords = [
  "nice", "good", "cute", "🌝", "🥵", "💋",
  "👍", "🌚", "wow", "😩", "super"
];

// ==================== HELPER ====================
async function getViewOnceContent(quoted, userConfig) {
  const buffer = await quoted.download();
  const mtype = quoted.mtype;
  const originalCaption = quoted.text || "";

  const DESCRIPTION =
    userConfig?.DESCRIPTION || config.DESCRIPTION || "";

  let messageContent = {};

  switch (mtype) {
    case "imageMessage":
      messageContent = {
        image: buffer,
        caption: originalCaption
          ? `${originalCaption}\n\n> ${DESCRIPTION}`
          : (DESCRIPTION ? `> ${DESCRIPTION}` : ""),
        mimetype: quoted.mimetype || "image/jpeg"
      };
      break;

    case "videoMessage":
      messageContent = {
        video: buffer,
        caption: originalCaption
          ? `${originalCaption}\n\n> ${DESCRIPTION}`
          : (DESCRIPTION ? `> ${DESCRIPTION}` : ""),
        mimetype: quoted.mimetype || "video/mp4"
      };
      break;

    case "audioMessage":
      messageContent = {
        audio: buffer,
        mimetype: quoted.mimetype || "audio/mp4",
        ptt: quoted.ptt || false
      };
      break;

    default:
      return null;
  }

  return messageContent;
}

// ==================== KEYWORD VIEW ONCE ====================
cmd({
  on: "body"
}, async (client, message, store, {
  from,
  body,
  isCreator,
  reply,
  sender,
  userConfig
}) => {
  try {
    // Owner only
    if (!isCreator) return;

    const messageText = body.trim().toLowerCase();

    // Exact keyword only
    if (!positiveKeywords.includes(messageText)) return;

    // Must be replying to view once
    if (!message.quoted?.viewOnce) return;

    const messageContent = await getViewOnceContent(
      message.quoted,
      userConfig
    );

    if (!messageContent) return;

    // Send to owner's personal DM
    await client.sendMessage(
      message.sender,
      messageContent,
      { quoted: message }
    );

  } catch (error) {
    console.error("View Once Keyword Error:", error);
  }
});

// ==================== VV3 COMMAND ====================
cmd({
  pattern: "vv3",
  react: "🐳",
  desc: "Retrieve view once message in current chat",
  category: "owner",
  filename: __filename
}, async (client, message, match, store, {
  from,
  isCreator,
  userConfig
}) => {
  try {
    if (!isCreator) return;

    if (!match.quoted) {
      return await client.sendMessage(from, {
        text: "*🍁 Please reply to a view once message!*"
      }, { quoted: message });
    }

    if (!match.quoted.viewOnce) {
      return await client.sendMessage(from, {
        text: "*❌ Please reply to a view once message!*"
      }, { quoted: message });
    }

    const messageContent = await getViewOnceContent(
      match.quoted,
      userConfig
    );

    if (!messageContent) {
      return await client.sendMessage(from, {
        text: "❌ Only image, video, and audio view once messages are supported"
      }, { quoted: message });
    }

    // Send in current chat
    await client.sendMessage(
      from,
      messageContent,
      { quoted: message }
    );

  } catch (error) {
    console.error("vv3 Error:", error);

    await client.sendMessage(from, {
      text: "❌ Error retrieving view once message:\n" + error.message
    }, { quoted: message });
  }
});

// ==================== VV COMMAND ====================
cmd({
  pattern: "vv",
  alias: ["viewonce", "retrive"],
  react: "🐳",
  desc: "Owner Only - retrieve quoted message",
  category: "owner",
  filename: __filename
}, async (client, message, match, store, {
  from,
  isCreator,
  userConfig
}) => {
  try {
    if (!isCreator) {
      return await client.sendMessage(from, {
        text: "*📛 This is an owner command.*"
      }, { quoted: message });
    }

    if (!match.quoted) {
      return await client.sendMessage(from, {
        text: "*🍁 Please reply to a view once message!*"
      }, { quoted: message });
    }

    const messageContent = await getViewOnceContent(
      match.quoted,
      userConfig
    );

    if (!messageContent) {
      return await client.sendMessage(from, {
        text: "❌ Only image, video, and audio messages are supported"
      }, { quoted: message });
    }

    // Send in current chat
    await client.sendMessage(
      from,
      messageContent,
      { quoted: message }
    );

  } catch (error) {
    console.error("vv Error:", error);

    await client.sendMessage(from, {
      text: "❌ Error fetching vv message:\n" + error.message
    }, { quoted: message });
  }
});

// ==================== VV2 COMMAND ====================
cmd({
  pattern: "vv2",
  alias: [
    "wah", "ohh", "oho", "🙂", "😂", "❤️",
    "💋", "🥵", "🌚", "😒", "nice", "ok"
  ],
  desc: "Owner Only - retrieve quoted message to DM",
  category: "owner",
  filename: __filename
}, async (client, message, match, store, {
  from,
  isCreator,
  userConfig
}) => {
  try {
    if (!isCreator) return;

    if (!match.quoted) {
      return await client.sendMessage(from, {
        text: "*🍁 Please reply to a view once message!*"
      }, { quoted: message });
    }

    const messageContent = await getViewOnceContent(
      match.quoted,
      userConfig
    );

    if (!messageContent) {
      return await client.sendMessage(from, {
        text: "❌ Only image, video, and audio messages are supported"
      }, { quoted: message });
    }

    // Send to owner's personal DM
    await client.sendMessage(
      message.sender,
      messageContent,
      { quoted: message }
    );

  } catch (error) {
    console.error("vv2 Error:", error);

    await client.sendMessage(from, {
      text: "❌ Error fetching vv2 message:\n" + error.message
    }, { quoted: message });
  }
});
