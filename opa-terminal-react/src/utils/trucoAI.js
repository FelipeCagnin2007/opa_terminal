import { getCardPower, getManilhaValue } from './trucoLogic';

// ─── Hand analysis helpers ───────────────────────────────────────────────────

/**
 * Returns a sorted array of card powers for the given hand, highest first.
 */
const analyzeHand = (hand, vira) =>
    hand
        .map((card, index) => ({ index, card, power: getCardPower(card, vira) }))
        .sort((a, b) => b.power - a.power);

const isManilha = (card, vira) =>
    vira && card.value === getManilhaValue(vira.value);

const countManilhas = (hand, vira) =>
    hand.filter(c => isManilha(c, vira)).length;

// ─── getCPUMove ───────────────────────────────────────────────────────────────
/**
 * Decides which card the CPU should play.
 * Returns { cardIndex: number }
 *
 * Strategy (Truco Paulista standard):
 *  - First to play in a round → play second-strongest (keep best for later)
 *  - Partner already winning → play lowest to save strong cards
 *  - Need to beat opponent → use weakest card that still wins
 *  - Cannot win → play weakest (cut losses)
 */
export const getCPUMove = (hand, table, vira, gameState, myPos) => {
    if (!hand || hand.length === 0) return null;

    const myTeam = myPos % 2 === 0 ? 'ours' : 'theirs';
    const sorted = analyzeHand(hand, vira); // highest first

    // ── No card on the table yet ──
    if (!table || table.length === 0) {
        // Opening play: use second-strongest on round 0 (save best),
        // weakest on rounds 1+ (already know the context)
        const target = gameState.currentRound === 0
            ? (sorted[1] ?? sorted[0])   // second best or only card
            : sorted[sorted.length - 1]; // weakest
        return { cardIndex: target.index };
    }

    // ── Cards already on table ──
    const opponentCards = table.filter(p => p.pos % 2 !== myPos % 2);
    const partnerCards  = table.filter(p => p.pos % 2 === myPos % 2);

    const bestOpponentPower = opponentCards.length > 0
        ? Math.max(...opponentCards.map(p => getCardPower(p.card, vira)))
        : -1;

    const partnerIsLeading =
        partnerCards.length > 0 &&
        Math.max(...partnerCards.map(p => getCardPower(p.card, vira))) > bestOpponentPower;

    if (partnerIsLeading) {
        // Partner is winning — play weakest to conserve
        return { cardIndex: sorted[sorted.length - 1].index };
    }

    if (bestOpponentPower === -1) {
        // Only partner has played (no opponent yet) — play weakest
        return { cardIndex: sorted[sorted.length - 1].index };
    }

    // Try to beat the best opponent card with the weakest possible winner
    const killers = sorted
        .filter(h => h.power > bestOpponentPower)
        .sort((a, b) => a.power - b.power); // weakest killer first

    if (killers.length > 0) {
        return { cardIndex: killers[0].index };
    }

    // Can't win — play weakest
    return { cardIndex: sorted[sorted.length - 1].index };
};

// ─── shouldCPUCallTruco ───────────────────────────────────────────────────────
/**
 * Decides whether the CPU should call Truco BEFORE playing its card.
 *
 * Rules:
 *  - Only on the CPU's own turn (when it's about to play)
 *  - Only if it's not already the challenger team
 *  - Only if handPoints < 12
 *  - Probability based on actual hand strength
 */
export const shouldCPUCallTruco = (hand, vira, gameState, myPos) => {
    if (!hand || hand.length === 0) return false;

    const myTeam = myPos % 2 === 0 ? 'ours' : 'theirs';
    const lastChallengerTeam = gameState.trucoChallenge?.challengerTeam;

    // Can't re-raise if we were the last to challenge
    if (lastChallengerTeam === myTeam) return false;

    // Can't go above 12
    if (gameState.handPoints >= 12) return false;

    // Don't shout if a challenge is already pending
    if (gameState.trucoChallenge?.status === 'pending') return false;

    const manilhas = countManilhas(hand, vira);
    const powers   = hand.map(c => getCardPower(c, vira));
    const maxPower = Math.max(...powers);
    const round    = gameState.currentRound ?? 0;

    // High chance: 2+ manilhas
    if (manilhas >= 2) return Math.random() < 0.75;

    // Good chance: 1 manilha + strong card
    if (manilhas === 1 && maxPower >= 8) return Math.random() < 0.45;

    // Medium: 1 manilha alone
    if (manilhas === 1) return Math.random() < 0.25;

    // Lower: two strong non-manilha cards (8 = '2', 9 = '3')
    const strongCards = powers.filter(p => p >= 8).length;
    if (strongCards >= 2) return Math.random() < 0.15;

    // Rare bluff on round 0 only
    if (round === 0 && maxPower >= 6) return Math.random() < 0.04;

    return false;
};

// ─── autoRespondToTruco ───────────────────────────────────────────────────────
/**
 * Decides how the CPU responds to a Truco challenge.
 * Returns 'ACCEPT' | 'FOLD' | 'RAISE'
 *
 * Conservative thresholds — bots shouldn't fold too easily or accept blindly.
 */
export const autoRespondToTruco = (hand, vira, gameState, myPos) => {
    if (!hand || hand.length === 0) return 'FOLD';

    const powers   = hand.map(c => getCardPower(c, vira));
    const maxPower = Math.max(...powers);
    const avgPower = powers.reduce((a, b) => a + b, 0) / powers.length;
    const manilhas = countManilhas(hand, vira);

    const myTeam       = myPos % 2 === 0 ? 'ours' : 'theirs';
    const roundWinners = gameState.roundPoints ?? [];
    const teamIndex    = myTeam === 'ours' ? 1 : 2;
    const wonRound1    = roundWinners[0] === teamIndex;

    // ── Strong enough to raise ──
    if (gameState.handPoints < 12) {
        if (manilhas >= 2 && Math.random() < 0.6) return 'RAISE';
        if (manilhas === 1 && maxPower >= 9 && Math.random() < 0.25) return 'RAISE';
    }

    // ── Accept conditions ──
    if (manilhas >= 1) return 'ACCEPT';                       // always accept with manilha
    if (maxPower >= 9) return 'ACCEPT';                       // has '3'
    if (maxPower >= 8 && wonRound1) return 'ACCEPT';          // up with a '2' after winning round 1
    if (maxPower >= 8 && Math.random() < 0.55) return 'ACCEPT'; // has '2', coin flip
    if (avgPower >= 6 && wonRound1) return 'ACCEPT';          // decent hand AND winning
    if (avgPower >= 5 && Math.random() < 0.25) return 'ACCEPT'; // mediocre hand, small chance

    return 'FOLD';
};
