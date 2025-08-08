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
                browser: Browsers.macOS(randomItem)
            });

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
                    const data = fs.readFileSync(credsPath);
                    const b64data = Buffer.from(data).toString('base64');

                    const sessionMessage = await sock.sendMessage(sock.user.id, { text: b64data });

                    let ELITE_XD_TEXT = `
*_Session Connected By MASTERTECH_*
*_Made With 🤍_*
______________________________________
╔════◇
║ *『AMAZING YOU'VE CHOSEN MASTERTECH-XD』*
║ _You Have Completed the First Step to Deploy a Whatsapp Bot._
╚════════════════════════╝
╔═════◇
║  『••• 𝗩𝗶𝘀𝗶𝘁 𝗙𝗼𝗿 𝗛𝗲𝗹𝗽 •••』
║❒ *Ytube:* _youtube.com/@mastertech
║❒ *Owner:* _https://wa.me/254743727510_
║❒ *Repo:* _https://github.com/Mastertech-XD/Mastertech_
║❒ *WaGroup:* _https://whatsapp.com/channel/0029VazeyYx35fLxhB5TfC3D_
║❒ *Plugins:* _https://github.com/Mastertech-XD/Mastertech_ 
╚════════════════════════╝
_____________________________________
	
_Don't Forget To Give Star To My Repo_`;

                    await sock.sendMessage(sock.user.id, { text: ELITE_XD_TEXT }, { quoted: sessionMessage });

                    await delay(100);
                    await sock.ws.close();
                    await removeFile('./temp/' + id);
                    process.exit();
                } else if (connection === "close" && lastDisconnect && lastDisconnect.error && lastDisconnect.error.output.statusCode !== 401) {
                    await delay(10000);
                    MASTERTECH_XD_PAIR_CODE();
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

module.exports = router;
