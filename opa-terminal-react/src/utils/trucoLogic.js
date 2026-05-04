/**
 * OPA TRUCO ENGINE v2.1
 * Regras: Truco Paulista (Vira + 1)
 */

export const CARD_VALUES = ['4', '5', '6', '7', 'Q', 'J', 'K', 'A', '2', '3'];
export const SUIT_POWER = { 'Paus': 4, 'Copas': 3, 'Espadas': 2, 'Ouros': 1 };

/**
 * Gets the Manilha card value based on the vira.
 */
export const getManilhaValue = (viraValue) => {
    const idx = CARD_VALUES.indexOf(viraValue);
    return CARD_VALUES[(idx + 1) % CARD_VALUES.length];
};

/**
 * Calculates the absolute power of a card.
 * Manilhas: 100 + suit power
 * Normal cards: index in CARD_VALUES
 */
export const getCardPower = (card, vira) => {
    if (!card || !vira) return -1;
    const manilhaValue = getManilhaValue(vira.value);
    const isManilha = card.value === manilhaValue;
    
    if (isManilha) {
        return 100 + (SUIT_POWER[card.suit] || 0);
    }
    
    return CARD_VALUES.indexOf(card.value);
};

/**
 * Calculates the EFFECTIVE (context-aware) power of a card, accounting for
 * stronger cards that have already been played (card memory / card counting).
 *
 * For manilhas: each stronger manilha already in the discard pile increases
 * this card's effective rank (e.g., Copas becomes "effective Zap" when Zap is gone).
 * For regular cards: absolute power is unchanged (rank is fixed).
 *
 * @param {Object} card        - The card to evaluate {value, suit}
 * @param {Object} vira        - The vira card {value, suit}
 * @param {Array}  playedCards - All cards discarded in previous rounds
 * @returns {number} effective power (same scale as getCardPower, but dynamically adjusted)
 */
export const getEffectivePower = (card, vira, playedCards = []) => {
    const basePower = getCardPower(card, vira);
    if (!vira || basePower < 100) return basePower; // regular card: no change

    const manilhaValue = getManilhaValue(vira.value);
    const mySuitPower  = SUIT_POWER[card.suit] || 0;

    // Count stronger manilhas (higher suit power) already played
    const strongerManilhasGone = playedCards.filter(
        c => c.value === manilhaValue && (SUIT_POWER[c.suit] || 0) > mySuitPower
    ).length;

    // Each gone superior manilha upgrades this card's effective rank by 1
    // (Copas with Zap gone = new top card; same base power + 1 per superior gone)
    return basePower + strongerManilhasGone;
};

/**
 * Resolves a single round.
 * @returns {winner_pos: number, draw: boolean}
 */
export const resolveRound = (table, vira) => {
    if (!table || table.length === 0) return null;
    
    let winner = table[0];
    let isDraw = false;

    for (let i = 1; i < table.length; i++) {
        const powerWinner = getCardPower(winner.card, vira);
        const powerCurrent = getCardPower(table[i].card, vira);

        if (powerCurrent > powerWinner) {
            winner = table[i];
            isDraw = false;
        } else if (powerCurrent === powerWinner) {
            isDraw = true;
        }
    }

    return isDraw ? { draw: true } : { winner_pos: winner.pos, player: winner.player };
};

/**
 * Determines the winner of the hand based on round results.
 * roundPoints: array of winners (0=draw, 1=ours, 2=theirs)
 */
export const determineHandWinner = (roundPoints) => {
    const w = roundPoints; // [w1, w2, w3]
    
    // Check for clear 2-win majority
    const team1Wins = w.filter(x => x === 1).length;
    const team2Wins = w.filter(x => x === 2).length;
    if (team1Wins >= 2) return 'ours';
    if (team2Wins >= 2) return 'theirs';

    // Draw logic (Empache)
    if (w[0] === 0) {
        if (w[1] === 1) return 'ours';
        if (w[1] === 2) return 'theirs';
        if (w[1] === 0) { // 1st and 2nd drew
            if (w[2] === 1) return 'ours';
            if (w[2] === 2) return 'theirs';
            if (w[2] === 0) return 'draw'; // Triple draw
        }
    } else {
        // 1st round was NOT a draw
        if (w[1] === 0) return w[0] === 1 ? 'ours' : 'theirs'; // 2nd round drew, winner of 1st wins
        if (w[2] === 0) return w[0] === 1 ? 'ours' : 'theirs'; // 3rd round drew, winner of 1st wins
    }

    // Best of 3 incomplete
    if (w.length === 3) {
        if (team1Wins > team2Wins) return 'ours';
        if (team2Wins > team1Wins) return 'theirs';
    }

    return null;
};

export const createDeck = () => {
    const suits = ['Ouros', 'Espadas', 'Copas', 'Paus'];
    let deck = [];
    CARD_VALUES.forEach(v => suits.forEach(s => deck.push({ value: v, suit: s })));
    
    // Fisher-Yates Shuffle
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
};

export const initializeTrucoState = (currentState, positions) => {
    const deck = createDeck();
    const dealer = currentState.dealer !== undefined ? (currentState.dealer + 1) % 4 : 0;
    
    return {
        ...currentState,
        positions: positions,
        players: Object.values(positions),
        hands: {
            0: deck.splice(0, 3),
            1: deck.splice(0, 3),
            2: deck.splice(0, 3),
            3: deck.splice(0, 3)
        },
        vira: deck.splice(0, 1)[0],
        table: [],
        playedCards: [],          // Card memory: accumulates across all rounds of this hand
        score: currentState.score || { ours: 0, theirs: 0 },
        handPoints: 1,
        roundPoints: [],
        currentRound: 0,
        currentTurn: positions[(dealer + 1) % 4],
        dealer: dealer,
        trucoChallenge: null,
        lastWinner: null,
        winner: null,
        status: 'playing'
    };
};

