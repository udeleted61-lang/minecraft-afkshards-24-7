const mineflayer = require('mineflayer');
const http = require('http');

// 1. DUMMY WEB SERVER FOR RAILWAY HEALTH CHECKS
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Minecraft Anti-Detection Cluster is Running!\n');
}).listen(PORT, () => console.log(`[System] Dummy server online on port ${PORT}`));

// 2. TARGET CONFIGURATION
const BOSS_NAME = 'Zzynox_'; 

const SERVER_HOST = process.env.SERVER_HOST;
const SERVER_PORT = parseInt(process.env.SERVER_PORT || '25565', 10);

const accounts = [];
if (process.env.BOT_1_USER && process.env.BOT_1_PASS) accounts.push({ username: process.env.BOT_1_USER, password: process.env.BOT_1_PASS });
if (process.env.BOT_2_USER && process.env.BOT_2_PASS) accounts.push({ username: process.env.BOT_2_USER, password: process.env.BOT_2_PASS });
if (process.env.BOT_3_USER && process.env.BOT_3_PASS) accounts.push({ username: process.env.BOT_3_USER, password: process.env.BOT_3_PASS });
if (process.env.BOT_4_USER && process.env.BOT_4_PASS) accounts.push({ username: process.env.BOT_4_USER, password: process.env.BOT_4_PASS });

// 3. FORTIFIED BOT FABRICATOR
function spawnAFKBot(account) {
  console.log(`[System] Dispatching client emulation for: ${account.username}...`);

  const bot = mineflayer.createBot({
    host: SERVER_HOST,
    port: SERVER_PORT,
    username: account.username,
    auth: 'offline',
    // HARDCODING MODERN STABLE REVISION (Forces server network compliance)
    version: '1.20.4', 
    viewDistance: 'tiny', // Mimics a low-end client to save bandwidth
    checkTimeoutInterval: 90000, // Extends timeout windows for high-latency proxies
    closeTimeout: 90000
  });

  bot.isTeleporting = false; 
  let autoAcceptInterval = null;

  bot.once('spawn', () => {
    console.log(`[${account.username}] Emulation successful. Logged into hardware layer.`);
    
    setTimeout(() => {
      bot.chat(`/login ${account.password}`);
      console.log(`[${account.username}] Auth profile delivered.`);
      
      setTimeout(() => {
        console.log(`[${account.username}] Relocating to target cluster world via /maghrebsmp`);
        bot.chat('/maghrebsmp');

        setTimeout(() => {
          console.log(`[${account.username}] Standby. Teleport acceptance daemon online.`);
          
          if (autoAcceptInterval) clearInterval(autoAcceptInterval);
          autoAcceptInterval = setInterval(() => {
            if (!bot.isTeleporting) {
              bot.chat('/tpaccept');
            }
          }, 5000);
          
        }, 5000);
      }, 4000);
    }, 3000);
  });

  // Regular anti-AFK interaction loops
  const afkInterval = setInterval(() => {
    if (bot.entity && !bot.isTeleporting) {
      bot.swingArm('right');
    }
  }, 30000);

  // Chat/Message monitor stream
  bot.on('message', (jsonMsg) => {
    const cleanLine = jsonMsg.toString().toLowerCase().trim();
    const targetLower = BOSS_NAME.toLowerCase();

    if (cleanLine.includes(targetLower)) {
      if (cleanLine.includes('!tpa') && !bot.isTeleporting) bot.chat(`/tpa ${BOSS_NAME}`);
      if (cleanLine.includes('!accept')) bot.chat('/tpaccept');
    }

    if ((cleanLine.includes('accepted') || cleanLine.includes('teleporting') || cleanLine.includes('countdown')) && !bot.isTeleporting) {
      bot.isTeleporting = true; 
      setTimeout(() => {
        bot.isTeleporting = false;
        console.log(`[${account.username}] Arrival confirmed.`);
      }, 8000);
    }
  });

  // Reconnect management loop
  bot.on('end', (reason) => {
    console.log(`[${account.username}] Node socket terminated (${reason}). Initiating cool-down sequence...`);
    if (autoAcceptInterval) clearInterval(autoAcceptInterval);
    clearInterval(afkInterval);
    // Extended 30s cool-down loop to prevent IP blacklist propagation
    setTimeout(() => spawnAFKBot(account), 30000);
  });

  bot.on('error', (err) => {
    if (err.code !== 'ECONNRESET') {
      console.error(`[${account.username}] Application error:`, err.message);
    }
  });
}

// 4. HIGH-DELAY STAGGERED DEPLOYMENT SEQUENCE
if (accounts.length === 0) {
  console.error("[System Error] Configuration map empty.");
  process.exit(1);
} else {
  console.log(`[System] Initializing stealth cluster sequence for ${accounts.length} bots...`);
  
  accounts.forEach((account, index) => {
    setTimeout(() => {
      spawnAFKBot(account);
    }, index * 30000); // Spaces connections out by 30 full seconds each!
  });
}
