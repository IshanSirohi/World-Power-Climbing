/* ============================================================
   World Power Climb – script.js
   Complete game engine: Canvas rendering, physics, platform
   generation, meme sounds, politician characters, difficulty
   zones, and more.
   ============================================================ */

// ─── Constants ──────────────────────────────────────────────
const CANVAS_W = 420;
const CANVAS_H = 700;
const GRAVITY = 0.45;
const JUMP_FORCE = -12.5;
const PLAYER_W = 60;
const PLAYER_H = 60;
const PLATFORM_H = 14;
const MAX_HORIZONTAL_SPEED = 5;
const HORIZONTAL_ACCEL = 0.6;
const HORIZONTAL_FRICTION = 0.85;

// Collectibles
const COIN_SIZE = 22;
const COIN_SPAWN_CHANCE = 0.4;      // 40% chance a platform gets a coin
const BOOSTER_SPAWN_CHANCE = 0.06;  // 6% chance a platform gets a jet booster
const BOOSTER_FORCE = -18;          // Strong upward thrust
const BOOSTER_DURATION = 90;        // Frames of boost (~1.5 seconds)
const BOOSTER_SIZE = 28;

// ─── Characters ─────────────────────────────────────────────
const CHARACTERS = {
  modi: { name: 'Modi', emoji: '🇮🇳', img: 'assets/images/char_modi2.png', currency: '₹', currencyName: 'Rupee', currencyColor: '#ff9933' },
  trump: { name: 'Trump', emoji: '🇺🇸', img: 'assets/images/char_trump1.png', currency: '$', currencyName: 'Dollar', currencyColor: '#85bb65' },
  putin: { name: 'Putin', emoji: '🇷🇺', img: 'assets/images/char_putin1.png', currency: '₽', currencyName: 'Ruble', currencyColor: '#c0392b' },
  zelensky: { name: 'Zelensky', emoji: '🇺🇦', img: 'assets/images/char_zelensky1.png', currency: '₴', currencyName: 'Hryvnia', currencyColor: '#3498db' },
  xi: { name: 'Xi', emoji: '🇨🇳', img: 'assets/images/char_xi1.png', currency: '¥', currencyName: 'Yuan', currencyColor: '#e74c3c' },
  kim: { name: 'Kim', emoji: '🇰🇵', img: 'assets/images/char_kim1.png', currency: '₩', currencyName: 'Won', currencyColor: '#8e44ad' }
};

// Preload character images
const charImages = {};
Object.keys(CHARACTERS).forEach(key => {
  const img = new Image();
  img.src = CHARACTERS[key].img;
  charImages[key] = img;
});

// ─── Audio Context & Meme Sounds ────────────────────────────
let audioCtx = null;
let soundEnabled = true;

// Preloaded FAAAH meme sound (mp3)
const faaahAudio = new Audio('assets/audio/faaah.mp3');
faaahAudio.preload = 'auto';
faaahAudio.volume = 0.7;

function playFaaah() {
  if (!soundEnabled) return;
  faaahAudio.currentTime = 0;
  faaahAudio.play().catch(() => { });
}

function initAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

/* Synth-based meme sound effects */
function playSound(type) {
  if (!soundEnabled || !audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    const t = audioCtx.currentTime;

    switch (type) {
      case 'jump':
        // Quick rising chirp
        osc.type = 'square';
        osc.frequency.setValueAtTime(250, t);
        osc.frequency.exponentialRampToValueAtTime(600, t + 0.1);
        gain.gain.setValueAtTime(0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        osc.start(t); osc.stop(t + 0.15);
        break;

      case 'score':
        // Coin-style ding
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, t);
        osc.frequency.setValueAtTime(1760, t + 0.08);
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        osc.start(t); osc.stop(t + 0.25);
        break;

      case 'gameover':
        // Descending wah-wah
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(400, t);
        osc.frequency.exponentialRampToValueAtTime(80, t + 0.8);
        gain.gain.setValueAtTime(0.18, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
        osc.start(t); osc.stop(t + 0.9);
        break;

      case 'break':
        // Crunch / crack
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(120, t);
        osc.frequency.exponentialRampToValueAtTime(40, t + 0.15);
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
        osc.start(t); osc.stop(t + 0.18);
        break;

      case 'vine_boom':
        // Deep bass hit – the classic "vine boom" 
        osc.type = 'sine';
        osc.frequency.setValueAtTime(60, t);
        osc.frequency.exponentialRampToValueAtTime(30, t + 0.4);
        gain.gain.setValueAtTime(0.35, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        osc.start(t); osc.stop(t + 0.5);
        break;

      case 'metal_pipe':
        // Metallic clang – the "metal pipe falling" meme
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(2400, t);
        osc.frequency.exponentialRampToValueAtTime(180, t + 0.35);
        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
        osc.start(t); osc.stop(t + 0.4);
        // Add distortion layer
        const osc2 = audioCtx.createOscillator();
        const g2 = audioCtx.createGain();
        osc2.connect(g2); g2.connect(audioCtx.destination);
        osc2.type = 'square';
        osc2.frequency.setValueAtTime(3200, t);
        osc2.frequency.exponentialRampToValueAtTime(100, t + 0.2);
        g2.gain.setValueAtTime(0.08, t);
        g2.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        osc2.start(t); osc2.stop(t + 0.25);
        break;

      case 'bonk':
        // The classic "bonk!" 
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, t);
        osc.frequency.exponentialRampToValueAtTime(200, t + 0.08);
        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        osc.start(t); osc.stop(t + 0.12);
        break;

      case 'oof':
        // Roblox "oof" approximation
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, t);
        osc.frequency.setValueAtTime(370, t + 0.05);
        osc.frequency.exponentialRampToValueAtTime(200, t + 0.2);
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        osc.start(t); osc.stop(t + 0.3);
        break;

      case 'emotional_damage':
        // Dramatic descending hit
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(600, t);
        osc.frequency.exponentialRampToValueAtTime(100, t + 0.3);
        gain.gain.setValueAtTime(0.22, t);
        gain.gain.setValueAtTime(0.22, t + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        osc.start(t); osc.stop(t + 0.5);
        // Add reverb-like echo
        const osc3 = audioCtx.createOscillator();
        const g3 = audioCtx.createGain();
        osc3.connect(g3); g3.connect(audioCtx.destination);
        osc3.type = 'sine';
        osc3.frequency.setValueAtTime(300, t + 0.15);
        osc3.frequency.exponentialRampToValueAtTime(60, t + 0.6);
        g3.gain.setValueAtTime(0.08, t + 0.15);
        g3.gain.exponentialRampToValueAtTime(0.001, t + 0.65);
        osc3.start(t + 0.15); osc3.stop(t + 0.65);
        break;

      case 'fart_reverb':
        // The legendary fart with reverb meme
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(90, t);
        osc.frequency.linearRampToValueAtTime(60, t + 0.15);
        osc.frequency.linearRampToValueAtTime(100, t + 0.25);
        osc.frequency.exponentialRampToValueAtTime(30, t + 0.6);
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
        osc.start(t); osc.stop(t + 0.7);
        break;

      case 'taco_bell':
        // Taco bell bong
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523, t);
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
        osc.start(t); osc.stop(t + 0.8);
        const osc4 = audioCtx.createOscillator();
        const g4 = audioCtx.createGain();
        osc4.connect(g4); g4.connect(audioCtx.destination);
        osc4.type = 'sine';
        osc4.frequency.setValueAtTime(659, t + 0.2);
        g4.gain.setValueAtTime(0.15, t + 0.2);
        g4.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
        osc4.start(t + 0.2); osc4.stop(t + 0.9);
        break;

      case 'zone_change':
        // Epic power-up fanfare
        osc.type = 'square';
        [440, 554, 659, 880].forEach((freq, i) => {
          osc.frequency.setValueAtTime(freq, t + i * 0.1);
        });
        gain.gain.setValueAtTime(0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        osc.start(t); osc.stop(t + 0.5);
        break;

      case 'coin_collect':
        // Satisfying coin ding – two-tone chime
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, t);
        osc.frequency.setValueAtTime(1600, t + 0.06);
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        osc.start(t); osc.stop(t + 0.2);
        // Harmony layer
        const osc5 = audioCtx.createOscillator();
        const g5 = audioCtx.createGain();
        osc5.connect(g5); g5.connect(audioCtx.destination);
        osc5.type = 'sine';
        osc5.frequency.setValueAtTime(1800, t + 0.05);
        g5.gain.setValueAtTime(0.1, t + 0.05);
        g5.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        osc5.start(t + 0.05); osc5.stop(t + 0.25);
        break;

      case 'booster':
        // Rocket ignition whoosh
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, t);
        osc.frequency.exponentialRampToValueAtTime(800, t + 0.15);
        osc.frequency.exponentialRampToValueAtTime(400, t + 0.5);
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.setValueAtTime(0.25, t + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
        osc.start(t); osc.stop(t + 0.6);
        // High-frequency jet layer
        const osc6 = audioCtx.createOscillator();
        const g6 = audioCtx.createGain();
        osc6.connect(g6); g6.connect(audioCtx.destination);
        osc6.type = 'triangle';
        osc6.frequency.setValueAtTime(2000, t);
        osc6.frequency.exponentialRampToValueAtTime(600, t + 0.5);
        g6.gain.setValueAtTime(0.08, t);
        g6.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        osc6.start(t); osc6.stop(t + 0.5);
        break;
    }
  } catch (e) { /* silent fail – audio isn't critical */ }
}

const MEME_SOUNDS = ['vine_boom', 'metal_pipe', 'bonk', 'oof', 'emotional_damage', 'fart_reverb', 'taco_bell'];
function playRandomMemeSound() {
  playSound(MEME_SOUNDS[Math.floor(Math.random() * MEME_SOUNDS.length)]);
}

// ─── Game State ─────────────────────────────────────────────
let canvas, ctx;
let levelsData = null;
let textsData = null;
let selectedChar = 'modi';
let gameState = 'menu'; // menu | playing | gameover
let score = 0;
let bestScore = parseInt(localStorage.getItem('wpc_best') || '0');
let currentZoneIdx = 0;
let lastZoneIdx = -1;

// Player
let player = { x: 0, y: 0, vx: 0, vy: 0, width: PLAYER_W, height: PLAYER_H, facingRight: true };

// Platforms
let platforms = [];
let cameraY = 0;
let platformIdCounter = 0;

// Particles
let particles = [];

// Collectibles (coins & boosters)
let coins = [];
let boosters = [];
let currencyCollected = 0;

// Jet Booster state
let jetBoostTimer = 0;     // frames remaining
let jetBoostActive = false;

// Input
let keys = {};
let touchStartX = null;
let activeTouches = {};  // Track active touch zones (left/right)

// Timers
let memeTimer = 0;
let quoteTimer = 0;

let scoreEl, altitudeEl, zoneBanner, memePopup, charQuote;
let startScreen, gameoverScreen, finalScoreEl, bestScoreEl;
let soundToggle;
let currencyEl, currencyIconEl, finalCurrencyEl, finalCurrencyIconEl, hudCurrencyEl;
let touchOverlayEl = null;

// ─── Initialization ─────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  canvas = document.getElementById('gameCanvas');
  ctx = canvas.getContext('2d');
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;

  // DOM refs
  scoreEl = document.getElementById('score-value');
  altitudeEl = document.getElementById('altitude-value');
  zoneBanner = document.getElementById('zone-banner');
  memePopup = document.getElementById('meme-popup');
  charQuote = document.getElementById('char-quote');
  startScreen = document.getElementById('start-screen');
  gameoverScreen = document.getElementById('gameover-screen');
  finalScoreEl = document.getElementById('final-score');
  bestScoreEl = document.getElementById('best-score');
  soundToggle = document.getElementById('sound-toggle');
  currencyEl = document.getElementById('currency-value');
  currencyIconEl = document.getElementById('currency-icon');
  finalCurrencyEl = document.getElementById('final-currency');
  finalCurrencyIconEl = document.getElementById('final-currency-icon');
  hudCurrencyEl = document.querySelector('.hud-currency');

  // Initialize sound system flags

  // Load data
  try {
    const [levRes, txtRes] = await Promise.all([
      fetch('data/levels.json'), fetch('data/texts.json')
    ]);
    levelsData = await levRes.json();
    textsData = await txtRes.json();
  } catch (e) {
    console.warn('Could not load data files, using defaults.');
    levelsData = getDefaultLevels();
    textsData = getDefaultTexts();
  }

  // Character select → instant start
  document.querySelectorAll('.char-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.char-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedChar = card.dataset.char;
      // Start the game immediately on character click
      startGame();
    });
  });

  // Select default
  document.querySelector(`.char-card[data-char="modi"]`).classList.add('selected');

  // Buttons
  document.getElementById('btn-restart').addEventListener('click', startGame);
  document.getElementById('btn-menu').addEventListener('click', showMenu);

  // Sound toggle
  soundToggle.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    soundToggle.textContent = soundEnabled ? '🔊' : '🔇';
  });

  // Input listeners
  window.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (e.code === 'Space' && gameState === 'menu') startGame();
    if (e.code === 'Space' && gameState === 'gameover') startGame();
  });
  window.addEventListener('keyup', e => { keys[e.code] = false; });

  // Touch / click
  canvas.addEventListener('click', () => {
    if (gameState === 'playing') { initAudio(); }
  });

  // ── Full-screen tap-zone mobile controls ──
  // Left half of screen = move left, right half = move right
  // Works with taps and holds for smooth, responsive gameplay
  setupMobileTouchZones();

  // Start loop
  showMenu();
  requestAnimationFrame(gameLoop);
});

// ─── Menu / Game Over ───────────────────────────────────────
function showMenu() {
  gameState = 'menu';
  if (typeof currentVoiceAudio !== 'undefined' && currentVoiceAudio) currentVoiceAudio.pause();
  startScreen.classList.remove('hidden');
  gameoverScreen.classList.add('hidden');
  document.getElementById('hud').style.display = 'none';
  updateTouchOverlay('menu');
}

function startGame() {
  initAudio();
  gameState = 'playing';
  score = 0;
  currentZoneIdx = 0;
  lastZoneIdx = -1;
  memeTimer = 0;
  quoteTimer = 0;
  particles = [];

  // Reset collectibles
  coins = [];
  boosters = [];
  currencyCollected = 0;
  jetBoostTimer = 0;
  jetBoostActive = false;

  // Update currency icon to match selected character
  const charData = CHARACTERS[selectedChar];
  if (currencyIconEl) currencyIconEl.textContent = charData.currency;
  if (currencyEl) currencyEl.textContent = '0';

  // Reset player
  player.x = CANVAS_W / 2 - PLAYER_W / 2;
  player.y = CANVAS_H - 120;
  player.vx = 0;
  player.vy = 0;
  player.facingRight = true;
  cameraY = 0;

  // Generate initial platforms
  platforms = [];
  platformIdCounter = 0;

  // Starting platform (safe)
  platforms.push(createPlatform(CANVAS_W / 2 - 50, CANVAS_H - 60, 100, 'normal'));

  // Fill screen with platforms
  for (let y = CANVAS_H - 140; y > -200; y -= randomBetween(55, 85)) {
    const w = randomBetween(70, 110);
    const x = randomBetween(10, CANVAS_W - w - 10);
    platforms.push(createPlatform(x, y, w, 'normal'));
  }

  startScreen.classList.add('hidden');
  gameoverScreen.classList.add('hidden');
  document.getElementById('hud').style.display = 'flex';
  updateTouchOverlay('playing');

  playSound('jump');
}

function gameOver() {
  gameState = 'gameover';
  if (typeof currentVoiceAudio !== 'undefined' && currentVoiceAudio) currentVoiceAudio.pause();
  playFaaah();  // 🔊 FAAAH meme sound on fall!

  // Screen shake
  document.getElementById('game-wrapper').classList.add('screen-shake');
  setTimeout(() => document.getElementById('game-wrapper').classList.remove('screen-shake'), 300);

  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem('wpc_best', bestScore.toString());
  }

  finalScoreEl.textContent = score;
  bestScoreEl.textContent = bestScore;
  if (finalCurrencyEl) finalCurrencyEl.textContent = currencyCollected;
  if (finalCurrencyIconEl) finalCurrencyIconEl.textContent = CHARACTERS[selectedChar].currency;
  gameoverScreen.classList.remove('hidden');
  document.getElementById('hud').style.display = 'none';
  updateTouchOverlay('gameover');
}

// ─── Platform Factory ───────────────────────────────────────
function createPlatform(x, y, width, type) {
  return {
    id: platformIdCounter++,
    x, y, width,
    height: PLATFORM_H,
    type,              // normal | breaking | moving | disappearing | fake
    broken: false,
    opacity: 1,
    moveDir: Math.random() > 0.5 ? 1 : -1,
    moveSpeed: 0,
    disappearTimer: 0,
    touched: false
  };
}

function getZone() {
  if (!levelsData) return null;
  const zones = levelsData.zones;
  for (let i = zones.length - 1; i >= 0; i--) {
    if (score >= zones[i].scoreMin) return { zone: zones[i], index: i };
  }
  return { zone: zones[0], index: 0 };
}

function spawnPlatformAbove() {
  const { zone, index } = getZone();
  currentZoneIdx = index;
  const types = zone.platformTypes;
  const type = types[Math.floor(Math.random() * types.length)];
  const minW = zone.platformWidth[0];
  const maxW = zone.platformWidth[1];
  const w = randomBetween(minW, maxW);
  const x = randomBetween(10, CANVAS_W - w - 10);

  // Find highest platform
  let highestY = Infinity;
  platforms.forEach(p => { if (p.y < highestY) highestY = p.y; });

  const gap = randomBetween(zone.gapRange[0], zone.gapRange[1]);
  const newY = highestY - gap;

  const plat = createPlatform(x, newY, w, type);
  if (type === 'moving') plat.moveSpeed = zone.platformSpeed;
  platforms.push(plat);

  // Spawn coin on this platform (random chance)
  if (type !== 'fake' && Math.random() < COIN_SPAWN_CHANCE) {
    coins.push({
      x: x + w / 2 - COIN_SIZE / 2,
      y: newY - COIN_SIZE - 6,
      platformId: plat.id,
      collected: false,
      bobOffset: Math.random() * Math.PI * 2
    });
  }

  // Spawn jet booster (rare, only on normal/moving platforms)
  if ((type === 'normal' || type === 'moving') && Math.random() < BOOSTER_SPAWN_CHANCE) {
    boosters.push({
      x: x + w / 2 - BOOSTER_SIZE / 2,
      y: newY - BOOSTER_SIZE - 8,
      platformId: plat.id,
      collected: false,
      bobOffset: Math.random() * Math.PI * 2
    });
  }
}

// ─── Draw Character (Image Sprite) ──────────────────────────
function drawPlayer(px, py) {
  const img = charImages[selectedChar];
  const cx = px + PLAYER_W / 2;

  ctx.save();
  if (!player.facingRight) {
    ctx.translate(cx, 0);
    ctx.scale(-1, 1);
    ctx.translate(-cx, 0);
  }

  // Draw the character image sprite
  if (img && img.complete && img.naturalWidth > 0) {
    // Add a subtle bounce when jumping
    const squash = player.vy < -2 ? 0.9 : (player.vy > 5 ? 1.1 : 1);
    const stretch = player.vy < -2 ? 1.12 : (player.vy > 5 ? 0.88 : 1);
    ctx.translate(cx, py + PLAYER_H / 2);
    ctx.scale(squash, stretch);
    ctx.translate(-cx, -(py + PLAYER_H / 2));

    // Drop shadow under character
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 4;

    ctx.drawImage(img, px - 5, py - 5, PLAYER_W + 10, PLAYER_H + 10);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  } else {
    // Fallback: colored circle with emoji
    ctx.fillStyle = '#d9b061';
    ctx.beginPath();
    ctx.arc(cx, py + PLAYER_H / 2, PLAYER_W / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.font = '24px serif';
    ctx.textAlign = 'center';
    ctx.fillText(CHARACTERS[selectedChar].emoji, cx, py + PLAYER_H / 2 + 8);
  }

  ctx.restore();
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ─── Draw Platform ──────────────────────────────────────────
function drawPlatform(p) {
  const screenY = p.y - cameraY;
  ctx.save();
  ctx.globalAlpha = p.opacity;

  switch (p.type) {
    case 'normal':
      // Solid green with grass effect
      const gNorm = ctx.createLinearGradient(p.x, screenY, p.x, screenY + p.height);
      gNorm.addColorStop(0, '#2ecc71');
      gNorm.addColorStop(1, '#27ae60');
      roundRect(p.x, screenY, p.width, p.height, 5);
      ctx.fillStyle = gNorm;
      ctx.fill();
      // Grass tufts
      ctx.fillStyle = '#55efc4';
      for (let i = 0; i < p.width; i += 8) {
        ctx.fillRect(p.x + i, screenY - 2, 3, 3);
      }
      break;

    case 'breaking':
      if (p.broken) {
        // Shattered fragments
        ctx.fillStyle = '#e17055';
        for (let i = 0; i < 5; i++) {
          const fx = p.x + Math.random() * p.width;
          const fy = screenY + Math.random() * 20;
          ctx.fillRect(fx, fy, randomBetween(4, 10), randomBetween(3, 6));
        }
      } else {
        const gBrk = ctx.createLinearGradient(p.x, screenY, p.x, screenY + p.height);
        gBrk.addColorStop(0, '#e17055');
        gBrk.addColorStop(1, '#d63031');
        roundRect(p.x, screenY, p.width, p.height, 5);
        ctx.fillStyle = gBrk;
        ctx.fill();
        // Crack lines
        ctx.strokeStyle = '#2d3436';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(p.x + p.width * 0.3, screenY);
        ctx.lineTo(p.x + p.width * 0.5, screenY + p.height);
        ctx.moveTo(p.x + p.width * 0.6, screenY);
        ctx.lineTo(p.x + p.width * 0.4, screenY + p.height * 0.6);
        ctx.stroke();
        // Warning icon
        ctx.fillStyle = '#fdcb6e';
        ctx.font = '10px Outfit';
        ctx.fillText('⚠', p.x + p.width / 2 - 5, screenY + p.height - 2);
      }
      break;

    case 'moving':
      const gMov = ctx.createLinearGradient(p.x, screenY, p.x, screenY + p.height);
      gMov.addColorStop(0, '#74b9ff');
      gMov.addColorStop(1, '#0984e3');
      roundRect(p.x, screenY, p.width, p.height, 5);
      ctx.fillStyle = gMov;
      ctx.fill();
      // Glow effect
      ctx.shadowColor = '#74b9ff';
      ctx.shadowBlur = 10;
      roundRect(p.x, screenY, p.width, p.height, 5);
      ctx.strokeStyle = '#74b9ff';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.shadowBlur = 0;
      // Arrow indicators
      ctx.fillStyle = '#fff';
      ctx.font = '10px Outfit';
      ctx.fillText('◄►', p.x + p.width / 2 - 8, screenY + p.height - 2);
      break;

    case 'disappearing':
      const gDis = ctx.createLinearGradient(p.x, screenY, p.x, screenY + p.height);
      gDis.addColorStop(0, '#a29bfe');
      gDis.addColorStop(1, '#6c5ce7');
      roundRect(p.x, screenY, p.width, p.height, 5);
      ctx.fillStyle = gDis;
      ctx.fill();
      // Pulsing outline
      ctx.strokeStyle = `rgba(162,155,254,${0.5 + 0.5 * Math.sin(Date.now() * 0.005)})`;
      ctx.lineWidth = 2;
      roundRect(p.x, screenY, p.width, p.height, 5);
      ctx.stroke();
      break;

    case 'fake':
      // Looks normal but slightly transparent & wobbly
      const gFake = ctx.createLinearGradient(p.x, screenY, p.x, screenY + p.height);
      gFake.addColorStop(0, '#2ecc71');
      gFake.addColorStop(1, '#27ae60');
      ctx.globalAlpha = 0.55 + 0.15 * Math.sin(Date.now() * 0.008);
      roundRect(p.x, screenY, p.width, p.height, 5);
      ctx.fillStyle = gFake;
      ctx.fill();
      // Subtle "?" mark
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px Outfit';
      ctx.fillText('?', p.x + p.width / 2 - 3, screenY + p.height - 2);
      break;
  }

  ctx.restore();
}

// ─── Particles ──────────────────────────────────────────────
function spawnParticles(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 1) * 4,
      life: 30 + Math.random() * 20,
      maxLife: 50,
      size: 2 + Math.random() * 3,
      color
    });
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.1;
    p.life--;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function drawParticles() {
  particles.forEach(p => {
    ctx.save();
    ctx.globalAlpha = p.life / p.maxLife;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y - cameraY, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

// ─── Background ─────────────────────────────────────────────
function drawBackground() {
  const { zone } = getZone();
  const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
  grad.addColorStop(0, zone.bgColor1);
  grad.addColorStop(1, zone.bgColor2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Stars
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  const starSeed = 42;
  for (let i = 0; i < 60; i++) {
    const sx = ((i * 137 + starSeed) % CANVAS_W);
    const sy = ((i * 211 + starSeed * 3) % CANVAS_H + cameraY * 0.05) % CANVAS_H;
    const size = (i % 3 === 0) ? 2 : 1;
    ctx.globalAlpha = 0.3 + 0.3 * Math.sin(Date.now() * 0.001 + i);
    ctx.fillRect(sx, sy, size, size);
  }
  ctx.globalAlpha = 1;

  // City silhouette at bottom
  if (cameraY < 400) {
    const alpha = Math.max(0, 1 - cameraY / 400);
    ctx.globalAlpha = alpha * 0.3;
    ctx.fillStyle = '#2a1520';
    const buildings = [
      { x: 20, w: 40, h: 120 }, { x: 70, w: 30, h: 80 },
      { x: 110, w: 50, h: 150 }, { x: 170, w: 35, h: 95 },
      { x: 220, w: 45, h: 130 }, { x: 275, w: 55, h: 160 },
      { x: 340, w: 30, h: 100 }, { x: 380, w: 35, h: 110 }
    ];
    buildings.forEach(b => {
      ctx.fillRect(b.x, CANVAS_H - b.h - cameraY * 0.1, b.w, b.h + 20);
      // Dome on some
      if (b.h > 120) {
        ctx.beginPath();
        ctx.arc(b.x + b.w / 2, CANVAS_H - b.h - cameraY * 0.1, b.w / 2.5, Math.PI, 0);
        ctx.fill();
      }
    });
    ctx.globalAlpha = 1;
  }
}

// ─── President Voice AI MP3 System ──────────────────────────
let currentVoiceAudio = null;

function playCharacterVoice(charKey, quoteIndex, quoteText) {
  if (!soundEnabled) return;
  if (currentVoiceAudio) {
    currentVoiceAudio.pause();
    currentVoiceAudio.currentTime = 0;
  }

  let audioSrc = `assets/audio/${charKey}_${quoteIndex}.mp3`;

  // Special exception for Modi's first quote ("Mitron! Keep climbing! 🇮🇳")
  if (charKey === 'modi' && quoteIndex === 0) {
    audioSrc = 'assets/audio/Modi_quote1.mp3';
  }

  // Try to play pre-recorded MP3 from assets/audio/ directory or absolute path
  const audio = new Audio(audioSrc);
  audio.volume = 0.9;
  audio.play().catch((e) => {
    console.warn('Audio play error:', e);
  });
  currentVoiceAudio = audio;
}

// ─── Meme & Zone Events ────────────────────────────────────
function triggerMemeText() {
  if (!textsData) return;
  const texts = textsData.memeTexts;
  const text = texts[Math.floor(Math.random() * texts.length)];
  memePopup.textContent = text;
  memePopup.classList.add('show');
  playRandomMemeSound();

  setTimeout(() => memePopup.classList.remove('show'), 2000);
}

function triggerCharQuote() {
  if (!textsData) return;
  const quotes = textsData.characterQuotes[selectedChar];
  if (!quotes) return;
  const quoteIndex = Math.floor(Math.random() * quotes.length);
  const quote = quotes[quoteIndex];
  charQuote.textContent = quote;
  charQuote.classList.add('show');

  // 🔊 Play pre-recorded AI voice MP3
  playCharacterVoice(selectedChar, quoteIndex, quote);

  setTimeout(() => charQuote.classList.remove('show'), 2500);
}

function showZoneBanner() {
  if (!textsData || !levelsData) return;
  const zone = levelsData.zones[currentZoneIdx];
  const announce = textsData.zoneAnnouncements[zone.name] || zone.name;
  zoneBanner.textContent = announce;
  zoneBanner.classList.add('show');
  playSound('zone_change');

  // Shake
  document.getElementById('game-wrapper').classList.add('screen-shake');
  setTimeout(() => document.getElementById('game-wrapper').classList.remove('screen-shake'), 300);
  setTimeout(() => zoneBanner.classList.remove('show'), 3000);
}

// ─── Game Loop ──────────────────────────────────────────────
let lastTime = 0;
function gameLoop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 16.67, 2); // cap delta
  lastTime = timestamp;

  if (gameState === 'playing') {
    update(dt);
    render();
  } else if (gameState === 'menu') {
    renderMenu();
  }

  requestAnimationFrame(gameLoop);
}

function update(dt) {
  // ── Player horizontal movement ──
  if (keys['ArrowLeft'] || keys['KeyA']) {
    player.vx -= HORIZONTAL_ACCEL * dt;
    player.facingRight = false;
  } else if (keys['ArrowRight'] || keys['KeyD']) {
    player.vx += HORIZONTAL_ACCEL * dt;
    player.facingRight = true;
  } else {
    player.vx *= HORIZONTAL_FRICTION;
  }
  player.vx = clamp(player.vx, -MAX_HORIZONTAL_SPEED, MAX_HORIZONTAL_SPEED);
  player.x += player.vx * dt;

  // Wrap around edges
  if (player.x + PLAYER_W < 0) player.x = CANVAS_W;
  if (player.x > CANVAS_W) player.x = -PLAYER_W;

  // ── Jet Boost ──
  if (jetBoostActive) {
    jetBoostTimer -= dt;
    // Reduced gravity + constant upward thrust during boost
    player.vy += GRAVITY * 0.15 * dt; // much less gravity
    player.vy = Math.min(player.vy, BOOSTER_FORCE * 0.6); // cap upward speed
    player.y += player.vy * dt;

    // Spawn jet fire particles under the player
    if (Math.random() < 0.7) {
      const fireColors = ['#ff6b35', '#ff9500', '#ffd700', '#ff4500', '#fff'];
      for (let i = 0; i < 2; i++) {
        particles.push({
          x: player.x + PLAYER_W / 2 + (Math.random() - 0.5) * 20,
          y: player.y + PLAYER_H,
          vx: (Math.random() - 0.5) * 3,
          vy: 3 + Math.random() * 4,
          life: 15 + Math.random() * 15,
          maxLife: 30,
          size: 3 + Math.random() * 5,
          color: fireColors[Math.floor(Math.random() * fireColors.length)]
        });
      }
    }

    if (jetBoostTimer <= 0) {
      jetBoostActive = false;
      jetBoostTimer = 0;
    }
  } else {
    // ── Normal Gravity ──
    player.vy += GRAVITY * dt;
    player.y += player.vy * dt;
  }

  // ── Platform collision (only when falling) ──
  if (player.vy > 0) {
    for (let p of platforms) {
      if (p.broken || p.type === 'fake') continue;
      // AABB: player feet vs platform top
      const playerBottom = player.y + PLAYER_H;
      const playerPrevBottom = playerBottom - player.vy * dt;
      if (
        playerBottom >= p.y &&
        playerPrevBottom <= p.y + 4 &&
        player.x + PLAYER_W - 5 > p.x &&
        player.x + 5 < p.x + p.width
      ) {
        // Land!
        player.y = p.y - PLAYER_H;
        player.vy = JUMP_FORCE;
        playSound('jump');
        spawnParticles(player.x + PLAYER_W / 2, p.y, '#2ecc71', 6);

        // Platform effects
        if (p.type === 'breaking') {
          p.broken = true;
          playSound('break');
          spawnParticles(p.x + p.width / 2, p.y, '#e17055', 12);
        }
        if (p.type === 'disappearing' && !p.touched) {
          p.touched = true;
          p.disappearTimer = 40;
        }
      }
    }
  }

  // Handle fake platforms – player falls through
  for (let p of platforms) {
    if (p.type === 'fake' && !p.touched) {
      const playerBottom = player.y + PLAYER_H;
      if (
        playerBottom >= p.y && playerBottom <= p.y + PLATFORM_H + 10 &&
        player.x + PLAYER_W - 5 > p.x && player.x + 5 < p.x + p.width &&
        player.vy > 0
      ) {
        p.touched = true;
        p.opacity = 0;
        playSound('oof');
        spawnParticles(p.x + p.width / 2, p.y, '#636e72', 8);
      }
    }
  }

  // ── Update platforms ──
  for (let p of platforms) {
    // Moving platforms
    if (p.type === 'moving' && !p.broken) {
      p.x += p.moveSpeed * p.moveDir * dt;
      if (p.x <= 0 || p.x + p.width >= CANVAS_W) p.moveDir *= -1;
      p.x = clamp(p.x, 0, CANVAS_W - p.width);

      // Move coins/boosters tied to this moving platform
      coins.forEach(c => {
        if (c.platformId === p.id && !c.collected) {
          c.x = p.x + p.width / 2 - COIN_SIZE / 2;
        }
      });
      boosters.forEach(b => {
        if (b.platformId === p.id && !b.collected) {
          b.x = p.x + p.width / 2 - BOOSTER_SIZE / 2;
        }
      });
    }
    // Disappearing
    if (p.type === 'disappearing' && p.touched) {
      p.disappearTimer -= dt;
      p.opacity = Math.max(0, p.disappearTimer / 40);
      if (p.disappearTimer <= 0) p.broken = true;
    }
  }

  // ── Collect Coins ──
  const playerCX = player.x + PLAYER_W / 2;
  const playerCY = player.y + PLAYER_H / 2;
  for (let c of coins) {
    if (c.collected) continue;
    const coinCX = c.x + COIN_SIZE / 2;
    const coinCY = c.y + COIN_SIZE / 2;
    const dist = Math.hypot(playerCX - coinCX, playerCY - coinCY);
    if (dist < (PLAYER_W / 2 + COIN_SIZE / 2) * 0.75) {
      c.collected = true;
      currencyCollected++;
      playSound('coin_collect');
      // Sparkle particles in currency color
      const cColor = CHARACTERS[selectedChar].currencyColor;
      spawnParticles(coinCX, coinCY, cColor, 8);
      spawnParticles(coinCX, coinCY, '#ffd700', 4);
      // Flash HUD
      if (hudCurrencyEl) {
        hudCurrencyEl.classList.remove('coin-flash');
        void hudCurrencyEl.offsetWidth; // force reflow
        hudCurrencyEl.classList.add('coin-flash');
      }
    }
  }

  // ── Collect Boosters ──
  for (let b of boosters) {
    if (b.collected) continue;
    const bCX = b.x + BOOSTER_SIZE / 2;
    const bCY = b.y + BOOSTER_SIZE / 2;
    const dist = Math.hypot(playerCX - bCX, playerCY - bCY);
    if (dist < (PLAYER_W / 2 + BOOSTER_SIZE / 2) * 0.8) {
      b.collected = true;
      jetBoostActive = true;
      jetBoostTimer = BOOSTER_DURATION;
      player.vy = BOOSTER_FORCE;
      playSound('booster');
      // Explosion of fire particles
      spawnParticles(bCX, bCY, '#ff6b35', 12);
      spawnParticles(bCX, bCY, '#ffd700', 8);
      spawnParticles(bCX, bCY, '#ff4500', 6);
    }
  }

  // ── Camera ──
  const targetCameraY = player.y - CANVAS_H * 0.4;
  if (targetCameraY < cameraY) {
    cameraY += (targetCameraY - cameraY) * 0.1;
  }

  // ── Score ──
  const newScore = Math.max(score, Math.floor(-cameraY / 5));
  if (newScore > score) {
    if (newScore - score >= 10) {
      playSound('score');
    }
    score = newScore;
  }

  // ── Zone change ──
  const { index } = getZone();
  if (index !== lastZoneIdx) {
    if (lastZoneIdx !== -1) showZoneBanner();
    lastZoneIdx = index;
  }

  // ── Meme events ──
  const { zone } = getZone();
  memeTimer += dt;
  if (memeTimer > 180) { // roughly every 3 seconds check
    if (Math.random() < zone.memeEventChance) {
      triggerMemeText();
    }
    memeTimer = 0;
  }

  quoteTimer += dt;
  if (quoteTimer > 500) {
    triggerCharQuote();
    quoteTimer = 0;
  }

  // ── Spawn new platforms ──
  let highestY = Infinity;
  platforms.forEach(p => { if (p.y < highestY) highestY = p.y; });
  while (highestY > cameraY - 200) {
    spawnPlatformAbove();
    highestY = -Infinity;
    platforms.forEach(p => { if (p.y < highestY || highestY === -Infinity) highestY = p.y; });
  }

  // ── Remove off-screen platforms ──
  platforms = platforms.filter(p => p.y - cameraY < CANVAS_H + 50);

  // ── Remove off-screen / collected coins & boosters ──
  coins = coins.filter(c => !c.collected && c.y - cameraY < CANVAS_H + 50);
  boosters = boosters.filter(b => !b.collected && b.y - cameraY < CANVAS_H + 50);

  // ── Update particles ──
  updateParticles();

  // ── Game over check ──
  if (player.y - cameraY > CANVAS_H + 80) {
    gameOver();
  }

  // ── Update HUD ──
  if (scoreEl) scoreEl.textContent = score;
  if (altitudeEl) altitudeEl.textContent = Math.floor(-cameraY) + 'm';
  if (currencyEl) currencyEl.textContent = currencyCollected;
}

// ─── Draw Coin ──────────────────────────────────────────────
function drawCoin(c) {
  const screenY = c.y - cameraY;
  const t = Date.now() * 0.003;
  const bob = Math.sin(t + c.bobOffset) * 4; // gentle floating
  const charData = CHARACTERS[selectedChar];

  ctx.save();

  // Coin circle background with glow
  const cx = c.x + COIN_SIZE / 2;
  const cy = screenY + COIN_SIZE / 2 + bob;

  // Outer glow
  ctx.shadowColor = charData.currencyColor;
  ctx.shadowBlur = 12 + Math.sin(t * 2 + c.bobOffset) * 4;

  // Gold coin circle
  const coinGrad = ctx.createRadialGradient(cx - 3, cy - 3, 2, cx, cy, COIN_SIZE / 2);
  coinGrad.addColorStop(0, '#fff8dc');
  coinGrad.addColorStop(0.3, '#ffd700');
  coinGrad.addColorStop(0.7, charData.currencyColor);
  coinGrad.addColorStop(1, '#b8860b');
  ctx.fillStyle = coinGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, COIN_SIZE / 2, 0, Math.PI * 2);
  ctx.fill();

  // Inner ring
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, COIN_SIZE / 2 - 3, 0, Math.PI * 2);
  ctx.stroke();

  // Currency symbol
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#1a1016';
  ctx.font = 'bold 14px Cinzel, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(charData.currency, cx, cy + 1);

  ctx.restore();
}

// ─── Draw Booster ───────────────────────────────────────────
function drawBooster(b) {
  const screenY = b.y - cameraY;
  const t = Date.now() * 0.004;
  const bob = Math.sin(t + b.bobOffset) * 5;

  ctx.save();

  const cx = b.x + BOOSTER_SIZE / 2;
  const cy = screenY + BOOSTER_SIZE / 2 + bob;
  const pulse = 1 + Math.sin(t * 3 + b.bobOffset) * 0.1;

  // Outer glow
  ctx.shadowColor = '#ff6b35';
  ctx.shadowBlur = 15 + Math.sin(t * 2) * 5;

  // Booster body
  ctx.translate(cx, cy);
  ctx.scale(pulse, pulse);

  // Rocket body gradient
  const rocketGrad = ctx.createLinearGradient(-8, -12, 8, 12);
  rocketGrad.addColorStop(0, '#ff4500');
  rocketGrad.addColorStop(0.5, '#ff6b35');
  rocketGrad.addColorStop(1, '#ff9500');
  ctx.fillStyle = rocketGrad;

  // Rocket shape
  ctx.beginPath();
  ctx.moveTo(0, -13);  // nose
  ctx.lineTo(7, -4);
  ctx.lineTo(9, 6);
  ctx.lineTo(5, 10);
  ctx.lineTo(-5, 10);
  ctx.lineTo(-9, 6);
  ctx.lineTo(-7, -4);
  ctx.closePath();
  ctx.fill();

  // Window
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#87CEEB';
  ctx.beginPath();
  ctx.arc(0, -2, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // Flame at bottom
  const flameH = 5 + Math.sin(t * 8) * 3;
  const flameGrad = ctx.createLinearGradient(0, 10, 0, 10 + flameH);
  flameGrad.addColorStop(0, '#ffd700');
  flameGrad.addColorStop(0.5, '#ff4500');
  flameGrad.addColorStop(1, 'rgba(255,69,0,0)');
  ctx.fillStyle = flameGrad;
  ctx.beginPath();
  ctx.moveTo(-4, 10);
  ctx.lineTo(0, 10 + flameH);
  ctx.lineTo(4, 10);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

// ─── Render ─────────────────────────────────────────────────
function render() {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  drawBackground();

  // Platforms
  platforms.forEach(p => { if (!p.broken || p.type === 'breaking') drawPlatform(p); });

  // Coins
  coins.forEach(c => { if (!c.collected) drawCoin(c); });

  // Boosters
  boosters.forEach(b => { if (!b.collected) drawBooster(b); });

  // Player (with jet boost glow effect)
  if (jetBoostActive) {
    ctx.save();
    ctx.shadowColor = '#ff6b35';
    ctx.shadowBlur = 25 + Math.sin(Date.now() * 0.01) * 10;
    drawPlayer(player.x, player.y - cameraY);
    ctx.restore();
  } else {
    drawPlayer(player.x, player.y - cameraY);
  }

  // Particles
  drawParticles();

  // Jet boost indicator
  if (jetBoostActive) {
    ctx.save();
    ctx.fillStyle = 'rgba(255, 107, 53, 0.7)';
    ctx.font = 'bold 14px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🚀 JET BOOST!', CANVAS_W / 2, 50);
    // Progress bar
    const barW = 80;
    const barH = 4;
    const barX = CANVAS_W / 2 - barW / 2;
    const barY = 56;
    const progress = jetBoostTimer / BOOSTER_DURATION;
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(barX, barY, barW, barH);
    const boostGrad = ctx.createLinearGradient(barX, 0, barX + barW * progress, 0);
    boostGrad.addColorStop(0, '#ff6b35');
    boostGrad.addColorStop(1, '#ffd700');
    ctx.fillStyle = boostGrad;
    ctx.fillRect(barX, barY, barW * progress, barH);
    ctx.restore();
  }

  // Zone indicator
  if (levelsData) {
    const zone = levelsData.zones[currentZoneIdx];
    ctx.save();
    ctx.fillStyle = 'rgba(217, 176, 97, 0.4)';
    ctx.font = '12px Cinzel, serif';
    ctx.textAlign = 'right';
    ctx.fillText(zone.name, CANVAS_W - 12, CANVAS_H - 12);
    ctx.restore();
  }
}

function renderMenu() {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  // Animated warm gradient (burgundy palette)
  const t = Date.now() * 0.001;
  const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
  grad.addColorStop(0, '#1a1016');
  grad.addColorStop(0.4, '#2a1520');
  grad.addColorStop(0.7, `hsl(${340 + Math.sin(t * 0.3) * 10}, 35%, ${12 + Math.sin(t * 0.5) * 3}%)`);
  grad.addColorStop(1, '#1a1016');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Subtle gold particles
  for (let i = 0; i < 30; i++) {
    const px = ((i * 137 + 42) % CANVAS_W);
    const py = ((i * 211 + 126) % CANVAS_H + t * 8) % CANVAS_H;
    ctx.globalAlpha = 0.15 + 0.1 * Math.sin(t * 2 + i);
    ctx.fillStyle = '#d9b061';
    ctx.beginPath();
    ctx.arc(px, py, 1 + (i % 2), 0, Math.PI * 2);
    ctx.fill();
  }

  // Floating platforms preview (gold-tinted)
  ctx.globalAlpha = 0.2;
  for (let i = 0; i < 8; i++) {
    const px = 30 + (i * 53) % (CANVAS_W - 80);
    const py = 100 + (i * 97 + Math.sin(t + i) * 20) % (CANVAS_H - 200);
    const gPrev = ctx.createLinearGradient(px, py, px, py + 12);
    gPrev.addColorStop(0, '#d9b061');
    gPrev.addColorStop(1, '#b8923d');
    roundRect(px, py, 60 + i * 5, 12, 4);
    ctx.fillStyle = gPrev;
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ─── Mobile Touch Zone Controls ─────────────────────────────

function setupMobileTouchZones() {
  // Only set up on touch-capable devices
  const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  if (!isTouchDevice) return;

  // Create touch zone overlay
  const touchOverlay = document.createElement('div');
  touchOverlay.id = 'touch-overlay';
  touchOverlay.innerHTML = `
    <div class="touch-zone touch-zone-left" id="touch-zone-left">
      <div class="touch-indicator">◀</div>
    </div>
    <div class="touch-zone touch-zone-right" id="touch-zone-right">
      <div class="touch-indicator">▶</div>
    </div>
  `;
  document.getElementById('game-wrapper').appendChild(touchOverlay);
  touchOverlayEl = touchOverlay;

  const leftZone = document.getElementById('touch-zone-left');
  const rightZone = document.getElementById('touch-zone-right');

  // Prevent scrolling/zooming ONLY on the touch zones during gameplay
  touchOverlay.addEventListener('touchstart', e => {
    if (gameState === 'playing') e.preventDefault();
  }, { passive: false });
  touchOverlay.addEventListener('touchmove', e => {
    if (gameState === 'playing') e.preventDefault();
  }, { passive: false });
  touchOverlay.addEventListener('touchend', e => {
    if (gameState === 'playing') e.preventDefault();
  }, { passive: false });

  // Touch handlers on the overlay itself (not document) to avoid blocking menus
  touchOverlay.addEventListener('touchstart', handleTouchStart, { passive: false });
  touchOverlay.addEventListener('touchmove', handleTouchMove, { passive: false });
  touchOverlay.addEventListener('touchend', handleTouchEnd, { passive: false });
  touchOverlay.addEventListener('touchcancel', handleTouchEnd, { passive: false });

  function handleTouchStart(e) {
    if (gameState !== 'playing') return;
    initAudio();

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const screenMidX = window.innerWidth / 2;
      const side = touch.clientX < screenMidX ? 'left' : 'right';

      activeTouches[touch.identifier] = side;

      if (side === 'left') {
        leftZone.classList.add('active');
      } else {
        rightZone.classList.add('active');
      }
    }

    updateTouchKeys();
  }

  function handleTouchMove(e) {
    if (gameState !== 'playing') return;

    // Update touch positions — finger might have moved across the midline
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (activeTouches[touch.identifier] !== undefined) {
        const screenMidX = window.innerWidth / 2;
        const newSide = touch.clientX < screenMidX ? 'left' : 'right';
        activeTouches[touch.identifier] = newSide;
      }
    }

    updateTouchKeys();
    updateTouchVisuals();
  }

  function handleTouchEnd(e) {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      delete activeTouches[touch.identifier];
    }

    updateTouchKeys();
    updateTouchVisuals();
  }

  function updateTouchKeys() {
    let hasLeft = false;
    let hasRight = false;

    Object.values(activeTouches).forEach(side => {
      if (side === 'left') hasLeft = true;
      if (side === 'right') hasRight = true;
    });

    keys['ArrowLeft'] = hasLeft;
    keys['ArrowRight'] = hasRight;
  }

  function updateTouchVisuals() {
    let hasLeft = false;
    let hasRight = false;

    Object.values(activeTouches).forEach(side => {
      if (side === 'left') hasLeft = true;
      if (side === 'right') hasRight = true;
    });

    leftZone.classList.toggle('active', hasLeft);
    rightZone.classList.toggle('active', hasRight);
  }
}

// Show/hide touch overlay based on game state
function updateTouchOverlay(state) {
  if (!touchOverlayEl) return;
  if (state === 'playing') {
    touchOverlayEl.style.pointerEvents = '';
    touchOverlayEl.style.display = 'flex';
  } else {
    touchOverlayEl.style.pointerEvents = 'none';
    touchOverlayEl.style.display = 'none';
    // Clear any stuck touches
    activeTouches = {};
    keys['ArrowLeft'] = false;
    keys['ArrowRight'] = false;
  }
}

// ─── Utilities ──────────────────────────────────────────────
function randomBetween(a, b) { return a + Math.random() * (b - a); }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

// ─── Fallback Data ──────────────────────────────────────────
function getDefaultLevels() {
  return {
    zones: [
      { name: 'Beginner Zone', scoreMin: 0, scoreMax: 500, platformTypes: ['normal'], platformSpeed: 0, platformWidth: [80, 120], gapRange: [50, 90], scrollSpeed: 2, memeEventChance: 0.02, bgColor1: '#1a1016', bgColor2: '#2a1520' },
      { name: 'Mid Zone', scoreMin: 500, scoreMax: 1500, platformTypes: ['normal', 'breaking', 'moving'], platformSpeed: 1.5, platformWidth: [60, 100], gapRange: [60, 110], scrollSpeed: 3, memeEventChance: 0.05, bgColor1: '#2a1520', bgColor2: '#3a1a25' },
      { name: 'Hard Zone', scoreMin: 1500, scoreMax: 3000, platformTypes: ['normal', 'breaking', 'moving', 'disappearing', 'fake'], platformSpeed: 2.5, platformWidth: [50, 90], gapRange: [70, 130], scrollSpeed: 4, memeEventChance: 0.08, bgColor1: '#3a1a25', bgColor2: '#4a0e1c' },
      { name: 'CHAOS Zone', scoreMin: 3000, scoreMax: 999999, platformTypes: ['normal', 'breaking', 'moving', 'disappearing', 'fake'], platformSpeed: 3.5, platformWidth: [40, 80], gapRange: [80, 150], scrollSpeed: 5.5, memeEventChance: 0.15, bgColor1: '#4a0e1c', bgColor2: '#2a0008' }
    ]
  };
}

function getDefaultTexts() {
  return {
    memeTexts: ['Chaos Mode ACTIVATED 🔥', 'POWER JUMP! 💪', 'Unexpected Scandal! 😱', 'GDP Goes Brrrrr 🖨️', 'Democracy Speedrun Any%'],
    characterQuotes: {
      modi: [
        "Mitron! Keep climbing! 🇮🇳",
        "Digital India powered jump!",
        "Achhe din are above! ⬆️",
        "Mann Ki Baat: Jump higher!",
        "Yoga power activated! 🧘"
      ],
      trump: [
        "TREMENDOUS jump! The BEST! 👆",
        "We're gonna build higher! HUGE!",
        "Nobody climbs better than me!",
        "Make Climbing Great Again! 🇺🇸",
        "FAKE platforms! SAD! 😤"
      ],
      putin: [
        "Bear mode activated! 🐻",
        "Special climbing operation!",
        "From Russia with jumps! 🪆",
        "KGB-trained bounce! 💪",
        "Sanctions can't stop ME!"
      ],
      zelensky: [
        "I need platforms, not a ride! 🇺🇦",
        "Slava Climbing! 💙💛",
        "Democracy jumps higher!",
        "Freedom platform unlocked!",
        "Piano skills activated! 🎹"
      ],
      xi: [
        "Five Year Climb Plan! 🇨🇳",
        "Great Wall of Platforms!",
        "Belt & Road to the TOP!",
        "Common Prosperity Jump! 🏮",
        "Panda power bounce! 🐼"
      ],
      kim: [
        "Supreme Leader LEAPS! 🚀",
        "Juche Jump Technology!",
        "Missile-powered bounce! 💥",
        "Dear Leader never falls!",
        "State media: Perfect landing!"
      ]
    },
    zoneAnnouncements: { 'Beginner Zone': '🟢 Easy mode...', 'Mid Zone': '🟡 Getting political!', 'Hard Zone': '🔴 CRISIS MODE!', 'CHAOS Zone': '💀 TOTAL CHAOS!' }
  };
}
