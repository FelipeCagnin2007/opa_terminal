import { getCardPower } from './trucoLogic';

/**
 * Advanced OPA AI for Truco
 */
export const getCPUMove = (hand, table, vira, gameState, myPos) => {
    if (!hand || hand.length === 0) return null;

    const myTeam = (myPos % 2 === 0) ? 'ours' : 'theirs';
    
    // 1. Analyze the table
    let bestCardOnTable = null;
    let maxPowerOnTable = -1;
    let partnerCard = null;

    if (table && table.length > 0) {
        table.forEach(play => {
            const power = getCardPower(play.card, vira);
            const playTeam = (play.pos % 2 === 0) ? 'ours' : 'theirs';
            
            if (power > maxPowerOnTable) {
                maxPowerOnTable = power;
                bestCardOnTable = play;
            }
            if (playTeam === myTeam) {
                partnerCard = play;
            }
        });
    }

    // 2. Prepare hand with power info
    const handWithPower = hand.map((card, index) => ({
        index,
        card,
        power: getCardPower(card, vira)
    }));
    handWithPower.sort((a, b) => a.power - b.power);

    let selectedCard = null;

    // 3. Strategy Logic
    if (maxPowerOnTable === -1) {
        // AI is first to play. Play the second strongest if first round, else weakest.
        selectedCard = gameState.currentRound === 0 ? (handWithPower[1] || handWithPower[0]) : handWithPower[0];
    } else {
        const bestOpponentPower = table
            .filter(p => (p.pos % 2 !== myPos % 2))
            .reduce((max, p) => Math.max(max, getCardPower(p.card, vira)), -1);
        
        const partnerIsWinning = partnerCard && getCardPower(partnerCard.card, vira) > bestOpponentPower;

        if (partnerIsWinning) {
            // Partner is already winning, throw the weakest card (economize)
            selectedCard = handWithPower[0];
        } else {
            // Need to beat the opponent
            const killers = handWithPower.filter(h => h.power > bestOpponentPower);
            if (killers.length > 0) {
                // Use the weakest killer possible
                selectedCard = killers[0];
            } else {
                // Cannot win, throw the weakest
                selectedCard = handWithPower[0];
            }
        }
    }

    // 4. Truco Logic (More sophisticated)
    const hasManilha = handWithPower.some(h => h.power >= 100);
    const topPower = handWithPower[handWithPower.length-1].power;
    let shoutsTruco = false;

    // Only consider shouting if it's our team's turn to shout
    const lastChallengerTeam = gameState.trucoChallenge?.challengerTeam;
    if (lastChallengerTeam !== myTeam && gameState.handPoints < 12) {
        // High probability if has strong cards
        if (hasManilha && Math.random() < 0.6) shoutsTruco = true;
        else if (topPower >= 8 && Math.random() < 0.3) shoutsTruco = true; // 2 or 3
        else if (gameState.currentRound === 0 && Math.random() < 0.1) shoutsTruco = true; // Bluff early
    }

    return { cardIndex: selectedCard.index, shoutsTruco };
};

export const autoRespondToTruco = (hand, vira, gameState, myPos) => {
    if (!hand || hand.length === 0) return 'FOLDED';
    
    const handWithPower = hand.map(card => getCardPower(card, vira));
    const maxPower = Math.max(...handWithPower);
    const avgPower = handWithPower.reduce((a, b) => a + b, 0) / handWithPower.length;
    
    // Thresholds
    // If I have a Manilha, always accept
    if (maxPower >= 100) return 'ACCEPTED';
    
    // If I have high cards (3 or 2)
    if (maxPower >= 8) return 'ACCEPTED';
    
    // If we already won the first round
    const myTeam = (myPos % 2 === 0) ? 'ours' : 'theirs';
    const firstRoundWinner = gameState.roundPoints?.[0];
    const teamIndex = myTeam === 'ours' ? 1 : 2;
    
    if (firstRoundWinner === teamIndex && avgPower > 4) return 'ACCEPTED';

    // Random chance based on card strength (bluff detection/randomness)
    if (avgPower > 5 && Math.random() < 0.5) return 'ACCEPTED';
    
    return 'FOLDED';
};

