const { makeid } = require('./id');
const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const pino = require("pino");
const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    delay, 
    Browsers, 
    makeCacheableSignalKeyStore,
    DisconnectReason
} = require('@whiskeysockets/baileys');

// Configure logger
const logger = pino({ level: 'fatal' }).child({ level: 'fatal' });

// Session storage
const activeSessions = new Map();

function removeFile(FilePath) {
    if (!fs.existsSync(FilePath)) return false;
    fs.rmSync(FilePath, { recursive: true, force: true });
}

const WELCOME_MESSAGE = `
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

router.get('/', async (req, res) => {
    const id = makeid();
    let num = req.query.number;

    async function MASTERTECH_XD_PAIR_CODE() {
        const { state, saveCreds } = await useMultiFileAuthState('./temp/' + id);

        try {
            const sock = makeWASocket({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, logger),
                },
                printQRInTerminal: false,
                generateHighQualityLinkPreview: true,
                logger: logger,
                syncFullHistory: false,
                browser: Browsers.macOS("Safari"),
                keepAliveIntervalMs: 30000,
                connectTimeoutMs: 60000,
                maxRetries: 15
            });

            activeSessions.set(id, sock);

            if (!sock.authState.creds.registered) {
                await delay(1500);
                num = num.replace(/[^0-9]/g, '');
                const code = await sock.requestPairingCode(num);
                if (!res.headersSent) {
                    res.send({ code });
                }
            }

            sock.ev.on('creds.update', saveCreds);

            // Keep-alive mechanism
            const keepAliveInterval = setInterval(() => {
                if (sock.connection === 'open') {
                    sock.sendPresenceUpdate('available').catch(() => {});
                }
            }, 25000);

            sock.ev.on("connection.update", async (update) => {
                const { connection, lastDisconnect } = update;

                if (connection === "open") {
                    try {
                        const credsPath = path.join(__dirname, 'temp', id, 'creds.json');
                        
                        // Send credentials file
                        await sock.sendMessage(sock.user.id, {
                            document: { url: credsPath },
                            mimetype: 'application/json',
                            fileName: 'creds.json',
                            caption: 'Here is your WhatsApp session file (creds.json). Keep it safe!'
                        });

                        // Send welcome message
                        await sock.sendMessage(sock.user.id, { 
                            text: WELCOME_MESSAGE 
                        });

                        // Clean temp files but keep connection alive
                        removeFile('./temp/' + id);
                    } catch (err) {
                        logger.error('Message sending error:', err);
                    }
                } 
                else if (connection === "close") {
                    clearInterval(keepAliveInterval);
                    
                    if (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) {
                        logger.info('Reconnecting...');
                        await delay(5000);
                        MASTERTECH_XD_PAIR_CODE();
                    } else {
                        logger.info('Connection closed permanently');
                        activeSessions.delete(id);
                        removeFile('./temp/' + id);
                    }
                }
            });

            // Cleanup on process exit
            process.on('exit', () => {
                clearInterval(keepAliveInterval);
                sock.ws.close();
                activeSessions.delete(id);
                removeFile('./temp/' + id);
            });

        } catch (err) {
            logger.error('Initialization error:', err);
            removeFile('./temp/' + id);
            if (!res.headersSent) {
                res.status(500).send({ code: "Service error" });
            }
        }
    }

    MASTERTECH_XD_PAIR_CODE();
});

// Status check endpoint
router.get('/status/:id', (req, res) => {
    const session = activeSessions.get(req.params.id);
    res.send({
        active: !!session,
        state: session?.connection || 'disconnected'
    });
});

// Manual close endpoint
router.get('/close/:id', (req, res) => {
    const session = activeSessions.get(req.params.id);
    if (session) {
        session.ws.close();
        activeSessions.delete(req.params.id);
        removeFile('./temp/' + req.params.id);
        res.send({ success: true });
    } else {
        res.status(404).send({ error: 'Session not found' });
    }
});

module.exports = router;
