import { getCardPower, getEffectivePower, getManilhaValue, SUIT_POWER } from './trucoLogic';

// ─── Constants ───────────────────────────────────────────────────────────────
// Per-card score ceilings for normalization (0.0–MAX_PER_CARD_SCORE per card)
const MAX_PER_CARD_SCORE = 0.40; // Manilha Zap ceiling

// Suit-specific manilha weight (0.30–0.40)
const MANILHA_SUIT_BONUS = {
    'Paus':    0.40, // Zap — highest
    'Copas':   0.37,
    'Espadas': 0.33,
    'Ouros':   0.30,
};

// ZAP effective power threshold for "mathematically unbeatable" check
const ZAP_BASE_POWER = 104; // 100 + SUIT_POWER['Paus']=4

// ─── Internal helpers ────────────────────────────────────────────────────────

const isManilha = (card, vira) =>
    vira && card.value === getManilhaValue(vira.value);

/**
 * Returns a sorted array of { index, card, power } objects, highest first.
 * Uses getEffectivePower so card memory is reflected in play order.
 */
const analyzeHand = (hand, vira, playedCards = []) =>
    hand
        .map((card, index) => ({
            index,
            card,
            power: getEffectivePower(card, vira, playedCards),
        }))
        .sort((a, b) => b.power - a.power);

// ─── evaluateHand ─────────────────────────────────────────────────────────────
/**
 * Computes a unified hand strength score from 0.0 (trash) to 1.0 (unbeatable).
 *
 * Improvements in v2.1:
 *  - ROUND SCALING: non-manilha cards get higher weight in later rounds
 *    (formula: 0.15 + round/2 * 0.20, capped at 0.35)
 *  - CARD MEMORY: manilha bonus adjusted via getEffectivePower (Copas "becomes Zap" when Zap is gone)
 *  - DRAW CONTEXT: slight bonus when round 1 was a draw (decisive next round)
 *  - SCORE PRESSURE: aggressive/conservative multiplier based on scoreboard gap
 *
 * @param {Array}  hand       - Array of card objects {value, suit}
 * @param {Object} vira       - The vira card {value, suit}
 * @param {Object} gameState  - Full game state (includes currentRound, roundPoints, score, playedCards)
 * @param {number} myPos      - Player's position (0-3)
 * @returns {number} score in [0.0, 1.0]
 */
export const evaluateHand = (hand, vira, gameState, myPos) => {
    if (!hand || hand.length === 0 || !vira) return 0;

    const myTeam     = myPos % 2 === 0 ? 'ours' : 'theirs';
    const theirTeam  = myTeam === 'ours' ? 'theirs' : 'ours';
    const myScore    = gameState?.score?.[myTeam]    ?? 0;
    const theirScore = gameState?.score?.[theirTeam] ?? 0;
    const scoreDiff  = myScore - theirScore;
    const round      = gameState?.currentRound       ?? 0;
    const playedCards = gameState?.playedCards       ?? [];

    // ── ITEM 1: Dynamic round scaling for non-manilha cards ──────────────────
    // In the final round, a '3' is nearly as valuable as a weak manilha.
    // nonManilhaWeight grows from 0.15 (round 0) → 0.25 (round 1) → 0.35 (round 2)
    const nonManilhaWeight = Math.min(0.15 + (round / 2) * 0.20, 0.35);

    // ── ITEM 3: Per-card normalized contribution with card memory ─────────────
    // Manilha contribution uses effective suit bonus (upgraded when stronger ones are gone).
    // Regular card uses round-scaled weight.
    let rawScore = 0;
    for (const card of hand) {
        if (isManilha(card, vira)) {
            // ITEM 3: effective power considers stronger manilhas already played
            const effectivePower  = getEffectivePower(card, vira, playedCards);
            const strongerGone    = effectivePower - getCardPower(card, vira); // upgrade count
            const baseSuitBonus   = MANILHA_SUIT_BONUS[card.suit] ?? 0.30;
            // Each superior manilha gone = +0.03 effective bonus on top of base
            rawScore += Math.min(baseSuitBonus + strongerGone * 0.03, MAX_PER_CARD_SCORE);
        } else {
            const power = getCardPower(card, vira); // 0–9
            rawScore += (power / 9) * nonManilhaWeight;
        }
    }

    // Normalize against maximum possible for this hand size
    const maxPossible = hand.length * MAX_PER_CARD_SCORE;
    let score = Math.min(rawScore / maxPossible, 1.0);

    // ── Round advantage context bonus ─────────────────────────────────────────
    const roundPoints = gameState?.roundPoints ?? [];
    const teamIndex   = myTeam === 'ours' ? 1 : 2;
    const wonRound1   = roundPoints[0] === teamIndex;
    // ITEM 4: draw bonus — "quem ganha a próxima leva" increases hand value slightly
    const drewRound1  = roundPoints[0] === 0 && round >= 1;

    if (wonRound1)  score = Math.min(score + 0.08, 1.0);
    if (drewRound1) score = Math.min(score + 0.04, 1.0);

    // ── Score pressure multipliers ────────────────────────────────────────────
    if (scoreDiff <= -6) score *= 0.88;       // losing badly → conservative
    else if (scoreDiff >= 6) score = Math.min(score * 1.12, 1.0); // winning big → aggressive

    return score;
};

// ─── getCPUMove ───────────────────────────────────────────────────────────────
/**
 * Decides which card the CPU should play.
 * Returns { cardIndex: number }
 *
 * Improvements in v2.1:
 *  - ITEM 1: Round-aware strategy (round 2 = decisive, play strongest/killer)
 *  - ITEM 2: Positional awareness — only "relax" when safe (Pé or partner unbeatable)
 *  - ITEM 3: analyzeHand uses getEffectivePower (card memory in play choice)
 *  - ITEM 4: Draw handling — after round 1 draw, play 2nd strongest (equilibrium)
 */
export const getCPUMove = (hand, table, vira, gameState, myPos) => {
    if (!hand || hand.length === 0) return null;

    const playedCards = gameState?.playedCards ?? [];
    const sorted      = analyzeHand(hand, vira, playedCards); // highest effective power first
    const round       = gameState?.currentRound ?? 0;
    const hscore      = evaluateHand(hand, vira, gameState, myPos);

    // Round context helpers
    const roundPoints  = gameState?.roundPoints ?? [];
    const myTeam       = myPos % 2 === 0 ? 'ours' : 'theirs';
    const teamIndex    = myTeam === 'ours' ? 1 : 2;
    const lostRound0   = roundPoints[0] !== undefined && roundPoints[0] !== teamIndex && roundPoints[0] !== 0;
    const drewRound0   = roundPoints[0] === 0; // ITEM 4: empate no round 1

    // ── No card on the table yet (first to play this round) ──────────────────
    if (!table || table.length === 0) {
        if (round === 0) {
            // Strong hand: save best, play 2nd strongest
            if (hscore >= 0.55 && sorted.length >= 2) return { cardIndex: sorted[1].index };
            // Weak hand: probe with weakest
            return { cardIndex: sorted[sorted.length - 1].index };
        }

        if (round === 1) {
            if (lostRound0) {
                // Must fight to survive: play strongest
                return { cardIndex: sorted[0].index };
            }
            if (drewRound0) {
                // ITEM 4: Empate no round 0 — jogo equilibrado.
                // Play 2nd strongest: not all-in, but show meaningful strength.
                const target = sorted.length >= 2 ? sorted[1] : sorted[0];
                return { cardIndex: target.index };
            }
            // Won round 0: play weakest to conserve
            return { cardIndex: sorted[sorted.length - 1].index };
        }

        // Round 2: decisive — play strongest always
        return { cardIndex: sorted[0].index };
    }

    // ── Cards already on table ────────────────────────────────────────────────
    const opponentCards = table.filter(p => p.pos % 2 !== myPos % 2);
    const partnerCards  = table.filter(p => p.pos % 2 === myPos % 2);

    const bestOpponentPower = opponentCards.length > 0
        ? Math.max(...opponentCards.map(p => getEffectivePower(p.card, vira, playedCards)))
        : -1;

    const partnerBestPower = partnerCards.length > 0
        ? Math.max(...partnerCards.map(p => getEffectivePower(p.card, vira, playedCards)))
        : -Infinity;

    const partnerIsLeading = partnerCards.length > 0 && partnerBestPower > bestOpponentPower;

    // ITEM 2: Positional awareness — compute who plays after AI this round
    const alreadyPlayedPos  = new Set(table.map(p => p.pos));
    // Positions that come after myPos in clockwise order and haven't played yet
    const positionsAfterMe  = [1, 2, 3]
        .map(i => (myPos + i) % 4)
        .filter(p => !alreadyPlayedPos.has(p));
    const opponentsAfterMe  = positionsAfterMe.filter(p => p % 2 !== myPos % 2);

    // Partner's card is unbeatable (effective power = Zap or higher, meaning all stronger manilhas are gone)
    const partnerIsUnbeatable = partnerBestPower >= ZAP_BASE_POWER;

    if (partnerIsLeading) {
        // ITEM 2: Only relax and discard worst if it's SAFE to do so
        const canRelax =
            opponentsAfterMe.length === 0   // Pé: no opponents left after AI
            || partnerIsUnbeatable;          // Partner's card can't be beaten

        if (canRelax) {
            // Safe to throw away worst card
            return { cardIndex: sorted[sorted.length - 1].index };
        }

        // Opponents still to play and partner CAN be beaten:
        // Play 2nd weakest — save best card for later without wasting it here.
        // Note: only valid with 3+ cards; with ≤2 cards play weakest (no 2nd weakest available).
        const safeCard = sorted.length >= 3
            ? sorted[sorted.length - 2]   // 2nd weakest of 3-card hand
            : sorted[sorted.length - 1];  // with 1 or 2 cards: always weakest
        return { cardIndex: safeCard.index };
    }

    // No opponent on table yet (only partner played) → play weakest
    if (bestOpponentPower === -1) {
        return { cardIndex: sorted[sorted.length - 1].index };
    }

    // Try to beat best opponent with the weakest possible winner (min-waste)
    const killers = sorted
        .filter(h => h.power > bestOpponentPower)
        .sort((a, b) => a.power - b.power);

    if (killers.length > 0) return { cardIndex: killers[0].index };

    // Can't win → play weakest to cut losses
    return { cardIndex: sorted[sorted.length - 1].index };
};

// ─── shouldCPUCallTruco ───────────────────────────────────────────────────────
/**
 * Decides whether the CPU should call Truco BEFORE playing its card.
 *
 * Improvements in v2.1:
 *  - ITEM 5: ABSOLUTE BLOCK when AI team score === 11 (Mão de 11 rule)
 *  - Uses round-scaled evaluateHand score (Item 1 benefit propagates here)
 *
 * Decision tree (calibrated against per-card normalized scores):
 *   score >= 0.75 → call (80% prob)
 *   score >= 0.55 → call if round > 0 (50% prob) or rare bluff round 0 (8%)
 *   score >= 0.40 → call only round 2 (30%) or very rare bluff (3%)
 *   score <  0.40 → desperate bluff if losing badly (8%)
 *
 * Returns boolean.
 */
export const shouldCPUCallTruco = (hand, vira, gameState, myPos) => {
    if (!hand || hand.length === 0) return false;

    const myTeam            = myPos % 2 === 0 ? 'ours' : 'theirs';
    const lastChallengerTeam = gameState?.trucoChallenge?.challengerTeam;

    // Can't challenge if we were the last to challenge
    if (lastChallengerTeam === myTeam) return false;

    // Can't go above 12
    if ((gameState?.handPoints ?? 1) >= 12) return false;

    // Don't call if a challenge is already pending
    if (gameState?.trucoChallenge?.status === 'pending') return false;

    // ── ITEM 5: Mão de 11 — ABSOLUTE BLOCK for BOTH teams ────────────────────
    // When EITHER team is at exactly 11 points, the hand is a "mão de 11".
    // No Truco calls are allowed by anyone — the hand value is already defined.
    const myPoints    = gameState?.score?.[myTeam]                          ?? 0;
    const theirTeam   = myTeam === 'ours' ? 'theirs' : 'ours';
    const theirPoints = gameState?.score?.[theirTeam]                       ?? 0;
    if (myPoints === 11 || theirPoints === 11) return false;

    const round  = gameState?.currentRound ?? 0;
    const hscore = evaluateHand(hand, vira, gameState, myPos);

    // ── Decision tree ─────────────────────────────────────────────────────────
    if (hscore >= 0.75) return Math.random() < 0.80;

    if (hscore >= 0.55) {
        return round > 0 ? Math.random() < 0.50 : Math.random() < 0.08;
    }

    if (hscore >= 0.40) {
        if (round === 2) return Math.random() < 0.30;
        if (round === 0) return Math.random() < 0.03;
        return false;
    }

    // Weak hand — desperate bluff only when losing badly
    // (theirTeam already declared above in the Mão de 11 block)
    const theirScore  = gameState?.score?.[theirTeam] ?? 0;
    if ((theirScore - myPoints) >= 6 && round >= 1) return Math.random() < 0.08;

    return false;
};

// ─── autoRespondToTruco ───────────────────────────────────────────────────────
/**
 * Decides how the CPU responds to a Truco challenge.
 *
 * Improvements in v2.1:
 *  - ITEM 4: Draw context — lower ACCEPT threshold when round 1 was a draw
 *    (decisive next round = more valuable to stay in)
 *  - ITEM 1 benefit: evaluateHand now scales round correctly
 *
 * Decision tree:
 *   score >= 0.72 AND handPoints < 12 → RAISE (55%) or ACCEPT
 *   score >= 0.45                     → ACCEPT
 *   score >= 0.32 AND wonRound1       → ACCEPT
 *   score >= 0.28 AND drewRound1      → ACCEPT (ITEM 4 — decisive next round)
 *   score >= 0.28 AND random          → ACCEPT (25%)
 *   otherwise                         → FOLD
 *
 * Returns 'ACCEPT' | 'FOLD' | 'RAISE'
 */
export const autoRespondToTruco = (hand, vira, gameState, myPos) => {
    if (!hand || hand.length === 0) return 'FOLD';

    const hscore     = evaluateHand(hand, vira, gameState, myPos);
    const handPoints = gameState?.handPoints ?? 1;

    const myTeam       = myPos % 2 === 0 ? 'ours' : 'theirs';
    const teamIndex    = myTeam === 'ours' ? 1 : 2;
    const roundWinners = gameState?.roundPoints ?? [];
    const wonRound1    = roundWinners[0] === teamIndex;
    // ITEM 4: empate no round 1 — "quem ganha a próxima leva"
    const drewRound1   = roundWinners[0] === 0;

    // ── RAISE ─────────────────────────────────────────────────────────────────
    if (handPoints < 12 && hscore >= 0.72) {
        if (Math.random() < 0.55) return 'RAISE';
        return 'ACCEPT';
    }

    // ── ACCEPT ────────────────────────────────────────────────────────────────
    if (hscore >= 0.45) return 'ACCEPT';

    if (hscore >= 0.32 && wonRound1) return 'ACCEPT';

    // ITEM 4: After a draw in round 1, the next round is decisive.
    // Staying in with a mediocre hand is strategically more valuable.
    if (hscore >= 0.28 && drewRound1) return 'ACCEPT';

    if (hscore >= 0.28 && Math.random() < 0.25) return 'ACCEPT';

    // ── FOLD ──────────────────────────────────────────────────────────────────
    return 'FOLD';
};

// ─── shouldAcceptMaoDeOnze ────────────────────────────────────────────────────
/**
 * ITEM 5: Mão de 11 decision for the team NOT at 11 points.
 *
 * When the OPPONENT reaches 11, the AI (as the non-11 team) must decide:
 *   FOLD   → gives 1 point to opponent → GAME OVER (opponent reaches 12)
 *   ACCEPT → hand is worth 3 points    → real chance to win
 *
 * Since FOLD means guaranteed defeat, the threshold to ACCEPT is very low.
 * Only fold if the hand is completely worthless (score < 0.22).
 *
 * @returns {boolean} true = accept, false = fold
 */
export const shouldAcceptMaoDeOnze = (hand, vira, gameState, myPos) => {
    if (!hand || hand.length === 0) return false;
    const hscore = evaluateHand(hand, vira, gameState, myPos);
    // Accept unless hand is truly garbage — folding = instant loss anyway
    return hscore >= 0.22;
};
