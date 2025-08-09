const { makeid } = require('./id');
const express = require('express');
const fs = require('fs');
let router = express.Router();
const pino = require("pino");
const { default: makeWASocket, useMultiFileAuthState, delay, Browsers, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');

function removeFile(FilePath) {
    if (!fs.existsSync(FilePath)) return false;
    fs.rmSync(FilePath, { recursive: true, force: true });
}

// Store active connections
const activeConnections = new Map();

router.get('/', async (req, res) => {
    const id = makeid();
    let num = req.query.number;

    async function MASTERTECH_XD_PAIR_CODE() {
        const { state, saveCreds } = await useMultiFileAuthState('./temp/' + id);

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
                browser: Browsers.macOS(randomItem),
                keepAliveIntervalMs: 30000 // Add keep alive interval
            });

            // Store the socket in active connections
            activeConnections.set(id, sock);

            if (!sock.authState.creds.registered) {
                await delay(1500);
                num = num.replace(/[^0-9]/g, '');
                const code = await sock.requestPairingCode(num);
                if (!res.headersSent) {
                    await res.send({ code });
                }
            }

            sock.ev.on('creds.update', saveCreds);

            sock.ev.on("connection.update", async ({ connection, lastDisconnect }) => {
                if (connection === "open") {
                    await delay(5000);
                    const credsPath = `${__dirname}/temp/${id}/creds.json`;

                    const sessionMessage = await sock.sendMessage(sock.user.id, {
                        document: { url: credsPath },
                        mimetype: 'application/json',
                        fileName: 'creds.json',
                        caption: 'Here is your WhatsApp session file (creds.json). Keep it safe!'
                    });

                    let ELITE_XD_TEXT = `
╔════════════════════════╗
       🌟 *MASTERTECH CONNECTION* 🌟
       *Made With ❤️ & Magic*
╚════════════════════════╝

━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 *AMAZING CHOICE!* 🎯
You've selected *MASTERTECH-XD*
The ultimate WhatsApp bot solution!

━━━━━━━━━━━━━━━━━━━━━━━━━

🔍 *SUPPORT & RESOURCES* 🔍
————————————————————
📺 *YouTube*: youtube.com/@mastertech
👑 *Owner*: wa.me/254743727510
💻 *Repo*: github.com/Mastertech-XD/Mastertech
👥 *Group*: whatsapp.com/channel/0029VazeyYx35fLxhB5TfC3D
🧩 *Plugins*: github.com/Mastertech-XD/Mastertech
————————————————————

━━━━━━━━━━━━━━━━━━━━━━━━━

💎 *BOT FEATURES* 💎
✔ Lightning Fast Responses
✔ 99.9% Uptime Guarantee
✔ Daily Auto-Updates
✔ Premium Support

━━━━━━━━━━━━━━━━━━━━━━━━━

✨ *Thank You For Trusting Us!* ✨
Your satisfaction is our #1 priority!

╔════════════════════════╗
   🚀 *Start Your Bot Journey Today!* 🚀
╚════════════════════════╝
_____________________________________

_Don't Forget To Give Star To My Repo_`;

                    await sock.sendMessage(sock.user.id, { text: ELITE_XD_TEXT }, { quoted: sessionMessage });

                    // Remove temporary files but keep connection active
                    await removeFile('./temp/' + id);

                    // Add event listeners to maintain connection
                    sock.ev.on('messages.upsert', () => {
                        // Handle incoming messages
                    });

                    // Periodically send keep-alive messages
                    setInterval(() => {
                        if (sock.connection === 'open') {
                            sock.sendPresenceUpdate('available');
                        }
                    }, 60000);

                } else if (connection === "close") {
                    if (lastDisconnect?.error?.output?.statusCode !== 401) {
                        await delay(10000);
                        MASTERTECH_XD_PAIR_CODE();
                    } else {
                        // Remove from active connections
                        activeConnections.delete(id);
                        await removeFile('./temp/' + id);
                    }
                }
            });

        } catch (err) {
            console.log("Service restarted due to error:", err);
            await removeFile('./temp/' + id);
            if (!res.headersSent) {
                await res.send({ code: "❗ Service Unavailable" });
            }
        }
    }

    return await MASTERTECH_XD_PAIR_CODE();
});

// Add endpoint to check active connections
router.get('/active', (req, res) => {
    res.json({ count: activeConnections.size });
});

// Cleanup on process exit
process.on('exit', () => {
    activeConnections.forEach(sock => sock.ws.close());
});

module.exports = router;
