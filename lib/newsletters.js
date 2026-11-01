// lib/newsletters.js
// This file contains newsletter channel JIDs for auto-react and follow features

// ===============================
// NEWSLETTER JIDS FOR AUTO-REACT
// ===============================
// These channels will get auto-reactions when new posts are published
const newsletterJids = [
    "120363410899676732@newsletter",    
];

// ===============================
// FOLLOW CHANNEL JIDS FOR AUTO-FOLLOW
// ===============================
// These channels will be followed when a bot connects
const FollowChannelJids = [
    "120363410899676732@newsletter",   
];

// Export arrays for use in index.js
module.exports = {
    newsletterJids,
    FollowChannelJids
};
