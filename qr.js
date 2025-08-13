router.get('/', async (req, res) => {
    let num = req.query.number;
    let dirs = './' + (num || `session`);

    // Remove existing session folder to start fresh (optional)
    await removeFile(dirs);

    async function initiateSession() {
        const { state, saveCreds } = await useMultiFileAuthState(dirs);

        try {
            let KnightBot = makeWASocket({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
                },
                printQRInTerminal: false,  // keep false since we send QR via HTTP
                logger: pino({ level: "fatal" }).child({ level: "fatal" }),
                browser: Browsers.windows('Firefox'),
            });

            // Listen for QR updates and send the QR string back in the response
            KnightBot.ev.on('connection.update', async (update) => {
                const { qr, connection, lastDisconnect } = update;

                if (qr) {
                    if (!res.headersSent) {
                        // Send QR to client so they can render it
                        await res.send({ qr });
                    }
                }

                if (connection === 'open') {
                    // Connected! Send session and welcome messages as before

                    const sessionKnight = fs.readFileSync(dirs + '/creds.json');
                    const userJid = jidNormalizedUser(num + '@s.whatsapp.net');

                    await KnightBot.sendMessage(userJid, {
                        document: sessionKnight,
                        mimetype: 'application/json',
                        fileName: 'creds.json',
                    });

                    await KnightBot.sendMessage(userJid, {
                        text: `Join our Whatsapp channel \n\n https://whatsapp.com/channel/0029Va90zAnIHphOuO8Msp3A\n`,
                    });

                    await KnightBot.sendMessage(userJid, {
                        text: `⚠️Do not share this file with anybody⚠️\n 
┌┤✑  Thanks for using MASTERTECH-XD
│└────────────┈ ⳹        
│©2025 MASTERTECH ELITE 
└─────────────────┈ ⳹\n\n`,
                    });

                    // Do NOT remove session or exit process here to keep connection alive
                }

                if (connection === 'close') {
                    if (lastDisconnect && lastDisconnect.error) {
                        const statusCode = lastDisconnect.error.output?.statusCode;
                        if (statusCode !== 401) {
                            initiateSession();
                        } else {
                            console.log('Auth failure, please re-authenticate manually.');
                        }
                    } else {
                        initiateSession();
                    }
                }
            });

            KnightBot.ev.on('creds.update', saveCreds);
        } catch (err) {
            console.error('Error initializing session:', err);
            if (!res.headersSent) {
                res.status(503).send({ code: 'Service Unavailable' });
            }
        }
    }

    await initiateSession();
});
