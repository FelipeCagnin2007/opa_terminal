/**
 * OPA-gotchi - Virtual Protocol Entity
 * A Tamagotchi-style simulation built on the OPA Protocol.
 */

// --- Constants ---
const EVOLUTION_STAGES = ['EGG', 'LEXER_BABY', 'PROTOCOL_GUARDIAN', 'SYNTAX_KNIGHT', 'NODE_WIZARD', 'QUANTUM_MASTER'];

// --- Game State ---
let pet = {
    name: null,
    energy: 100,
    mood: 100,
    stability: 100,
    age: 0,
    interactions: 0,
    coins: 100,
    lastCoinClaim: 0,
    translationCount: 0,
    stage: 'EGG',
    lastUpdate: Date.now(),
    isSleeping: false,
    isDead: false,
    thoughts: ""
};

// --- ASCII Forms ---
const PET_ASCII = {
    EGG: "\n   .---.   \n  /     \\  \n |   O   | \n  \\     /  \n   '---'   ",
    LEXER_BABY: "\n    \\^.^/   \n    ( o )   \n     vvv    ",
    PROTOCOL_GUARDIAN: "\n     /\\_/\\     \n    ( o.o )    \n     > ^ <     \n    /     \\    \n   |       |   \n   '-------'   ",
    SYNTAX_KNIGHT: "\n      /\\      \n     |  |     \n    /----\\    \n   [ o  o ]   \n    \\_--_/    \n     |  |     \n    /|  |\\    ",
    NODE_WIZARD: "\n     .---.     \n    /     \\    \n   | (O_O) |   \n    \\  -  /    \n    /|:::|\\    \n   / |:::| \\   \n     '---'     ",
    QUANTUM_MASTER: "\n   .-------.   \n  /   _-_   \\  \n |  ( o o )  | \n  \\   `-'   /  \n   '-------'   \n    /  |  \\    \n   o   o   o   "
};

// --- OPA Thoughts (Encrypted Messages) ---
const OPA_MESSAGES = {
    // "Estou com fome"
    hunger: "oopppppa oooppppa oppppppppppa ooopppa oppa / opppppppa oopppppppa oopppppa oppppppppppa ooppppppa opppppppppa oppa / oopppppa oooppppa oppppppppppa ooopppa oppa",
    // "Preciso de otimização"
    bored: "oooppa oppa oppppa oopppppppa / oppppa opppppppppa oppppppa oppppppppppa oopppppppa ooooooooopppppppppa / opppa oopppppppa ooppppppppppa oppa / ooppppppppa ooppppa oppa oooppppppppa",
    // "Buffer instável"
    sick: "ooooppppa oopppppppa opppppppa / oppppa oopppppppa opppppppa / opppppa oopppppppa opppppa oopppppppaa oppppppppppa"
};

// --- Initialization ---
function init() {
    loadPet();
    const now = Date.now();
    const diff = (now - pet.lastUpdate) / 1000; // seconds passed

    // Apply background decay
    if (diff > 0 && !pet.isDead) {
        pet.energy = Math.max(0, pet.energy - (diff / 120));
        pet.mood = Math.max(0, pet.mood - (diff / 180));
        pet.stability = Math.max(0, pet.stability - (diff / 240));
    }

    updateUI();

    // Naming Check
    if (!pet.name && !pet.isDead) {
        document.getElementById('namingOverlay').style.display = 'flex';
    }

    // Simulation Tick (Every 5 seconds)
    setInterval(tick, 5000);
    // UI Fast Tick (Every 1 second) for timers
    setInterval(updateUI, 1000);
}

function tick() {
    if (pet.isDead) return;

    if (pet.isSleeping) {
        pet.energy = Math.min(100, pet.energy + 2);
    } else {
        pet.energy = Math.max(0, pet.energy - 0.5);
        pet.mood = Math.max(0, pet.mood - 0.3);
    }

    // Stability links to energy/mood
    if (pet.energy < 20 || pet.mood < 20) {
        pet.stability = Math.max(0, pet.stability - 1);
    }

    // DEATH CHECK
    if (pet.energy <= 0 || pet.mood <= 0 || pet.stability <= 0) {
        pet.isDead = true;
        document.getElementById('deathOverlay').style.display = 'flex';
    }

    pet.age += 1;
    pet.lastUpdate = Date.now();

    checkEvolution();
    updateUI();
    savePet();

    // Random Thought Generation
    if (Math.random() < 0.2) generateThought();
}

// --- Interactions ---
function petAction(type) {
    if (pet.isDead) return;
    if (pet.isSleeping && type !== 'sleep') return;

    // Interaction increment
    if (type !== 'sleep') {
        if (pet.coins < 10) {
            showTemporaryMsg("SALDO INSUFICIENTE: Requer 10 OPACOINS");
            return;
        }
        pet.coins -= 10;
        pet.interactions = (pet.interactions || 0) + 1;
    }

    switch (type) {
        case 'feed':
            if (pet.stage === 'EGG') {
                showTemporaryMsg("Ovos não podem ser alimentados! Aguarde a eclosão.");
                pet.coins += 10; // Refund
                return;
            }
            pet.energy = Math.min(100, pet.energy + 25);
            break;
        case 'play':
            openGame();
            return;
        case 'dino':
            openDino();
            return;
        case 'patch':
            openFixer();
            return;
        case 'sleep':
            pet.isSleeping = !pet.isSleeping;
            break;
    }
    hideThought();
    updateUI();
    savePet();
}

function confirmName() {
    const input = document.getElementById('nameInput');
    const name = input.value.trim().toUpperCase();
    if (name) {
        pet.name = name;
        document.getElementById('namingOverlay').style.display = 'none';
        updateUI();
        savePet();
        showTemporaryMsg(`SISTEMA: PROTOCOLO ${name} REGISTRADO.`);
    } else {
        showTemporaryMsg("ERRO: Identificador inválido.");
    }
}

function resetProtocol() {
    localStorage.removeItem('opa_gotchi_save');
    location.reload();
}

function claimCoins() {
    const now = Date.now();
    const waitTime = 24 * 60 * 60 * 1000; // 24 hours
    const nextClaim = (pet.lastCoinClaim || 0) + waitTime;

    if (now >= nextClaim) {
        pet.coins += 100;
        pet.lastCoinClaim = now;
        showTemporaryMsg("SUCESSO: +100 OPACOINS COLETADOS!");
        updateUI();
        savePet();
    } else {
        showTemporaryMsg("ERRO: Protocolo de recarga em andamento.");
    }
}

function registerTranslation() {
    pet.translationCount = (pet.translationCount || 0) + 1;
    if (pet.translationCount % 10 === 0) {
        pet.coins += 30;
        showTemporaryMsg("BÔNUS TRADUTOR: +30 OPACOINS!");
        updateUI();
        savePet();
    }
}

// --- Simulation Logic ---
function checkEvolution() {
    const inter = pet.interactions || 0;

    if (pet.stage === 'EGG' && pet.age > 100 && inter > 5) {
        pet.stage = 'LEXER_BABY';
        showTemporaryMsg("O ovo do protocolo eclodiu!");
    } else if (pet.stage === 'LEXER_BABY' && pet.age > 300 && inter > 20) {
        pet.stage = 'PROTOCOL_GUARDIAN';
        showTemporaryMsg("A entidade atingiu o nível de Guardião!");
    } else if (pet.stage === 'PROTOCOL_GUARDIAN' && pet.age > 600 && inter > 50) {
        pet.stage = 'SYNTAX_KNIGHT';
        showTemporaryMsg("Evolução detectada: PROTOCOL_GUARDIAN -> SYNTAX_KNIGHT!");
    } else if (pet.stage === 'SYNTAX_KNIGHT' && pet.age > 1000 && inter > 100) {
        pet.stage = 'NODE_WIZARD';
        showTemporaryMsg("Evolução detectada: SYNTAX_KNIGHT -> NODE_WIZARD!");
    } else if (pet.stage === 'NODE_WIZARD' && pet.age > 2000 && inter > 200) {
        pet.stage = 'QUANTUM_MASTER';
        showTemporaryMsg("ALERTA: Entidade atingiu o estado QUANTUM_MASTER!");
    }
}

function generateThought() {
    let msg = "";
    if (pet.energy < 30) msg = OPA_MESSAGES.hunger;
    else if (pet.mood < 30) msg = OPA_MESSAGES.bored;
    else if (pet.stability < 30) msg = OPA_MESSAGES.sick;

    if (msg) {
        pet.thoughts = msg;
        const bubble = document.getElementById('thoughtBubble');
        if (bubble) {
            bubble.textContent = msg;
            bubble.style.display = 'block';
        }
    }
}

function hideThought() {
    const bubble = document.getElementById('thoughtBubble');
    if (bubble) bubble.style.display = 'none';
}

// --- UI Rendering ---
function updateUI() {
    if (pet.isDead) {
        document.getElementById('deathOverlay').style.display = 'flex';
    }

    // Fill bars
    document.getElementById('barEnergy').style.width = pet.energy + "%";
    document.getElementById('barMood').style.width = pet.mood + "%";
    document.getElementById('barStability').style.width = pet.stability + "%";

    // Labels
    document.getElementById('displayName').textContent = pet.name || "ENTIDADE_ANONIMA";
    document.getElementById('coinCount').textContent = Math.floor(pet.coins || 0);
    const blackopaCoins = document.getElementById('blackopaCoinCount');
    if (blackopaCoins) blackopaCoins.textContent = Math.floor(pet.coins || 0);
    const linCoins = document.getElementById('linguopaCoinCount');
    if (linCoins) linCoins.textContent = Math.floor(pet.coins || 0);
    document.getElementById('statStage').textContent = pet.stage;
    document.getElementById('statAge').textContent = Math.floor(pet.age / 10);

    // Dino button visibility
    const btnDino = document.getElementById('btnDino');
    if (btnDino) btnDino.style.display = pet.stage === 'EGG' ? 'none' : 'inline-block';

    // Interaction count display
    const counter = document.getElementById('interactionSpan');
    if (counter) counter.textContent = ` | INTERAÇÕES: ${pet.interactions || 0}`;

    // Claim Button logic
    const btnClaim = document.getElementById('btnClaim');
    const timerClaim = document.getElementById('claimTimer');
    if (btnClaim && timerClaim) {
        const now = Date.now();
        const nextClaim = (pet.lastCoinClaim || 0) + (24 * 60 * 60 * 1000);
        const diff = nextClaim - now;

        if (diff <= 0) {
            btnClaim.disabled = false;
            btnClaim.textContent = "COLETAR (100)";
            timerClaim.textContent = "DISPONÍVEL";
        } else {
            btnClaim.disabled = true;
            const h = Math.floor(diff / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            btnClaim.textContent = "RECARREGANDO";
            timerClaim.textContent = `${h}h ${m}m ${s}s`;
        }
    }

    // ASCII Pet
    document.getElementById('petCanvas').textContent = PET_ASCII[pet.stage] + (pet.isSleeping ? "\n   Zzz..." : "");
}

function showTemporaryMsg(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.style.display = "block";
    setTimeout(() => toast.style.display = "none", 3000);
}

// --- Persistence ---
function savePet() {
    localStorage.setItem('opa_gotchi_save', JSON.stringify(pet));
}

function loadPet() {
    const save = localStorage.getItem('opa_gotchi_save');
    if (save) {
        pet = JSON.parse(save);
    }
}


// --- Protocol Optimizer Mini-game ---
let gameTimer = null;
let gameActive = false;
let gameScore = 0;
let timeLeft = 10;

function openGame() {
    const overlay = document.getElementById('gameOverlay');
    if (overlay) overlay.style.display = 'flex';
    resetGame();
}

function resetGame() {
    gameScore = 0;
    timeLeft = 10;
    gameActive = false;
    document.getElementById('timeVal').textContent = timeLeft;
    const board = document.getElementById('gameBoard');
    board.innerHTML = '';
    for (let i = 0; i < 9; i++) {
        const btn = document.createElement('div');
        btn.className = 'bit-btn';
        btn.id = `bit-${i}`;
        btn.textContent = Math.random() > 0.5 ? '0' : '1';
        btn.onclick = () => catchBit(i);
        board.appendChild(btn);
    }
}

function startGame() {
    if (gameActive) return;
    gameActive = true;
    gameScore = 0;
    timeLeft = 10;
    spawnBit();
    gameTimer = setInterval(() => {
        timeLeft--;
        document.getElementById('timeVal').textContent = timeLeft;
        if (timeLeft <= 0) endGame();
    }, 1000);
}

function spawnBit() {
    if (!gameActive) return;
    // Clear all
    document.querySelectorAll('.bit-btn').forEach(b => {
        b.classList.remove('active');
        b.textContent = Math.random() > 0.5 ? '0' : '1';
    });
    // Pick random
    const idx = Math.floor(Math.random() * 9);
    const target = document.getElementById(`bit-${idx}`);
    target.classList.add('active');
    target.textContent = '!';
}

function catchBit(idx) {
    if (!gameActive) return;
    const target = document.getElementById(`bit-${idx}`);
    if (target.classList.contains('active')) {
        gameScore++;
        timeLeft += 0.5; // +0.5s bonus
        document.getElementById('timeVal').textContent = Math.floor(timeLeft);
        spawnBit();
    }
}

function endGame() {
    gameActive = false;
    clearInterval(gameTimer);
    const overlay = document.getElementById('gameOverlay');
    if (overlay) overlay.style.display = 'none';

    const moodBoost = gameScore * 5;
    pet.mood = Math.min(100, pet.mood + moodBoost);
    pet.energy = Math.max(0, pet.energy - 5);

    // Reward Coins
    let reward = 0;
    if (gameScore > 0) {
        reward = gameScore * 2; // Nerfed from 5 to 2
        pet.coins += reward;
    }

    showTemporaryMsg(`Otimização completa! Score: ${gameScore}. Mood +${moodBoost}%. Reward: +${reward} OPACOINS`);

    hideThought();
    updateUI();
    savePet();
}

// --- Dino Runner Mini-game ---
let dinoTimer = null;
let dinoActive = false;
let dinoPos = 0;
let isSpacePressed = false; // Hold check
let obstacles = [];
let dinoScore = 0;
let dinoSpeed = 100; // Faster tick

function openDino() {
    const overlay = document.getElementById('dinoOverlay');
    if (overlay) overlay.style.display = 'flex';
    resetDino();
}

function resetDino() {
    dinoActive = false;
    dinoScore = 0;
    dinoPos = 0;
    obstacles = [{ x: 20, type: '▲' }, { x: 35, type: '▲' }];
    document.getElementById('dinoScoreVal').textContent = "0";
    dinoSpeed = 100;
    drawDino();
}

function startDino() {
    if (dinoActive) return;
    dinoActive = true;
    if (dinoTimer) clearInterval(dinoTimer);
    dinoTimer = setInterval(tickDino, dinoSpeed);
}

function jumpDino() {
    if (!dinoActive || dinoPos > 0) return;
    dinoPos = 1;
    drawDino();
    setTimeout(() => {
        dinoPos = 0;
        if (dinoActive) drawDino();
    }, 600);
}

document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && dinoActive && !isSpacePressed) {
        e.preventDefault();
        isSpacePressed = true;
        jumpDino();
    }
});

document.addEventListener('keyup', (e) => {
    if (e.code === 'Space') {
        isSpacePressed = false;
    }
});

function tickDino() {
    if (!dinoActive) return;

    // Move obstacles
    obstacles.forEach(o => o.x--);

    // PRECISION COLLISION - Dino is at index 4 (3 chars wide)
    const dinoHitbox = [3, 4, 5];
    const collision = obstacles.find(o => {
        // Obstacle width is handled by checking if o.x overlaps with dinoHitbox
        const obsRange = [o.x];
        if (o.type.length > 1) obsRange.push(o.x + 1);
        return obsRange.some(ox => dinoHitbox.includes(ox));
    });

    if (collision && dinoPos === 0) {
        endDino(false);
        return;
    }

    // Clean and spawn
    if (obstacles[0] && obstacles[0].x < -2) {
        obstacles.shift();
        const lastX = obstacles.length > 0 ? obstacles[obstacles.length - 1].x : 10;
        obstacles.push({
            x: lastX + Math.floor(Math.random() * 10) + 15,
            type: Math.random() > 0.7 ? '▲▲' : '▲'
        });
        dinoScore++;
        document.getElementById('dinoScoreVal').textContent = dinoScore;

        // Speed up
        if (dinoScore % 10 === 0 && dinoSpeed > 50) {
            clearInterval(dinoTimer);
            dinoSpeed -= 5;
            dinoTimer = setInterval(tickDino, dinoSpeed);
        }
    }

    drawDino();
}

function drawDino() {
    const screen = document.getElementById('dinoScreen');
    const width = window.innerWidth <= 768 ? 25 : 35; // Smaller screen for mobile village
    let groundLine = Array(width).fill('_');
    let dinoLine = Array(width).fill(' ');

    // Draw obstacles on ground line
    obstacles.forEach(o => {
        for (let i = 0; i < o.type.length; i++) {
            const pos = o.x + i;
            if (pos >= 0 && pos < width) groundLine[pos] = o.type[i];
        }
    });

    // Dino Position Fixed at Index 4
    const dinoChar = dinoPos === 0 ? '(o)' : '^(o)^';
    const targetLine = dinoPos === 0 ? groundLine : dinoLine;
    const dinoIdx = 4; // Shifted for smaller char

    // Splice dino into the target line
    for (let i = 0; i < dinoChar.length; i++) {
        if (dinoIdx + i < width) targetLine[dinoIdx + i] = dinoChar[i];
    }

    const color = dinoPos === 0 ? 'var(--glow)' : 'var(--energy)';

    screen.innerHTML = `<div style="color:var(--accent); letter-spacing:4px; font-weight:bold; width:100%;">` +
        `<div style="height:35px; color:${color}; opacity:${dinoPos === 0 ? 0 : 1}">${dinoLine.join('')}</div>` +
        `<div>${groundLine.join('')}</div>` +
        `</div>`;
}


function endDino(win) {
    dinoActive = false;
    clearInterval(dinoTimer);

    const moodBoost = Math.min(30, dinoScore * 2);
    pet.mood = Math.min(100, pet.mood + moodBoost);

    let reward = Math.floor(dinoScore * 1); // Nerfed from 3 to 1
    pet.coins += reward;

    showTemporaryMsg(`FATAL ERROR: COLISÃO DETECTADA.\nScore: ${dinoScore}. Bonus: +${reward} OPACOINS`);

    setTimeout(() => {
        document.getElementById('dinoOverlay').style.display = 'none';
        updateUI();
        savePet();
    }, 1500);
}



// --- FIXADOR.BIT LOGIC ---
let fixerActive = false;
let fixerTimer = null;
let fixerScore = 0;
let fixerLevel = 0; // Index for current letter
let fixerShip = { x: 50, y: 80 };
let fixerBullets = [];
let fixerAsteroids = [];
let fixerKeys = {};

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function openFixer() {
    document.getElementById('fixerOverlay').style.display = 'flex';
    document.getElementById('fixerBoard').innerHTML = '';
    fixerActive = false;
    fixerScore = 0;
    fixerLevel = 0;
    document.getElementById('fixerScoreVal').textContent = "0";
    document.getElementById('fixerAlpha').textContent = "A";
}

function startFixer() {
    if (fixerActive) return;
    fixerActive = true;
    fixerScore = 0;
    fixerLevel = 0;
    fixerShip = { x: 50, y: 80 };
    fixerBullets = [];
    fixerAsteroids = [];
    
    document.getElementById('btnStartFixer').style.display = 'none';
    
    requestAnimationFrame(tickFixer);
    spawnAsteroid();
}

function spawnAsteroid() {
    if (!fixerActive) return;
    
    const char = ALPHABET[fixerLevel];
    const opaChar = typeof codificar === 'function' ? codificar(char.toLowerCase()) : char;
    
    // Pick a random side to spawn from: 0-Top, 1-Bottom, 2-Left, 3-Right
    const side = Math.floor(Math.random() * 4);
    let x, y;
    
    if (side === 0) { x = Math.random() * 100; y = -10; }
    else if (side === 1) { x = Math.random() * 100; y = 110; }
    else if (side === 2) { x = -10; y = Math.random() * 100; }
    else { x = 110; y = Math.random() * 100; }

    fixerAsteroids.push({
        x: x,
        y: y,
        vx: 0,
        vy: 0,
        speed: 0.3 + (fixerLevel * 0.05),
        char: opaChar,
        targetChar: char,
        repaired: false,
        id: Date.now() + Math.random()
    });
    
    const nextSpawn = Math.max(800, 2500 - (fixerLevel * 150));
    setTimeout(spawnAsteroid, nextSpawn);
}

// Global Key tracking for multi-key support
document.addEventListener('keydown', (e) => {
    fixerKeys[e.key.toLowerCase()] = true;
    fixerKeys[e.code] = true; // For Arrow keys
});

document.addEventListener('keyup', (e) => {
    fixerKeys[e.key.toLowerCase()] = false;
    fixerKeys[e.code] = false;
});

function tickFixer() {
    if (!fixerActive) return;

    // 1. Ship Movement (WASD)
    const speed = 1.5;
    if (fixerKeys['w'] && fixerShip.y > 5) fixerShip.y -= speed;
    if (fixerKeys['s'] && fixerShip.y < 95) fixerShip.y += speed;
    if (fixerKeys['a'] && fixerShip.x > 5) fixerShip.x -= speed;
    if (fixerKeys['d'] && fixerShip.x < 95) fixerShip.x += speed;

    // 2. Shooting (Arrows) - Diagonal Support
    const up = fixerKeys['ArrowUp'], down = fixerKeys['ArrowDown'], left = fixerKeys['ArrowLeft'], right = fixerKeys['ArrowRight'];
    if (up || down || left || right) {
        const now = Date.now();
        if (!fixerShip.lastShoot || now - fixerShip.lastShoot > 200) {
            let svx = 0, svy = 0;
            if (up) svy -= 1;
            if (down) svy += 1;
            if (left) svx -= 1;
            if (right) svx += 1;
            
            // Normalize
            const mag = Math.hypot(svx, svy);
            const bvx = (svx / mag) * 3;
            const bvy = (svy / mag) * 3;
            
            fixerBullets.push({ x: fixerShip.x, y: fixerShip.y, vx: bvx, vy: bvy });
            fixerShip.lastShoot = now;
            // Calculate rotation based on bullet direction (+90 because 'A' points up)
            fixerShip.rotation = Math.atan2(svy, svx) * (180 / Math.PI) + 90;
        }
    }

    // 3. Move Bullets
    fixerBullets.forEach(b => {
        b.x += b.vx;
        b.y += b.vy;
    });
    fixerBullets = fixerBullets.filter(b => b.x > -5 && b.x < 105 && b.y > -5 && b.y < 105);

    // 4. Move Asteroids (Homing) & Collisions
    fixerAsteroids.forEach(a => {
        if (!a.repaired) {
            // Calculate homing vector
            const dx = fixerShip.x - a.x;
            const dy = fixerShip.y - a.y;
            const dist = Math.hypot(dx, dy);
            
            // Smoothly adjust velocity towards ship
            const targetVx = (dx / dist) * a.speed;
            const targetVy = (dy / dist) * a.speed;
            
            a.vx = a.vx * 0.95 + targetVx * 0.05;
            a.vy = a.vy * 0.95 + targetVy * 0.05;
        }
        
        a.x += a.vx;
        a.y += a.vy;
        
        // Ship collision
        const distToShip = Math.hypot(a.x - fixerShip.x, a.y - fixerShip.y);
        if (distToShip < 5 && !a.repaired) {
            endFixer();
            return;
        }

        // Bullet collision
        fixerBullets.forEach((b, bIdx) => {
            const dist = Math.hypot(a.x - b.x, a.y - b.y);
            if (dist < 8) {
                if (!a.repaired) {
                    a.repaired = true;
                    a.char = a.targetChar;
                    a.vy *= 2; // Falls faster when "repaired"
                    fixerScore++;
                    document.getElementById('fixerScoreVal').textContent = fixerScore;
                    
                    // Difficulty increase
                    if (fixerScore % 5 === 0 && fixerLevel < 25) {
                        fixerLevel++;
                        document.getElementById('fixerAlpha').textContent = ALPHABET[fixerLevel];
                    }
                }
                fixerBullets.splice(bIdx, 1);
            }
        });
    });
    
    // Cleanup offscreen asteroids
    fixerAsteroids = fixerAsteroids.filter(a => a.y < 110);

    drawFixer();
    if (fixerActive) requestAnimationFrame(tickFixer);
}

function drawFixer() {
    const board = document.getElementById('fixerBoard');
    let html = ``;

    // Draw Ship with rotation
    const rotate = fixerShip.rotation || 0;
    html += `<div class="fixer-entity fixer-ship" style="left:${fixerShip.x}%; top:${fixerShip.y}%; transform: translate(-50%, -50%) rotate(${rotate}deg)">A</div>`;

    // Draw Bullets
    fixerBullets.forEach(b => {
        html += `<div class="fixer-entity fixer-bullet" style="left:${b.x}%; top:${b.y}%">∙</div>`;
    });

    // Draw Asteroids
    fixerAsteroids.forEach(a => {
        html += `<div class="fixer-entity fixer-asteroid ${a.repaired ? 'repaired' : ''}" style="left:${a.x}%; top:${a.y}%">${a.char}</div>`;
    });

    board.innerHTML = html;
}

function endFixer() {
    fixerActive = false;
    const stabilityBoost = Math.min(40, fixerScore * 2);
    pet.stability = Math.min(100, pet.stability + stabilityBoost);
    
    let reward = Math.floor(fixerScore * 1);
    pet.coins += reward;

    showTemporaryMsg(`SISTEMA REPARADO: Parcialmente.\nReparos: ${fixerScore}. Estabilidade: +${stabilityBoost}%`);

    setTimeout(() => {
        document.getElementById('fixerOverlay').style.display = 'none';
        document.getElementById('btnStartFixer').style.display = 'block';
        updateUI();
        savePet();
    }, 2000);
}


// Start on load
window.addEventListener('load', () => {
    if (document.getElementById('quest')) {
        init();
    }
});

