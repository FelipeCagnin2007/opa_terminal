/**
 * BLACKOPA - Protocol 21 Blackjack
 */

let deck = [];
let playerHand = [];
let dealerHand = [];
let currentBet = 0;
let blackopaActive = false;

const SUITS = ['♥', '♦', '♣', '♠'];
const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function createDeck() {
    deck = [];
    for (let suit of SUITS) {
        for (let val of VALUES) {
            deck.push({ suit, val });
        }
    }
}

function shuffleDeck() {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
}

function getCardValue(card) {
    if (['J', 'Q', 'K'].includes(card.val)) return 10;
    if (card.val === 'A') return 11; 
    return parseInt(card.val);
}

function calculateScore(hand) {
    let score = 0;
    let aces = 0;
    for (let card of hand) {
        score += getCardValue(card);
        if (card.val === 'A') aces++;
    }
    while (score > 21 && aces > 0) {
        score -= 10;
        aces--;
    }
    return score;
}

function dealBlackopa() {
    if (blackopaActive) return;

    const betInput = document.getElementById('betInput');
    currentBet = parseInt(betInput.value);

    // Validation
    if (isNaN(currentBet) || currentBet < 10) {
        updateBlackopaMsg("ERRO: Aposta mínima 10 OPACOINS.");
        return;
    }

    if (!pet || pet.coins < currentBet) {
        updateBlackopaMsg("ERRO: OPACOINS insuficientes.");
        return;
    }

    // Deduct bet
    pet.coins -= currentBet;
    if (typeof savePet === 'function') savePet();
    if (typeof updateUI === 'function') updateUI();

    deck = [];
    playerHand = [];
    dealerHand = [];
    blackopaActive = true;

    createDeck();
    shuffleDeck();

    // Initial Deal
    playerHand.push(deck.pop());
    dealerHand.push(deck.pop());
    playerHand.push(deck.pop());
    dealerHand.push(deck.pop());

    updateBlackopaMsg("JOGO EM ANDAMENTO...");
    document.getElementById('btnDeal').style.display = 'none';
    document.getElementById('playActions').style.display = 'flex';

    renderBlackopa(false);

    // Immediate Blackjack check
    if (calculateScore(playerHand) === 21) {
        standBlackopa();
    }
}

function hitBlackopa() {
    if (!blackopaActive) return;

    playerHand.push(deck.pop());
    renderBlackopa(false);

    if (calculateScore(playerHand) > 21) {
        endBlackopa("DEBBUSTED! Você estourou o buffer.", "LOSE");
    }
}

function standBlackopa() {
    if (!blackopaActive) return;

    // Dealer AI: Hit until 17
    while (calculateScore(dealerHand) < 17) {
        dealerHand.push(deck.pop());
    }

    renderBlackopa(true);

    const pScore = calculateScore(playerHand);
    const dScore = calculateScore(dealerHand);

    if (dScore > 21) {
        endBlackopa("DEALER BUSTED! Sistema comprometido.", "WIN");
    } else if (pScore > dScore) {
        endBlackopa("VOCÊ VENCEU! Protocolo superado.", "WIN");
    } else if (dScore > pScore) {
        endBlackopa("DEALER VENCEU! Fluxo interrompido.", "LOSE");
    } else {
        endBlackopa("EMPATE! Buffer sincronizado.", "DRAW");
    }
}

function renderBlackopa(showDealer) {
    const pArea = document.getElementById('playerCards');
    const dArea = document.getElementById('dealerCards');
    
    pArea.innerHTML = '';
    dArea.innerHTML = '';

    playerHand.forEach(card => pArea.appendChild(createCardUI(card)));
    
    dealerHand.forEach((card, idx) => {
        if (idx === 1 && !showDealer) {
            dArea.appendChild(createCardUI(card, true));
        } else {
            dArea.appendChild(createCardUI(card));
        }
    });

    document.getElementById('playerScore').textContent = calculateScore(playerHand);
    document.getElementById('dealerScore').textContent = showDealer ? calculateScore(dealerHand) : "?";
}

function createCardUI(card, hidden = false) {
    const div = document.createElement('div');
    div.className = hidden ? 'opa-card dealer-hidden' : 'opa-card';
    if (!hidden) {
        div.innerHTML = `<span>${card.val}</span><span style="font-size:0.8rem">${card.suit}</span>`;
        if (card.suit === '♥' || card.suit === '♦') div.style.color = 'var(--danger)';
    } else {
        div.textContent = '?';
    }
    return div;
}

function updateBlackopaMsg(msg) {
    const status = document.getElementById('jackStatus');
    if (status) status.textContent = msg;
}

function endBlackopa(msg, result) {
    blackopaActive = false;
    updateBlackopaMsg(msg);
    document.getElementById('btnDeal').style.display = 'block';
    document.getElementById('playActions').style.display = 'none';

    if (result === "WIN") {
        pet.coins += currentBet * 2;
        if (typeof showTemporaryMsg === 'function') showTemporaryMsg(`+${currentBet * 2} OPACOINS!`);
    } else if (result === "DRAW") {
        pet.coins += currentBet;
        if (typeof showTemporaryMsg === 'function') showTemporaryMsg("Aposta devolvida.");
    }

    if (typeof savePet === 'function') savePet();
    if (typeof updateUI === 'function') updateUI();
}
