import express from 'express';
import fs from 'fs';
import pino from 'pino';
import { 
    makeWASocket, 
    useMultiFileAuthState, 
    delay, 
    makeCacheableSignalKeyStore, 
    Browsers,
    DisconnectReason
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';

const router = express.Router();

// Session management
const sessionMap = new Map(); // Track active sessions

// Improved file handling
async function removeSessionFiles(dir) {
    try {
        if (!fs.existsSync(dir)) return;
        await fs.promises.rm(dir, { recursive: true, force: true });
    } catch (e) {
        console.error('Error removing session files:', e);
    }
}

// Connection handler with proper cleanup
async function createConnection(num, res) {
    const sessionDir = `./sessions/${num}`;
    let sock;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;

    try {
        // Clean previous session if exists
        await removeSessionFiles(sessionDir);

        // Initialize new session
        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
        
        sock = makeWASocket({
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })),
            },
            printQRInTerminal: false,
            logger: pino({ level: 'silent' }),
            browser: Browsers.ubuntu('Chrome'),
            markOnlineOnConnect: false, // Better for server deployment
            syncFullHistory: false,
            shouldIgnoreJid: jid => jid.endsWith('@g.us'), // Ignore group messages if needed
            getMessage: async () => null, // Minimal message storage
        });

        // Store the active connection
        sessionMap.set(num, sock);

        // Handle credentials update
        sock.ev.on('creds.update', saveCreds);

        // Connection state handler
        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                // Handle QR code generation if needed
                console.log('QR generated for', num);
            }

            if (connection === 'open') {
                reconnectAttempts = 0; // Reset on successful connection
                console.log(`Connected successfully: ${num}`);
                
                // Send session files and welcome messages
                await sendInitialMessages(sock, num, sessionDir);
            }

            if (connection === 'close') {
                const shouldReconnect = handleDisconnection(lastDisconnect);
                if (shouldReconnect && reconnectAttempts < maxReconnectAttempts) {
                    reconnectAttempts++;
                    console.log(`Reconnecting attempt ${reconnectAttempts}/${maxReconnectAttempts}...`);
                    await delay(5000);
                    await createConnection(num, res);
                } else {
                    console.log(`Max reconnection attempts reached for ${num}`);
                    cleanupConnection(num);
                }
            }
        });

        // Handle pairing if needed
        if (!state.creds.registered) {
            await handlePairing(sock, num, res);
        }

        return sock;

    } catch (error) {
        console.error('Connection error:', error);
        cleanupConnection(num);
        throw error;
    }
}

// Improved disconnection handler
function handleDisconnection(lastDisconnect) {
    if (!lastDisconnect?.error) return true;

    const statusCode = (lastDisconnect.error instanceof Boom) 
        ? lastDisconnect.error.output?.statusCode 
        : lastDisconnect.error.code;

    console.log('Disconnection reason:', statusCode || lastDisconnect.error);

    // Don't reconnect on these status codes
    const unrecoverableCodes = [
        DisconnectReason.loggedOut,
        DisconnectReason.badSession,
        DisconnectReason.restartRequired,
        DisconnectReason.multideviceMismatch
    ];

    return !unrecoverableCodes.includes(statusCode);
}

// Cleanup connection properly
function cleanupConnection(num) {
    const sock = sessionMap.get(num);
    if (sock) {
        try {
            sock.end();
            sock.ws.close();
        } catch (e) {
            console.error('Error cleaning up connection:', e);
        }
        sessionMap.delete(num);
    }
}

// Handle pairing process
async function handlePairing(sock, num, res) {
    try {
        const cleanNum = num.replace(/[^\d]/g, '');
        const code = await sock.requestPairingCode(cleanNum);
        
        if (!res.headersSent) {
            res.json({ 
                status: 'pairing',
                number: cleanNum,
                code: code.match(/.{1,4}/g)?.join('-') || code,
                instructions: 'Enter this code in WhatsApp: Settings → Linked Devices → Link a Device'
            });
        }
    } catch (error) {
        console.error('Pairing failed:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Pairing failed', details: error.message });
        }
        throw error;
    }
}

// Send initial messages and files
async function sendInitialMessages(sock, num, sessionDir) {
    try {
        const userJid = `${num}@s.whatsapp.net`;
        
        // Send session files
        const creds = await fs.promises.readFile(`${sessionDir}/creds.json`);
        await sock.sendMessage(userJid, {
            document: creds,
            mimetype: 'application/json',
            fileName: 'creds.json'
        });

        // Send welcome messages
        await sock.sendMessage(userJid, {
            text: '🚀 *Bot Connected Successfully!*\n\n' +
                  '▸ *Session files* have been sent\n' +
                  '▸ Keep them secure!\n\n' +
                  'Join our channel for updates:\n' +
                  'https://whatsapp.com/channel/0029VazeyYx35fLxhB5TfC3D'
        });

    } catch (error) {
        console.error('Error sending initial messages:', error);
    }
}

// API endpoint
router.get('/', async (req, res) => {
    try {
        const { number } = req.query;
        
        if (!number) {
            return res.status(400).json({ error: 'Number parameter is required' });
        }

        // Validate number format
        const cleanNum = number.replace(/[^\d]/g, '');
        if (cleanNum.length < 10) {
            return res.status(400).json({ error: 'Invalid number format' });
        }

        // Check for existing connection
        if (sessionMap.has(cleanNum)) {
            return res.json({ 
                status: 'already_connected',
                number: cleanNum,
                message: 'Session already exists for this number'
            });
        }

        // Create new connection
        await createConnection(cleanNum, res);

    } catch (error) {
        console.error('Endpoint error:', error);
        if (!res.headersSent) {
            res.status(500).json({ 
                error: 'Connection failed',
                details: error.message 
            });
        }
    }
});

// Error handling middleware
router.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

export default router;
