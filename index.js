const mineflayer = require('mineflayer');
const http = require('http');

// 1. DUMMY WEB SERVER FOR RAILWAY HEALTH CHECKS
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Minecraft Staggered 4-Bot Cluster is Online!\n');
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
  console.log(`[System] Initializing safe connection routine for: ${account.username}...`);

  const bot = mineflayer.createBot({
    host: SERVER_HOST,
    port: SERVER_PORT,
    username: account.username,
    auth: 'offline',
    // Set explicit keepAlive to prevent ECONNRESET issues
    checkTimeoutInterval: 60000,
    version: false // Auto-negotiate protocol version, set to a specific version like '1.20.2' if needed
  });

  bot.isTeleporting = false; 
  let autoAcceptInterval = null;

  bot.once('spawn', () => {
    console.log(`[${account.username}] Connection accepted. Logging in...`);
    
    setTimeout(() => {
      bot.chat(`/login ${account.password}`);
      console.log(`[${account.username}] Login executed.`);
      
      // Delay before running lobby transit to let world load
      setTimeout(() => {
        console.log(`[${account.username}] Transferring via /maghrebsmp`);
        bot.chat('/maghrebsmp');

        // Allow server time to swap worlds safely
        setTimeout(() => {
          console.log(`[${account.username}] World swap clear. Teleport handler online.`);
          
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

  // Anti-AFK Swing (30-second loop)
  const afkInterval = setInterval(() => {
    if (bot.entity && !bot.isTeleporting) bot.swingArm('right');
  }, 30000);

  // RAW CHAT LOG STRIPPER
  bot.on('message', (jsonMsg) => {
    const rawLine = jsonMsg.toString();
    const cleanLine = rawLine.toLowerCase().trim();
    const targetLower = BOSS_NAME.toLowerCase();

    if (cleanLine.includes(targetLower)) {
      if (cleanLine.includes('!tpa') && !bot.isTeleporting) {
        bot.chat(`/tpa ${BOSS_NAME}`);
      }
      if (cleanLine.includes('!accept')) {
        bot.chat('/tpaccept');
      }
    }

    if ((cleanLine.includes('accepted') || cleanLine.includes('teleporting') || cleanLine.includes('countdown')) && !bot.isTeleporting) {
      console.log(`[${account.username}] Teleport starting. Freezing actions...`);
      bot.isTeleporting = true; 

      setTimeout(() => {
        bot.isTeleporting = false;
        console.log(`[${account.username}] Freezing ended. Active in zone.`);
      }, 8000);
    }
  });

  // Auto-Reconnect Sequence with anti-spam backoff
  bot.on('end', (reason) => {
    console.log(`[${account.username}] Disconnected: (${reason}). Cooling down for 20s...`);
    if (autoAcceptInterval) clearInterval(autoAcceptInterval);
    clearInterval(afkInterval);
    setTimeout(() => spawnAFKBot(account), 20000);
  });

  bot.on('error', (err) => {
    if (err.code === 'ECONNRESET') {
      console.log(`[${account.username}] Server forcefully reset connection (ECONNRESET). Retrying securely...`);
    } else {
      console.error(`[${account.username}] Error:`, err.message);
    }
  });
}

// 5. STAGGERED INITIAL LAUNCH ROUTINE
if (accounts.length === 0) {
  console.error("[System Error] Missing configuration variables.");
  process.exit(1);
} else {
  console.log(`[System] Initializing staggered deployment for ${accounts.length} nodes...`);
  
  // Loops through accounts and spaces them out by 10 seconds each to avoid anti-bot triggers
  accounts.forEach((account, index) => {
    setTimeout(() => {
      spawnAFKBot(account);
    }, index * 10000); // 0s, 10s, 20s, 30s delay intervals
  });
}
