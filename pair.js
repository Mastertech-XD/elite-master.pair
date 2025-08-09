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
