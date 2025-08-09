const express = require('express');
const fs = require('fs');
const pino = require("pino");
const { default: makeWASocket, useMultiFileAuthState, delay, Browsers, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');

const router = express.Router();

// Utility: remove file/folder
function removeFile(FilePath) {
    if (!fs.existsSync(FilePath)) return false;
    fs.rmSync(FilePath, { recursive: true, force: true });
}

router.get('/', async (req, res) => {
    let num = req.query.number;

    async function MASTERTECH_XD_PAIR_CODE() {
        // Use FIXED session folder for persistent login
        const { state, saveCreds } = await useMultiFileAuthState('./session');

        try {
            const items = ["Safari"];
            const randomItem = items[Math.floor(Math.random() * items.length)];

            let sock = makeWASocket({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
                },
                printQRInTerminal: false,
                generateHighQualityLinkPreview: true,
                logger: pino({ level: "fatal" }).child({ level: "fatal" }),
                syncFullHistory: false,
                browser: Browsers.macOS(randomItem)
            });

            if (!sock.authState.creds.registered) {
                await delay(1500);
                num = num.replace(/[^0-9]/g, '');
                const code = await sock.requestPairingCode(num);
                if (!res.headersSent) {
                    return res.send({ code });
                }
            } else {
                if (!res.headersSent) {
                    return res.send({ message: "Already paired and connected!" });
                }
            }

            sock.ev.on('creds.update', saveCreds);

            sock.ev.on("connection.update", async ({ connection, lastDisconnect }) => {
                if (connection === "open") {
                    await delay(3000);
                    const credsPath = `${__dirname}/session/creds.json`;

                    // Send creds.json as a file
                    await sock.sendMessage(sock.user.id, {
                        document: { url: credsPath },
                        mimetype: 'application/json',
                        fileName: 'creds.json',
                        caption: 'Here is your WhatsApp session file (creds.json). Keep it safe!'
                    });

                    // Send welcome text
                    let ELITE_XD_TEXT = `
╔════════════════════════╗
       🌟 *MASTERTECH CONNECTION* 🌟
       *Made With ❤️ & Magic*
╚════════════════════════╝

━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 *AMAZING CHOICE!* 🎯
You've selected *MASTERTECH-XD*
━━━━━━━━━━━━━━━━━━━━━━━━━
📺 *YouTube*: youtube.com/@mastertech
👑 *Owner*: wa.me/254743727510
💻 *Repo*: github.com/Mastertech-XD/Mastertech
👥 *Group*: whatsapp.com/channel/0029VazeyYx35fLxhB5TfC3D
🧩 *Plugins*: github.com/Mastertech-XD/Mastertech
━━━━━━━━━━━━━━━━━━━━━━━━━
_Don't Forget To Give Star To My Repo_`;

                    await sock.sendMessage(sock.user.id, { text: ELITE_XD_TEXT });
                } 
                else if (connection === "close" && lastDisconnect && lastDisconnect.error?.output?.statusCode !== 401) {
                    console.log("Connection closed, reconnecting...");
                    MASTERTECH_XD_PAIR_CODE();
                }
            });

        } catch (err) {
            console.log("Service restarted due to error:", err);
            if (!res.headersSent) {
                res.send({ code: "❗ Service Unavailable" });
            }
        }
    }

    return await MASTERTECH_XD_PAIR_CODE();
});

module.exports = router;
