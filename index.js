const mineflayer = require('mineflayer');
const http = require('http');

// 1. DUMMY WEB SERVER
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Minecraft Radar AFK Bots are Online!\n');
}).listen(PORT, () => {
  console.log(`[System] Dummy server listening on port ${PORT}`);
});

// 2. ENVIRONMENT CONFIGURATION
const SERVER_HOST = process.env.SERVER_HOST;
const SERVER_PORT = parseInt(process.env.SERVER_PORT || '25565', 10);
const CONTROLLER_NAME = process.env.CONTROLLER_NAME;

const accounts = [];
if (process.env.BOT_1_USER && process.env.BOT_1_PASS) {
  accounts.push({ username: process.env.BOT_1_USER, password: process.env.BOT_1_PASS });
}
if (process.env.BOT_2_USER && process.env.BOT_2_PASS) {
  accounts.push({ username: process.env.BOT_2_USER, password: process.env.BOT_2_PASS });
}

// 3. BOT CORE ENGINE
function spawnAFKBot(account) {
  console.log(`[System] Starting bot: ${account.username}...`);

  const bot = mineflayer.createBot({
    host: SERVER_HOST,
    port: SERVER_PORT,
    username: account.username,
    auth: 'offline'
  });

  let tpaLoop = null; 
  let radarLoop = null;
  bot.isTeleporting = false; 

  function killLoops() {
    if (tpaLoop) clearInterval(tpaLoop);
    if (radarLoop) clearInterval(radarLoop);
    tpaLoop = null;
    radarLoop = null;
  }

  bot.once('spawn', () => {
    console.log(`[${account.username}] Online. Logging in...`);
    
    setTimeout(() => {
      bot.chat(`/login ${account.password}`);
      
      // THE RADAR SYSTEM: Wait for you to log in before doing anything
      console.log(`[${account.username}] Activating Radar. Waiting for ${CONTROLLER_NAME} to come online...`);
      
      radarLoop = setInterval(() => {
        // Checks the server's Tab list for your username
        if (bot.players[CONTROLLER_NAME]) {
          console.log(`[${account.username}] RADAR DETECTED MAIN PLAYER! Starting TPA sequence...`);
          
          clearInterval(radarLoop); // Turn off radar once found
          
          // Start spamming TPA every 10 seconds
          bot.chat(`/tpa ${CONTROLLER_NAME}`);
          tpaLoop = setInterval(() => {
            if (!bot.isTeleporting) bot.chat(`/tpa ${CONTROLLER_NAME}`);
          }, 10000);
        }
      }, 5000); // Scans every 5 seconds

    }, 1500);
  });

  // Anti-AFK Loop
  const afkInterval = setInterval(() => {
    if (bot.entity && !bot.isTeleporting) {
      bot.swingArm('right');
    }
  }, 30000);

  // CHAT MONITOR (Handles TPA requests and countdown freezing)
  bot.on('message', (jsonMsg) => {
    const serverMessage = jsonMsg.toString().toLowerCase();
    const lowerController = CONTROLLER_NAME.toLowerCase();

    // --- 1. DETECT INCOMING TPA OR TPAHERE FROM YOU ---
    if (serverMessage.includes(lowerController) && (serverMessage.includes('request') || serverMessage.includes('teleport') || serverMessage.includes('here'))) {
      console.log(`[${account.username}] Incoming teleport request from boss. Accepting...`);
      bot.chat('/tpaccept');
    }

    // --- 2. DETECT TELEPORT COUNTDOWN/SUCCESS ---
    if ((serverMessage.includes('accepted') || serverMessage.includes('teleporting')) && !bot.isTeleporting) {
      console.log(`[${account.username}] Teleport confirmed! Freezing for countdown...`);
      
      bot.isTeleporting = true; 
      if (tpaLoop) clearInterval(tpaLoop); // Stop outgoing spam!

      // Freeze for 8 seconds
      setTimeout(() => {
        bot.isTeleporting = false;
        console.log(`[${account.username}] Teleport complete. Bot is active.`);
      }, 8000);
    }
  });

  // Auto-Reconnect
  bot.on('end', (reason) => {
    console.log(`[${account.username}] Disconnected: (${reason}). Cleaning up...`);
    killLoops();
    clearInterval(afkInterval);
    setTimeout(() => spawnAFKBot(account), 15000);
  });

  bot.on('error', (err) => console.error(`[${account.username}] Error:`, err.message));
}

if (accounts.length === 0) {
  console.error("[System Error] No bot credentials found in Railway variables.");
  process.exit(1);
} else {
  console.log(`[System] Launching ${accounts.length} bots with Radar capabilities...`);
  accounts.forEach(spawnAFKBot);
}
