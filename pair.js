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
    
    // Remove existing session if present
    await removeFile(dirs);
    
    async function initiateSession() {
        const { state, saveCreds } = await useMultiFileAuthState(dirs);

        try {
            let MASTERTECH_XD = makeWASocket({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
                },
                printQRInTerminal: false,
                logger: pino({ level: "fatal" }).child({ level: "fatal" }),
                browser: Browsers.windows('Firefox'),
            });

            if (!MASTERTECH_XD.authState.creds.registered) {
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
                
                const code = await MASTERTECH_XD.requestPairingCode(num);
                if (!res.headersSent) {
                    console.log({ num, code });
                    await res.send({ code });
                }
            }

            MASTERTECH_XD.ev.on('creds.update', saveCreds);
            MASTERTECH_XD.ev.on("connection.update", async (s) => {
                const { connection, lastDisconnect } = s;

                if (connection === "open") {
                    await delay(10000);
                    const sessionelite = fs.readFileSync(dirs + '/creds.json');

                    // Send session file to user
                    const userJid = jidNormalizedUser(num + '@s.whatsapp.net');
                    await MASTERTECH_XD.sendMessage(userJid, { 
                        document: sessionelite, 
                        mimetype: 'application/json', 
                        fileName: 'creds.json' 
                    });

                    // Send welcome message
                    await MASTERTECH_XD.sendMessage(userJid, { 
                        text: `Join our Whatsapp channel \n\n https://whatsapp.com/channel/0029Va90zAnIHphOuO8Msp3A\n` 
                    });

                    // Send warning message
                    await MASTERTECH_XD.sendMessage(userJid, { 
                        text: `⚠️Do not share this file with anybody⚠️\n 
┌┤✑  Thanks for using MASTERTECH-XD
│└────────────┈ ⳹        
│©2025 MASTERPEACE ELITE
└─────────────────┈ ⳹\n\n` 
                    });

                    // Clean up session after use
                    await delay(100);
                    removeFile(dirs);
                    process.exit(0);
                }
                if (connection === "close" && lastDisconnect && lastDisconnect.error && lastDisconnect.error.output.statusCode != 401) {
                    initiateSession();
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
    if (e.includes("conflict")) return;
    if (e.includes("not-authorized")) return;
    if (e.includes("Socket connection timeout")) return;
    if (e.includes("rate-overlimit")) return;
    if (e.includes("Connection Closed")) return;
    if (e.includes("Timed Out")) return;
    if (e.includes("Value not found")) return;
    console.log('Caught exception: ', err);
});

export default router;
