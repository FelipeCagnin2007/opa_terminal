/**
 * Pokémon Battle Engine — OPA Terminal
 * Simplified but faithful damage formula from Generation V+ games.
 * Supports: type effectiveness, STAB bonus, status effects, priority moves.
 */

// ─── Type Effectiveness Chart ──────────────────────────────────────────────
const TYPE_CHART = {
  normal:   { rock: 0.5, ghost: 0, steel: 0.5 },
  fire:     { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
  water:    { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
  electric: { water: 2, electric: 0.5, grass: 0.5, ground: 0, flying: 2, dragon: 0.5 },
  grass:    { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5, steel: 0.5 },
  ice:      { water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
  fighting: { normal: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0, dark: 2, steel: 2, fairy: 0.5 },
  poison:   { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2 },
  ground:   { fire: 2, electric: 2, grass: 0.5, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 },
  flying:   { electric: 0.5, grass: 2, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
  psychic:  { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
  bug:      { fire: 0.5, grass: 2, fighting: 0.5, flying: 0.5, psychic: 2, ghost: 0.5, dark: 2, steel: 0.5, fairy: 0.5 },
  rock:     { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
  ghost:    { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
  dragon:   { dragon: 2, steel: 0.5, fairy: 0 },
  dark:     { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 },
  steel:    { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5, fairy: 2 },
  fairy:    { fire: 0.5, fighting: 2, poison: 0.5, dragon: 2, dark: 2, steel: 0.5 },
};

/**
 * Calculate type effectiveness multiplier
 * @param {string} moveType
 * @param {string[]} defenderTypes
 * @returns {number}
 */
export function getTypeMultiplier(moveType, defenderTypes) {
  return defenderTypes.reduce((mult, defType) => {
    const effectiveness = TYPE_CHART[moveType]?.[defType];
    if (effectiveness === undefined) return mult * 1;
    return mult * effectiveness;
  }, 1);
}

/**
 * Get effectiveness label for UI
 */
export function getEffectivenessLabel(multiplier) {
  if (multiplier === 0) return 'IMMUNE';
  if (multiplier >= 4) return 'SUPER_EFFECTIVE x4';
  if (multiplier >= 2) return 'SUPER_EFFECTIVE';
  if (multiplier < 1 && multiplier > 0) return 'NOT_VERY_EFFECTIVE';
  return '';
}

/**
 * Main damage formula (Gen V+):
 * damage = floor(floor(floor(2 * level / 5 + 2) * power * atk / def / 50) + 2) * multipliers
 * @param {object} params
 */
export function calculateDamage({ attacker, move, defender, critical = false }) {
  if (!move.power || move.power <= 0) return 0;

  const level = attacker.level || 50;
  const isSpecial = move.damageClass === 'special';

  const atk = isSpecial
    ? (attacker.stats.specialAttack || attacker.stats.special_attack || 50)
    : (attacker.stats.attack || 50);
  const def = isSpecial
    ? (defender.stats.specialDefense || defender.stats.special_defense || 50)
    : (defender.stats.defense || 50);

  // Base damage formula
  let damage = Math.floor(
    (Math.floor((2 * level) / 5 + 2) * move.power * atk) / def / 50 + 2
  );

  // Critical hit
  if (critical) damage = Math.floor(damage * 1.5);

  // STAB (Same Type Attack Bonus)
  const attackerTypes = attacker.types || [];
  if (attackerTypes.includes(move.type)) damage = Math.floor(damage * 1.5);

  // Type effectiveness
  const defenderTypes = defender.types || [];
  const typeMultiplier = getTypeMultiplier(move.type, defenderTypes);
  damage = Math.floor(damage * typeMultiplier);

  // Status modifiers (Burn halves physical damage)
  if (attacker.status === 'burn' && !isSpecial) damage = Math.floor(damage * 0.5);

  // Random variance ±15%
  const variance = Math.floor(Math.random() * 15 + 85) / 100;
  damage = Math.max(1, Math.floor(damage * variance));

  return { damage, typeMultiplier, critical };
}

/**
 * Status effect: apply end-of-turn damage
 * @param {object} pokemon — battle pokemon instance
 * @returns {{ damage: number, log: string }}
 */
export function applyStatusDamage(pokemon) {
  if (!pokemon.status) return { damage: 0, log: '' };
  const maxHp = pokemon.maxHp || pokemon.stats.hp;
  if (pokemon.status === 'poison') {
    const dmg = Math.max(1, Math.floor(maxHp / 8));
    return { damage: dmg, log: `${pokemon.name} is hurt by POISON_TOXIN!` };
  }
  if (pokemon.status === 'bad-poison') {
    const dmg = Math.max(1, Math.floor((maxHp / 16) * (pokemon.poisonCounter || 1)));
    return { damage: dmg, log: `${pokemon.name} is badly TOXIN_CORRUPTED!` };
  }
  if (pokemon.status === 'burn') {
    const dmg = Math.max(1, Math.floor(maxHp / 16));
    return { damage: dmg, log: `${pokemon.name} is hurt by BURN_DAMAGE!` };
  }
  return { damage: 0, log: '' };
}

/**
 * Check if Pokémon can act this turn (paralysis, sleep, freeze)
 */
export function canAct(pokemon) {
  if (pokemon.status === 'paralysis' && Math.random() < 0.25) {
    return { can: false, log: `${pokemon.name} is PARALYZED! Cannot execute!` };
  }
  if (pokemon.status === 'sleep') {
    if (pokemon.sleepCounter <= 0) {
      return { can: true, wake: true, log: `${pokemon.name} WOKE_UP!` };
    }
    return { can: false, log: `${pokemon.name} is DORMANT!` };
  }
  if (pokemon.status === 'freeze') {
    if (Math.random() < 0.2) {
      return { can: true, thaw: true, log: `${pokemon.name} DEFROSTED!` };
    }
    return { can: false, log: `${pokemon.name} is FROZEN! Cannot execute!` };
  }
  return { can: true };
}

/**
 * Apply a move's secondary effect (ailment)
 * @param {string} moveType
 * @param {object} meta — from PokéAPI move meta
 * @param {number} effectChance
 */
export function applySecondaryEffect(defender, meta, effectChance) {
  if (!meta || !effectChance) return { applied: false, log: '' };
  if (Math.random() * 100 > effectChance) return { applied: false, log: '' };
  if (defender.status) return { applied: false, log: '' }; // already has status

  const ailmentName = meta.ailment?.name;
  const ailmentMap = {
    'paralysis': 'paralysis',
    'burn': 'burn',
    'freeze': 'freeze',
    'poison': 'poison',
    'badly-poison': 'bad-poison',
    'sleep': 'sleep',
  };
  const status = ailmentMap[ailmentName];
  if (!status) return { applied: false, log: '' };

  return {
    applied: true,
    status,
    log: `${defender.name} is now ${ailmentName.toUpperCase()}ED!`,
  };
}

/**
 * Initialize a Pokémon for battle from its team entry
 */
export function initBattlePokemon(teamEntry, level = 50) {
  const stats = teamEntry.stats || {};
  return {
    ...teamEntry,
    level,
    currentHp: stats.hp || 100,
    maxHp: stats.hp || 100,
    status: null,
    statusCounter: 0,
    sleepCounter: 0,
    poisonCounter: 1,
    // PP tracking: { moveName: currentPP }
    pp: Object.fromEntries(
      (teamEntry.moves || []).map((m) => [m.name, m.pp || 10])
    ),
    isFainted: false,
  };
}

/**
 * Full turn resolution: given attacker action + defender, return new states + log
 * @param {object} attackerPoke - battle pokemon instance
 * @param {object} defenderPoke - battle pokemon instance
 * @param {object} move - move object
 * @returns {{ attackerAfter, defenderAfter, log: string[], effectiveness: number }}
 */
export function resolveTurn(attackerPoke, defenderPoke, move) {
  const logs = [];
  let attacker = { ...attackerPoke };
  let defender = { ...defenderPoke };

  // Check if attacker can act
  const actCheck = canAct(attacker);
  if (actCheck.wake) { attacker = { ...attacker, status: null }; }
  if (actCheck.thaw) { attacker = { ...attacker, status: null }; }
  if (!actCheck.can) {
    logs.push(actCheck.log);
    return { attackerAfter: attacker, defenderAfter: defender, logs, effectiveness: 1 };
  }

  // Deduct PP
  if (attacker.pp[move.name] !== undefined) {
    attacker = { ...attacker, pp: { ...attacker.pp, [move.name]: Math.max(0, attacker.pp[move.name] - 1) } };
  }

  logs.push(`${attacker.name} used ${move.name.toUpperCase()}!`);

  // Accuracy check
  const accuracy = move.accuracy || 100;
  if (Math.random() * 100 > accuracy) {
    logs.push(`${attacker.name}'s attack MISSED!`);
    return { attackerAfter: attacker, defenderAfter: defender, logs, effectiveness: 1 };
  }

  let effectiveness = 1;
  
  let power = move.power;
  if (!power && move.damageClass !== 'status') {
    power = 50; // Default fallback for moves missing data
  }

  if (power && power > 0) {
    // Critical hit (6.25% chance)
    const critical = Math.random() < 0.0625;
    if (critical) logs.push('CRITICAL_HIT!');

    const effectiveMove = { ...move, power };
    const result = calculateDamage({ attacker, move: effectiveMove, defender, critical });
    effectiveness = result.typeMultiplier;

    const effLabel = getEffectivenessLabel(effectiveness);
    if (effLabel) logs.push(effLabel + '!');

    const newHp = Math.max(0, defender.currentHp - result.damage);
    defender = { ...defender, currentHp: newHp, isFainted: newHp <= 0 };
    logs.push(`${defender.name} took ${result.damage} damage!`);

    if (defender.isFainted) {
      logs.push(`${defender.name} FAINTED!`);
    }

    // Secondary effects
    if (!defender.isFainted) {
      const sec = applySecondaryEffect(defender, move.meta, move.effectChance);
      if (sec.applied) {
        defender = { ...defender, status: sec.status };
        logs.push(sec.log);
      }
    }
  } else if (move.damageClass === 'status') {
    // Status moves (simplified: just log)
    logs.push(`${attacker.name} used a STATUS_PROTOCOL!`);
  } else {
    logs.push(`${attacker.name}'s attack had no effect!`);
  }

  // End-of-turn status damage on attacker
  const statusResult = applyStatusDamage(attacker);
  if (statusResult.damage > 0) {
    const newHp = Math.max(0, attacker.currentHp - statusResult.damage);
    attacker = { ...attacker, currentHp: newHp, isFainted: newHp <= 0 };
    logs.push(statusResult.log);
    if (attacker.isFainted) logs.push(`${attacker.name} FAINTED!`);
  }

  // Increment poison counter
  if (attacker.status === 'bad-poison') {
    attacker = { ...attacker, poisonCounter: (attacker.poisonCounter || 1) + 1 };
  }

  return { attackerAfter: attacker, defenderAfter: defender, logs, effectiveness };
}
