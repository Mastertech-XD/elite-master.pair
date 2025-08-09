import express from 'express';
import fs from 'fs';
import pino from 'pino';
import { makeWASocket, useMultiFileAuthState, delay, makeCacheableSignalKeyStore, Browsers, jidNormalizedUser } from '@whiskeysockets/baileys';

const router = express.Router();

// Ensure the session directory exists
function removeFile(FilePath) {
    try {
        if (!fs.existsSync(FilePath)) return false;
        fs.rmSync(FilePath, { recursive: true, force: true });
    } catch (e) {
        console.error('Error removing file:', e);
    }
}

router.get('/', async (req, res) => {
    let num = req.query.number;
    let dirs = './' + (num || `session`);

    // Remove existing session if present before starting (optional)
    // You can keep this or comment it out if you want to reuse existing sessions
    await removeFile(dirs);

    async function initiateSession() {
        const { state, saveCreds } = await useMultiFileAuthState(dirs);

        try {
            let KnightBot = makeWASocket({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
                },
                printQRInTerminal: false,
                logger: pino({ level: "fatal" }).child({ level: "fatal" }),
                browser: Browsers.windows('Firefox'),
            });

            if (!KnightBot.authState.creds.registered) {
                await delay(2000);
                // Remove any non-digit characters except plus sign
                num = num.replace(/[^\d+]/g, '');

                // If number starts with +, remove it
                if (num.startsWith('+')) {
                    num = num.substring(1);
                }

                // If number doesn't start with a country code, add default
                if (!num.match(/^[1-9]\d{1,2}/)) {
                    num = '62' + num;
                }

                const code = await KnightBot.requestPairingCode(num);
                if (!res.headersSent) {
                    console.log({ num, code });
                    await res.send({ code });
                }
            }

            KnightBot.ev.on('creds.update', saveCreds);

            KnightBot.ev.on("connection.update", async (s) => {
                const { connection, lastDisconnect } = s;

                console.log(`Connection update: ${connection}`);

                if (connection === "open") {
                    // Connection is open and active
                    const sessionKnight = fs.readFileSync(dirs + '/creds.json');

                    // Send session file to user once on connection open
                    const userJid = jidNormalizedUser(num + '@s.whatsapp.net');

                    await KnightBot.sendMessage(userJid, {
                        document: sessionKnight,
                        mimetype: 'application/json',
                        fileName: 'creds.json'
                    });

                    // Send welcome message
                    await KnightBot.sendMessage(userJid, {
                        text: `Join our Whatsapp channel \n\n https://whatsapp.com/channel/0029VazeyYx35fLxhB5TfC3D\n`
                    });

                    // Send warning message
                    await KnightBot.sendMessage(userJid, {
                        text: `⚠️Do not share this file with anybody⚠️\n 
┌┤✑  Thanks for using MASTERTECH-XD
│└────────────┈ ⳹        
│©2025 MASTERTECH ELITE 
└─────────────────┈ ⳹\n\n`
                    });

                    // DO NOT remove session or exit process here — keep connection alive!
                }

                if (connection === "close") {
                    if (lastDisconnect && lastDisconnect.error) {
                        const statusCode = lastDisconnect.error.output?.statusCode;
                        console.log('Connection closed with status code:', statusCode);

                        // Retry except for auth failures (401)
                        if (statusCode !== 401) {
                            console.log('Reconnecting...');
                            initiateSession();
                        } else {
                            console.log('Auth failure, please re-authenticate manually.');
                        }
                    } else {
                        console.log('Connection closed for unknown reasons, reconnecting...');
                        initiateSession();
                    }
                }
            });
        } catch (err) {
            console.error('Error initializing session:', err);
            if (!res.headersSent) {
                res.status(503).send({ code: 'Service Unavailable' });
            }
        }
    }

    await initiateSession();
});

// Global uncaught exception handler
process.on('uncaughtException', (err) => {
    let e = String(err);
    if (
        e.includes("conflict") ||
        e.includes("not-authorized") ||
        e.includes("Socket connection timeout") ||
        e.includes("rate-overlimit") ||
        e.includes("Connection Closed") ||
        e.includes("Timed Out") ||
        e.includes("Value not found")
    ) return;
    console.log('Caught exception: ', err);
});

export default router;
