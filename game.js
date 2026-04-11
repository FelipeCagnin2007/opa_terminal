/**
 * OPA-gotchi - Virtual Protocol Entity
 * A Tamagotchi-style simulation built on the OPA Protocol.
 */

// --- Constants ---
const EVOLUTION_STAGES = ['EGG', 'LEXER_BABY', 'PROTOCOL_GUARDIAN'];

// --- Game State ---
let pet = {
    energy: 100,
    mood: 100,
    stability: 100,
    age: 0,
    stage: 'EGG',
    lastUpdate: Date.now(),
    isSleeping: false,
    thoughts: ""
};

// --- ASCII Forms ---
const PET_ASCII = {
    EGG: "\n   .---.   \n  /     \\  \n |   O   | \n  \\     /  \n   '---'   ",
    LEXER_BABY: "\n    \\^.^/   \n    ( o )   \n     vvv    ",
    PROTOCOL_GUARDIAN: "\n     /\\_/\\     \n    ( o.o )    \n     > ^ <     \n    /     \\    \n   |       |   \n   '-------'   "
};

// --- OPA Thoughts (Encrypted Messages) ---
const OPA_MESSAGES = {
    // "Estou com fome"
    hunger: "oopppa ooopppppa oooppppp a ooooppppa oooopppppa / ooooppppa oooopppa oooopppppa / oooopppa oooppppp a oooopppppa ooopppa oooppppp a",
    // "Preciso de otimização"
    bored: "oopppppa ooopppppa oooppppp a oooppppp a oooppppp a ooopppppa oooppppp a / ooooppppa oooppppp a / ooooppppa ooopppppa ooooppppa oooopppppa ooooppppa oooppppp a oooppppp a ooopppppa ooopppa oooopppppa",
    // "Buffer instável"
    sick: "oopppa ooopppppa oooppppp a oooppppp a oooppppp a oooopppppa / ooopppppa ooooppppa ooooppppa ooopppppa ooopppa ooopppppa oooppppp a ooopppa oooopppppa"
};

// --- Initialization ---
function init() {
    loadPet();
    const now = Date.now();
    const diff = (now - pet.lastUpdate) / 1000; // seconds passed
    
    // Apply background decay (e.g. 1 point every 2 minutes for hunger)
    if (diff > 0) {
        pet.energy = Math.max(0, pet.energy - (diff / 120));
        pet.mood = Math.max(0, pet.mood - (diff / 180));
        pet.stability = Math.max(0, pet.stability - (diff / 240));
    }
    
    updateUI();
    
    // Simulation Tick (Every 5 seconds)
    setInterval(tick, 5000);
}

function tick() {
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
    if (pet.isSleeping && type !== 'sleep') return; // Can't interact while sleeping

    switch(type) {
        case 'feed':
            pet.energy = Math.min(100, pet.energy + 25);
            break;
        case 'play':
            pet.mood = Math.min(100, pet.mood + 30);
            pet.energy = Math.max(0, pet.energy - 5);
            break;
        case 'patch':
            pet.stability = Math.min(100, pet.stability + 20);
            break;
        case 'sleep':
            pet.isSleeping = !pet.isSleeping;
            break;
    }
    hideThought();
    updateUI();
    savePet();
}

// --- Simulation Logic ---
function checkEvolution() {
    if (pet.age > 50 && pet.stage === 'EGG') {
        pet.stage = 'LEXER_BABY';
        showTemporaryMsg("O ovo do protocolo eclodiu!");
    } else if (pet.age > 200 && pet.stage === 'LEXER_BABY') {
        pet.stage = 'PROTOCOL_GUARDIAN';
        showTemporaryMsg("A entidade atingiu o nível de Guardião!");
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
    // Fill bars
    document.getElementById('barEnergy').style.width = pet.energy + "%";
    document.getElementById('barMood').style.width = pet.mood + "%";
    document.getElementById('barStability').style.width = pet.stability + "%";
    
    // Labels
    document.getElementById('statStage').textContent = pet.stage;
    document.getElementById('statAge').textContent = Math.floor(pet.age / 10);
    
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

// Start on load
window.addEventListener('load', () => {
    if (document.getElementById('quest')) {
        init();
    }
});
