const { makeid } = require('./id');
const express = require('express');
const fs = require('fs');
let router = express.Router();
const pino = require("pino");
const { default: makeWASocket, useMultiFileAuthState, delay, Browsers, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');
const { upload } = require('./mega');

function removeFile(FilePath) {
    if (!fs.existsSync(FilePath)) return false;
    fs.rmSync(FilePath, { recursive: true, force: true });
}

router.get('/', async (req, res) => {
    const id = makeid();
    let num = req.query.number;

    async function MALVIN_XD_PAIR_CODE() {
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
                if (!res.headersSent) await res.send({ code });
            }

            sock.ev.on('creds.update', saveCreds);
            sock.ev.on("connection.update", async (s) => {
                const { connection, lastDisconnect } = s;

                if (connection === "open") {
                    await delay(7000);

                    const userId = sock.user?.id;
                    if (!userId) return console.error("❌ User ID not available");

                    const sessionPath = __dirname + `/temp/${id}/creds.json`;
                    if (!fs.existsSync(sessionPath)) return console.error("❌ Session file not found:", sessionPath);

                    try {
                        // Upload session to Mega.nz
                        const mega_url = await upload(fs.createReadStream(sessionPath), `${userId}.json`);
                        const sessionString = mega_url.replace('https://mega.nz/file/', '');

                        // Send session string
                        const codeMsg = await sock.sendMessage(userId, { text: `malvin~${sessionString}` });

                        // Also send as file for reliability
                        await sock.sendMessage(userId, {
                            document: fs.readFileSync(sessionPath),
                            fileName: 'session.json',
                            mimetype: 'application/json',
                            caption: '✅ Your WhatsApp session file is attached.'
                        });

                        // Welcome/info message
                        const infoText = `*Hey there, MALVIN-XD User!* 👋🏻\n\nThanks for using *MALVIN-XD* — your session has been successfully created!\n\n🔐 *Session ID:* Sent above\n⚠️ *Keep it safe!* Do NOT share this ID with anyone.\n\n*✅ Stay Updated:*\nJoin our official WhatsApp Channel:\nhttps://whatsapp.com/channel/0029VbA6MSYJUM2TVOzCSb2A\n\n*💻 Source Code:*\nFork & explore the project on GitHub:\nhttps://github.com/XdKing2/MALVIN-XD\n\n> *© Powered by Malvin King*\nStay cool and hack smart. ✌🏻`;

                        await sock.sendMessage(userId, {
                            text: infoText,
                            contextInfo: {
                                externalAdReply: {
                                    title: "ᴍᴀʟᴠɪɴ-xᴅ",
                                    thumbnailUrl: "https://files.catbox.moe/bqs70b.jpg",
                                    sourceUrl: "https://whatsapp.com/channel/0029VbA6MSYJUM2TVOzCSb2A",
                                    mediaType: 1,
                                    renderLargerThumbnail: true
                                }
                            }
                        }, { quoted: codeMsg });

                    } catch (err) {
                        console.error("❌ Failed to send session or info message:", err);
                    }

                    await delay(500);
                    await sock.ws.close();
                    await removeFile('./temp/' + id);
                    console.log(`👤 ${userId} Connected ✅ Restarting process...`);
                    await delay(10);
                    process.exit();
                } else if (connection === "close" && lastDisconnect && lastDisconnect.error && lastDisconnect.error.output.statusCode !== 401) {
                    await delay(10);
                    MALVIN_XD_PAIR_CODE();
                }
            });

        } catch (err) {
            console.log("service restarted");
            await removeFile('./temp/' + id);
            if (!res.headersSent) await res.send({ code: "❗ Service Unavailable" });
        }
    }

    return await MALVIN_XD_PAIR_CODE();
});

module.exports = router;
