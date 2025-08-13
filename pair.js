import express from 'express';
import fs from 'fs';
import pino from 'pino';
import { 
    makeWASocket, 
    useMultiFileAuthState, 
    delay, 
    makeCacheableSignalKeyStore, 
    Browsers, 
    jidNormalizedUser 
} from '@whiskeysockets/baileys';

const router = express.Router();

// Helper to remove files/folders
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
    let welcomeSent = false; // track if we've already sent file & messages

    // Optional: remove old session folder before starting
    await removeFile(dirs);

    async function initiateSession() {
        const { state, saveCreds } = await useMultiFileAuthState(dirs);

        try {
            let KnightBot = makeWASocket({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(
                        state.keys, 
                        pino({ level: "fatal" }).child({ level: "fatal" })
                    ),
                },
                printQRInTerminal: false,
                logger: pino({ level: "fatal" }).child({ level: "fatal" }),
                browser: Browsers.windows('Firefox'),
            });

            if (!KnightBot.authState.creds.registered) {
                await delay(2000);

                num = num.replace(/[^\d+]/g, '');
                if (num.startsWith('+')) num = num.substring(1);
                if (!num.match(/^[1-9]\d{1,2}/)) num = '62' + num;

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

                if (connection === "open" && !welcomeSent) {
                    welcomeSent = true; // ensure messages/files only sent once

                    try {
                        const sessionKnight = fs.readFileSync(dirs + '/creds.json');
                        const userJid = jidNormalizedUser(num + '@s.whatsapp.net');

                        // Send session file once
                        await KnightBot.sendMessage(userJid, {
                            document: sessionKnight,
                            mimetype: 'application/json',
                            fileName: 'creds.json'
                        });

                        // Send welcome & warning messages
                        await KnightBot.sendMessage(userJid, {
                            text: `Join our Whatsapp channel \n\n https://whatsapp.com/channel/0029VazeyYx35fLxhB5TfC3D\n`
                        });

                        await KnightBot.sendMessage(userJid, {
                            text: `⚠️ Do not share this file with anybody ⚠️\n 
┌┤✑  Thanks for using MASTERTECH-XD
│└────────────┈ ⳹        
│©2025 MASTERTECH ELITE 
└─────────────────┈ ⳹\n\n`
                        });

                    } catch (err) {
                        console.error('Error sending initial file/messages:', err);
                    }
                }

                if (connection === "close") {
                    const shouldReconnect = 
                        lastDisconnect && lastDisconnect.error && 
                        lastDisconnect.error.output?.statusCode !== 401;

                    if (shouldReconnect) {
                        console.log('Connection closed. Reconnecting...');
                        initiateSession();
                    } else {
                        console.log('Authentication failure or intentional logout.');
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

// Handle unexpected errors gracefully
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
