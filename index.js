const mineflayer = require('mineflayer');
const http = require('http');

// 1. DUMMY WEB SERVER FOR RAILWAY HEALTH CHECKS
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Minecraft Stealth Matrix is Online!\n');
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

// 3. STEALTH BOT FABRICATOR
function spawnAFKBot(account) {
  console.log(`[System] Dispatching stealth client for: ${account.username}...`);

  const bot = mineflayer.createBot({
    host: SERVER_HOST,
    port: SERVER_PORT,
    username: account.username,
    auth: 'offline',
    version: '1.20.4', // Forces server network compliance
    viewDistance: 'tiny',
    checkTimeoutInterval: 120000, // Maximized timeout window for strict proxies
    closeTimeout: 120000,
    physicsEnabled: true // Emulates realistic user gravity/movement updates
  });

  bot.isTeleporting = false; 
  let autoAcceptInterval = null;

  bot.once('spawn', () => {
    console.log(`[${account.username}] Connection successful. Bypassed handshake security.`);
    
    setTimeout(() => {
      bot.chat(`/login ${account.password}`);
      console.log(`[${account.username}] Auth profile delivered.`);
      
      setTimeout(() => {
        console.log(`[${account.username}] Moving to world via /maghrebsmp`);
        bot.chat('/maghrebsmp');

        setTimeout(() => {
          console.log(`[${account.username}] Active. Teleport auto-accept loop running.`);
          
          if (autoAcceptInterval) clearInterval(autoAcceptInterval);
          autoAcceptInterval = setInterval(() => {
            if (!bot.isTeleporting) {
              bot.chat('/tpaccept');
            }
          }, 6000); // Shifted slightly to blend into chat ticks
          
        }, 5000);
      }, 5000);
    }, 4000);
  });

  // Anti-AFK Swing (30-second loop)
  const afkInterval = setInterval(() => {
    if (bot.entity && !bot.isTeleporting) {
      bot.swingArm('right');
    }
  }, 30000);

  // Message monitoring stream
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
        console.log(`[${account.username}] Safe teleport complete.`);
      }, 9000);
    }
  });

  // Intelligent Reconnect Loop (Uses Randomized Anti-Detection Backoff)
  bot.on('end', (reason) => {
    if (autoAcceptInterval) clearInterval(autoAcceptInterval);
    clearInterval(afkInterval);

    // Pick a completely random delay between 45 and 90 seconds so the firewall can't spot a timer pattern
    const randomCooldown = Math.floor(Math.random() * (90000 - 45000 + 1)) + 45000;
    console.log(`[${account.username}] Node socket dropped (${reason}). Anti-detection cooldown triggered: Retrying in ${Math.round(randomCooldown / 1000)}s...`);
    
    setTimeout(() => spawnAFKBot(account), randomCooldown);
  });

  bot.on('error', (err) => {
    // Silently log and ignore connection resets to avoid filling the screen
    if (err.code !== 'ECONNRESET') {
      console.error(`[${account.username}] Error:`, err.message);
    }
  });
}

// 4. RANDOMIZED STAGGERED INITIAL LAUNCH
if (accounts.length === 0) {
  console.error("[System Error] No accounts found in configurations.");
  process.exit(1);
} else {
  console.log(`[System] Initializing stealth cluster engine for ${accounts.length} bots...`);
  
  accounts.forEach((account, index) => {
    // Spaces initial boot sequences by completely unpredictable intervals
    const initialDelay = index * 35000 + Math.floor(Math.random() * 15000);
    setTimeout(() => {
      spawnAFKBot(account);
    }, initialDelay);
  });
}
