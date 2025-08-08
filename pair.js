const express = require('express');
const fs = require('fs');
const pino = require("pino");
const { makeWASocket, useMultiFileAuthState, delay, Browsers } = require("@whiskeysockets/baileys"); // Using official package
const router = express.Router();

// Debug logger
const logger = pino({ level: 'debug' }).child({ module: 'pairing' });

async function removeFile(FilePath) {
    if (fs.existsSync(FilePath)) {
        fs.rmSync(FilePath, { recursive: true, force: true });
    }
}

router.get('/', async (req, res) => {
    const sessionId = Date.now().toString(); // Unique session ID
    const num = req.query.number?.replace(/[^0-9]/g, '');

    if (!num || num.length < 10) {
        return res.status(400).json({ error: "Valid phone number required" });
    }

    logger.debug(`Starting pairing for number: ${num}`);

    try {
        const { state, saveCreds } = await useMultiFileAuthState(`./temp/${sessionId}`);
        
        const sock = makeWASocket({
            auth: {
                creds: state.creds,
                keys: state.keys,
            },
            printQRInTerminal: false,
            logger: logger,
            browser: Browsers.ubuntu('Chrome'),
            version: [3, 5254, 11] // Latest stable version
        });

        sock.ev.on('creds.update', saveCreds);

        if (!sock.authState.creds.registered) {
            logger.debug('Account not registered, requesting pairing code...');
            
            try {
                // Format number with country code if missing
                const formattedNum = num.startsWith('') ? num : `254${num}`; // Kenya example
                const code = await sock.requestPairingCode(formattedNum);
                logger.debug(`Pairing code generated: ${code}`);
                
                return res.json({ 
                    code: code,
                    message: "Enter this code in your phone's WhatsApp Linked Devices section"
                });
            } catch (pairError) {
                logger.error('Pairing failed:', pairError);
                await removeFile(`./temp/${sessionId}`);
                return res.status(500).json({ 
                    error: "Pairing failed",
                    details: pairError.message 
                });
            }
        }

        sock.ev.on("connection.update", async (update) => {
            logger.debug('Connection update:', update);
            
            if (update.connection === "open") {
                logger.debug('Connection established, sending session data...');
                
                try {
                    // Send session data to user
                    const sessionData = fs.readFileSync(`./temp/${sessionId}/creds.json`);
                    await sock.sendMessage(
                        sock.user.id, 
                        { text: Buffer.from(sessionData).toString('base64') }
                    );
                    
                    // Send welcome message
                    await sock.sendMessage(
                        sock.user.id,
                        { text: `*Session Connected!*\n\nYour WhatsApp bot session is now active.` }
                    );
                    
                    logger.debug('Session transfer complete, cleaning up...');
                    await sock.ws.close();
                    await removeFile(`./temp/${sessionId}`);
                } catch (e) {
                    logger.error('Session transfer failed:', e);
                }
            }
            else if (update.connection === "close") {
                logger.warn('Connection closed', update.lastDisconnect?.error);
                await removeFile(`./temp/${sessionId}`);
            }
        });

        // Timeout after 2 minutes
        setTimeout(async () => {
            if (!sock.authState.creds.registered) {
                logger.warn('Pairing timeout reached');
                await sock.ws.close();
                await removeFile(`./temp/${sessionId}`);
                if (!res.headersSent) {
                    res.status(408).json({ error: "Pairing timeout" });
                }
            }
        }, 120000);

    } catch (err) {
        logger.error('Critical error:', err);
        await removeFile(`./temp/${sessionId}`);
        if (!res.headersSent) {
            res.status(500).json({ 
                error: "Internal server error",
                details: err.message 
            });
        }
    }
});

module.exports = router;
