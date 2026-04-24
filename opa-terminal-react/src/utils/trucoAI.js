import { getCardPower } from './trucoLogic';

export const getCPUMove = (hand, table, vira, gameState) => {
    if (!hand || hand.length === 0) return null;

    // 1. Find the current card to beat
    let cardToBeat = null;
    let maxPowerOnTable = -1;

    if (table && table.length > 0) {
        table.forEach(play => {
            const power = getCardPower(play.card, vira);
            if (power > maxPowerOnTable) {
                maxPowerOnTable = power;
                cardToBeat = play;
            }
        });
    }

    // 2. Analyze hand
    const handWithPower = hand.map((card, index) => ({
        index,
        card,
        power: getCardPower(card, vira)
    }));

    // Sort hand by power (weakest to strongest)
    handWithPower.sort((a, b) => a.power - b.power);

    let selectedCard = null;

    if (maxPowerOnTable === -1) {
        // AI is first to play or partner won? (Simplified: play middle card or weakest)
        selectedCard = handWithPower[0]; 
    } else {
        // Try to beat the current winner with the weakest card possible
        const winningCard = handWithPower.find(h => h.power > maxPowerOnTable);
        if (winningCard) {
            selectedCard = winningCard;
        } else {
            // Cannot win, throw the weakest
            selectedCard = handWithPower[0];
        }
    }

    // DECISION: Should I Truco?
    // Aggressive AI if has a Manilha (power > 100)
    const hasManilha = handWithPower.some(h => h.power >= 100);
    let shoutsTruco = false;
    
    // Only truco if not already trucoed and has good cards
    if (gameState.handPoints === 1 && hasManilha && Math.random() < 0.3) {
        shoutsTruco = true;
    }

    return { cardIndex: selectedCard.index, shoutsTruco };
};

export const autoRespondToTruco = (hand, vira, gameState) => {
    const handWithPower = hand.map(card => getCardPower(card, vira));
    const maxPower = Math.max(...handWithPower);
    
    // Accept if has at least one strong card or Manilha
    if (maxPower >= 8 || Math.random() < 0.3) return 'ACCEPTED';
    return 'FOLDED';
};
