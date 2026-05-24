const mineflayer = require('mineflayer');
const http = require('http');

// 1. DUMMY WEB SERVER FOR RAILWAY HEALTH CHECKS
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Minecraft No-Proxy AFK Cluster is Online!\n');
}).listen(PORT, () => console.log(`[System] Dummy server running on port ${PORT}`));

// 2. HARDCODED TARGET ACCOUNT
const BOSS_NAME = 'Zzynox_'; 

// 3. ENVIRONMENT CONFIGURATION
const SERVER_HOST = process.env.SERVER_HOST;
const SERVER_PORT = parseInt(process.env.SERVER_PORT || '25565', 10);

const accounts = [];
if (process.env.BOT_1_USER && process.env.BOT_1_PASS) {
  accounts.push({ username: process.env.BOT_1_USER, password: process.env.BOT_1_PASS });
}
if (process.env.BOT_2_USER && process.env.BOT_2_PASS) {
  accounts.push({ username: process.env.BOT_2_USER, password: process.env.BOT_2_PASS });
}
if (process.env.BOT_3_USER && process.env.BOT_3_PASS) {
  accounts.push({ username: process.env.BOT_3_USER, password: process.env.BOT_3_PASS });
}
if (process.env.BOT_4_USER && process.env.BOT_4_PASS) {
  accounts.push({ username: process.env.BOT_4_USER, password: process.env.BOT_4_PASS });
}

// 4. BOT ENGINE
function spawnAFKBot(account) {
  console.log(`[System] Launching standard client for: ${account.username}...`);

  const bot = mineflayer.createBot({
    host: SERVER_HOST,
    port: SERVER_PORT,
    username: account.username,
    auth: 'offline',
    version: '1.20.4', 
    viewDistance: 'tiny',
    checkTimeoutInterval: 90000,
    closeTimeout: 90000,
    physicsEnabled: true
  });

  bot.isTeleporting = false; 
  let autoAcceptInterval = null;

  bot.once('spawn', () => {
    console.log(`[${account.username}] Connected to host lobby.`);
    
    setTimeout(() => {
      bot.chat(`/login ${account.password}`);
      console.log(`[${account.username}] Login executed.`);
      
      setTimeout(() => {
        console.log(`[${account.username}] Moving to world via /maghrebsmp`);
        bot.chat('/maghrebsmp');

        // Allow server time to swap worlds safely
        setTimeout(() => {
          console.log(`[${account.username}] Teleport handler active.`);
          
          if (autoAcceptInterval) clearInterval(autoAcceptInterval);
          autoAcceptInterval = setInterval(() => {
            if (!bot.isTeleporting) {
              bot.chat('/tpaccept');
            }
          }, 6000);
          
        }, 5000);

      }, 4000);

    }, 3000);
  });

  // Anti-AFK Swing (30-second loop)
  const afkInterval = setInterval(() => {
    if (bot.entity && !bot.isTeleporting) bot.swingArm('right');
  }, 30000);

  // Message parsing stream
  bot.on('message', (jsonMsg) => {
    const cleanLine = jsonMsg.toString().toLowerCase().trim();
    const targetLower = BOSS_NAME.toLowerCase();

    if (cleanLine.includes(targetLower)) {
      if (cleanLine.includes('!tpa') && !bot.isTeleporting) bot.chat(`/tpa ${BOSS_NAME}`);
      if (cleanLine.includes('!accept')) bot.chat('/tpaccept');
    }

    if ((cleanLine.includes('accepted') || cleanLine.includes('teleporting') || cleanLine.includes('countdown')) && !bot.isTeleporting) {
      console.log(`[${account.username}] Teleport detected. Freezing...`);
      bot.isTeleporting = true; 

      setTimeout(() => {
        bot.isTeleporting = false;
        console.log(`[${account.username}] Unfrozen.`);
      }, 9000);
    }
  });

  // Reconnect Sequence with randomized anti-spam delays
  bot.on('end', (reason) => {
    if (autoAcceptInterval) clearInterval(autoAcceptInterval);
    clearInterval(afkInterval);

    const randomCooldown = Math.floor(Math.random() * (60000 - 30000 + 1)) + 30000;
    console.log(`[${account.username}] Disconnected (${reason}). Retrying in ${Math.round(randomCooldown / 1000)}s...`);
    setTimeout(() => spawnAFKBot(account), randomCooldown);
  });

  bot.on('error', (err) => {
    if (err.code !== 'ECONNRESET') {
      console.error(`[${account.username}] Error:`, err.message);
    }
  });
}

// 5. STAGGERED INITIAL LAUNCH ROUTINE
if (accounts.length === 0) {
  console.error("[System Error] Missing configuration variables.");
  process.exit(1);
} else {
  console.log(`[System] Deploying ${accounts.length} unproxied nodes...`);
  
  accounts.forEach((account, index) => {
    // Spaces initial boot sequences by completely unpredictable intervals
    const initialDelay = index * 35000 + Math.floor(Math.random() * 15000);
    setTimeout(() => {
      spawnAFKBot(account);
    }, initialDelay);
  });
}
