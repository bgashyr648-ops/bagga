// lib/newsletters.js — Dynamic & Command-Ready Version
const fs = require('fs');
const path = require('path');

const settingsPath = path.join(__dirname, '../database/channel_settings.json');

// Default settings
const defaultSettings = {
    newsletterJids: [
        "120363410899676732@newsletter"
    ],
    FollowChannelJids: [
        "120363410899676732@newsletter"
    ],
    channelName: "Nobita-MD Official Updates",
    channelLink: "https://whatsapp.com/channel/your_link_here"
};

// Load settings function
function loadSettings() {
    try {
        if (!fs.existsSync(path.dirname(settingsPath))) {
            fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
        }
        if (!fs.existsSync(settingsPath)) {
            fs.writeFileSync(settingsPath, JSON.stringify(defaultSettings, null, 2));
            return defaultSettings;
        }
        const data = fs.readFileSync(settingsPath, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        console.error("Error loading channel settings:", e);
        return defaultSettings;
    }
}

// Save settings function
function saveSettings(newSettings) {
    try {
        fs.writeFileSync(settingsPath, JSON.stringify(newSettings, null, 2));
        return true;
    } catch (e) {
        console.error("Error saving channel settings:", e);
        return false;
    }
}

// Exporting dynamic getters so it always fetches latest data
module.exports = {
    get newsletterJids() {
        return loadSettings().newsletterJids;
    },
    get FollowChannelJids() {
        return loadSettings().FollowChannelJids;
    },
    get channelName() {
        return loadSettings().channelName;
    },
    get channelLink() {
        return loadSettings().channelLink;
    },
    loadSettings,
    saveSettings
};
                         
