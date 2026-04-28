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
 *  - Probability based on actual hand strength (Conservative)
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

    // Very Strong: 2+ manilhas
    if (manilhas >= 2) return Math.random() < 0.45; // reduced from 0.75

    // Strong: 1 manilha + best card (3)
    if (manilhas === 1 && maxPower >= 9 && round > 0) return Math.random() < 0.25;

    // Medium: 1 manilha alone
    if (manilhas === 1 && round === 2) return Math.random() < 0.35; // wait for final round
    
    // Rare bluff on round 0 only
    if (round === 0 && maxPower >= 8) return Math.random() < 0.02; // very rare

    return false;
};

// ─── autoRespondToTruco ───────────────────────────────────────────────────────
/**
 * Decides how the CPU responds to a Truco challenge.
 * Returns 'ACCEPT' | 'FOLD' | 'RAISE'
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

    // ── Raise conditions (Only with extreme strength) ──
    if (gameState.handPoints < 12) {
        if (manilhas >= 2 && Math.random() < 0.15) return 'RAISE';
    }

    // ── Accept conditions (More conservative) ──
    if (manilhas >= 1) return 'ACCEPT';                       
    if (maxPower >= 9 && (wonRound1 || roundWinners.length === 0)) return 'ACCEPT';
    if (maxPower >= 8 && wonRound1 && Math.random() < 0.4) return 'ACCEPT';
    if (avgPower >= 7 && Math.random() < 0.2) return 'ACCEPT';

    return 'FOLD';
};
