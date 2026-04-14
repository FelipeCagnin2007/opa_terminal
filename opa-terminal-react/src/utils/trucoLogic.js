/**
 * OPA TRUCO ENGINE v1.0
 * Regras: Truco Paulista
 */

export const CARD_VALUES = ['4', '5', '6', '7', 'Q', 'J', 'K', 'A', '2', '3'];
export const SUIT_POWER = { 'Paus': 4, 'Copas': 3, 'Espadas': 2, 'Ouros': 1 };

export const getManilhaValue = (viraValue) => {
    const idx = CARD_VALUES.indexOf(viraValue);
    return CARD_VALUES[(idx + 1) % CARD_VALUES.length];
};

export const getCardPower = (card, vira) => {
    const manilhaValue = getManilhaValue(vira.value);
    const isManilha = card.value === manilhaValue;
    
    if (isManilha) {
        // Manilhas are ranked by suit
        return 100 + SUIT_POWER[card.suit];
    }
    
    // Normal cards ranked by CARD_VALUES index
    return CARD_VALUES.indexOf(card.value);
};

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

    return isDraw ? { draw: true } : winner;
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
        score: currentState.score || { ours: 0, theirs: 0 },
        handPoints: 1,
        roundPoints: [],
        currentRound: 0,
        currentTurn: positions[0], // Player 0 starts
        trucoChallenge: null,
        winner: null
    };
};
