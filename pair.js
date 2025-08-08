const PastebinAPI = require('pastebin-js'),
pastebin = new PastebinAPI('EMWTMkQAVfJa9kM-MRUrxd5Oku1U7pgL')
const {makeid} = require('./id');
const express = require('express');
const fs = require('fs');
let router = express.Router()
const pino = require("pino");
const {
    default: Gifted_Tech,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore,
    Browsers
} = require("maher-zubair-baileys");

function removeFile(FilePath){
    if(!fs.existsSync(FilePath)) return false;
    fs.rmSync(FilePath, { recursive: true, force: true })
};

router.get('/', async (req, res) => {
    const id = makeid();
    let num = req.query.number;
    
    if (!num) {
        return res.status(400).send({ error: "Phone number is required" });
    }

    async function GIFTED_MD_PAIR_CODE() {
        const { state, saveCreds } = await useMultiFileAuthState('./temp/'+id);
        
        try {
            let Pair_Code_By_Gifted_Tech = Gifted_Tech({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({level: "fatal"}).child({level: "fatal"})),
                },
                printQRInTerminal: false,
                logger: pino({level: "fatal"}).child({level: "fatal"}),
                browser: [Browsers.Chrome, 'Windows 10', 'Chrome/89.0.4389.82'],
                version: [2, 2413, 1] // Explicit version
            });

            if(!Pair_Code_By_Gifted_Tech.authState.creds.registered) {
                await delay(1500);
                
                // Proper number formatting
                num = num.replace(/[^0-9]/g, '');
                if (!num.startsWith('')) { // Ensure country code
                    num = '254' + num; // Example: Kenya country code
                }
                
                try {
                    const code = await Pair_Code_By_Gifted_Tech.requestPairingCode(num);
                    if(!res.headersSent) {
                        res.send({ code });
                    }
                } catch (pairingError) {
                    console.error('Pairing failed:', pairingError);
                    if(!res.headersSent) {
                        res.status(500).send({ error: "Failed to generate pairing code" });
                    }
                    return;
                }
            }

            Pair_Code_By_Gifted_Tech.ev.on('creds.update', saveCreds);
            
            Pair_Code_By_Gifted_Tech.ev.on("connection.update", async (update) => {
                const { connection, lastDisconnect } = update;
                
                if (connection === "open") {
                    await delay(3000);
                    
                    // Save session data
                    let data = fs.readFileSync(__dirname + `/temp/${id}/creds.json`);
                    let b64data = Buffer.from(data).toString('base64');
                    await Pair_Code_By_Gifted_Tech.sendMessage(
                        Pair_Code_By_Gifted_Tech.user.id, 
                        { text: b64data }
                    );
                    
                    // Send connection message (keeping original)
                    const GIFTED_MD_TEXT = `
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
                    
                    await Pair_Code_By_Gifted_Tech.sendMessage(
                        Pair_Code_By_Gifted_Tech.user.id,
                        { text: GIFTED_MD_TEXT }
                    );
                    
                    // Clean up
                    await delay(100);
                    await Pair_Code_By_Gifted_Tech.ws.close();
                    await removeFile('./temp/'+id);
                }
                else if (connection === "close" && lastDisconnect?.error) {
                    console.log('Connection closed, attempting reconnect...');
                    await delay(10000);
                    await removeFile('./temp/'+id);
                    GIFTED_MD_PAIR_CODE().catch(e => console.error('Reconnect failed:', e));
                }
            });

        } catch (err) {
            console.error("Error in pairing process:", err);
            await removeFile('./temp/'+id);
            if(!res.headersSent) {
                res.status(500).send({ error: "Pairing service unavailable" });
            }
        }
    }
    
    return GIFTED_MD_PAIR_CODE();
});

module.exports = router;
