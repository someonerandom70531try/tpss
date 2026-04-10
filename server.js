const express = require('express');
const cors = require('cors');
const { RtcTokenBuilder, RtcRole } = require('agora-access-token');
const axios = require('axios');
const path = require('path');

const app = express();
app.use(cors());

// ==========================================
// SERVE FRONTEND FILES
// ==========================================
// This tells your server to display your HTML, CSS, and JS files!
app.use(express.static(__dirname));

// ==========================================
// 1. AGORA VIDEO CREDENTIALS
// ==========================================
const APP_ID = '8adb28c71a9e40f8905245db411405ff';
// IMPORTANT: Don't forget to paste your Video App Certificate back in here!
const APP_CERTIFICATE = 'cdeb8a23c2bb4d539b52e6fd35e59f33';

// ==========================================
// 2. AGORA WHITEBOARD (FASTBOARD) CREDENTIALS
// ==========================================
const NETLESS_APP_ID = "Xcqs8DSzEfGFL5vDoGsKig/ZDjkqNztNYK1PA";
const NETLESS_SDK_TOKEN = "NETLESSSDK_YWs9Ti1pODUzZ0U4SDlOTThRdyZub25jZT02NjBmNmE4MC0zNGI0LTExZjEtOTBhNS02MWRlZWM1Njk4ZmEmcm9sZT0wJnNpZz05NjliNGM4MDc1NGRkZDU4ZDg2MmJjOGIyM2VhZTdiOTZjZjhhOGQ3Njc0Yjk2NzdmZjcwMDIzOWI3ZWMxMmYy";
const WB_REGION = "in-mum"; // Routing through Mumbai for the lowest possible latency

// ==========================================
// 3. VIDEO TOKEN ROUTE
// ==========================================
app.get('/rtcToken', (req, res) => {
    const channelName = req.query.channelName;
    if (!channelName) {
        return res.status(400).json({ error: 'channelName is required' });
    }

    // Setting UID to 0 tells Agora to safely auto-generate IDs for us on the frontend
    const uid = 0; 
    const role = RtcRole.PUBLISHER;
    const expirationTimeInSeconds = 3600; // 1-hour limit
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    try {
        const token = RtcTokenBuilder.buildTokenWithUid(
            APP_ID, 
            APP_CERTIFICATE, 
            channelName, 
            uid, 
            role, 
            privilegeExpiredTs
        );
        res.json({ token });
    } catch (err) {
        console.error("Video Token Error:", err);
        res.status(500).json({ error: "Failed to generate video token" });
    }
});

// ==========================================
// 4. WHITEBOARD API ROUTES
// ==========================================

// Route A: Caller creates a new Whiteboard Room
app.get('/wbCreate', async (req, res) => {
    try {
        // 1. Create the Room on Agora's servers
        const roomReq = await axios.post('https://api.netless.link/v5/rooms', 
            { isRecord: false }, 
            { headers: { token: NETLESS_SDK_TOKEN, region: WB_REGION } }
        );
        
        const uuid = roomReq.data.uuid;

        // 2. Generate an Admin Token for this specific Room UUID
        const tokenReq = await axios.post(`https://api.netless.link/v5/tokens/rooms/${uuid}`, 
            { lifespan: 36000000, role: "admin" }, // Valid for 10 hours
            { headers: { token: NETLESS_SDK_TOKEN } }
        );
        
        // Send everything back to the frontend
        res.json({ uuid: uuid, token: tokenReq.data, appIdentifier: NETLESS_APP_ID });
    } catch (error) {
        console.error("Whiteboard Create Error:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: "Whiteboard creation failed" });
    }
});

// Route B: Receiver gets a token to join the specific UUID
app.get('/wbJoin', async (req, res) => {
    try {
        const uuid = req.query.uuid;
        if (!uuid) return res.status(400).json({ error: "Missing UUID" });

        // Generate a Writer Token for the joining user
        const tokenReq = await axios.post(`https://api.netless.link/v5/tokens/rooms/${uuid}`, 
            { lifespan: 36000000, role: "writer" },
            { headers: { token: NETLESS_SDK_TOKEN } }
        );
        
        res.json({ token: tokenReq.data, appIdentifier: NETLESS_APP_ID });
    } catch (error) {
        console.error("Whiteboard Join Error:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: "Whiteboard join failed" });
    }
});

// ==========================================
// 5. STARTUP
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Skill Swap Backend running on port ${PORT}`);
});
