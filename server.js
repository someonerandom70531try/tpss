const express = require('express');
const path = require('path');
const { RtcTokenBuilder, RtcRole } = require('agora-access-token');

const app = express();
// Render assigns a dynamic port, so we must use process.env.PORT
const PORT = process.env.PORT || 3000;

// ==========================================
// AGORA SECURE TOKEN SERVER
// ==========================================
// PASTE YOUR AGORA KEYS HERE
const APP_ID = 'YOUR_APP_ID'; 
const APP_CERTIFICATE = 'YOUR_APP_CERTIFICATE'; 

// This endpoint generates a secure, 2-hour token for the video call
app.get('/rtcToken', (req, res) => {
    const channelName = req.query.channelName;
    if (!channelName) {
        return res.status(400).json({ error: 'channelName is required' });
    }

    let uid = req.query.uid || 0; // 0 allows Agora to auto-assign a UID if needed
    let role = RtcRole.PUBLISHER; // Allows the user to send and receive video
    const expireTime = 7200; // Token expires in 2 hours (7200 seconds)

    const currentTime = Math.floor(Date.now() / 1000);
    const privilegeExpireTime = currentTime + expireTime;

    try {
        // Cryptographically sign the token using your App Certificate
        const token = RtcTokenBuilder.buildTokenWithUid(APP_ID, APP_CERTIFICATE, channelName, uid, role, privilegeExpireTime);
        return res.json({ token: token });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// Serve all static files from the current directory (__dirname)
app.use(express.static(__dirname));

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
