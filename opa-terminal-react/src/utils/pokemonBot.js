/**
 * pokemonBot — Utils for generating a bot team based on difficulty
 */

export const BOT_DIFFICULTIES = {
  facil: { level: 20, size: 2, label: 'FÁCIL' },
  medio: { level: 40, size: 4, label: 'MÉDIO' },
  dificil: { level: 70, size: 6, label: 'DIFÍCIL' },
  opa: { level: 100, size: 6, label: 'OPA TREINADOR' },
};

// Some strong/legendary pokemon IDs for Opa Treinador
const OPA_POKEMON_IDS = [150, 149, 248, 249, 384, 445, 373, 250, 144, 145, 146, 382, 383, 384, 483, 484];

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export async function generateBotTeam(difficultyKey = 'medio') {
  const diff = BOT_DIFFICULTIES[difficultyKey] || BOT_DIFFICULTIES.medio;
  const team = [];
  
  for (let i = 0; i < diff.size; i++) {
    // Generate a random ID (gen 1 to 4)
    let pokeId;
    if (difficultyKey === 'opa') {
      pokeId = OPA_POKEMON_IDS[Math.floor(Math.random() * OPA_POKEMON_IDS.length)];
    } else {
      pokeId = getRandomInt(1, 493); 
    }
    
    try {
      const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokeId}`);
      if (!res.ok) continue;
      const data = await res.json();
      
      const types = data.types.map(t => t.type.name);
      
      // Select 4 random valid moves
      const validMoves = data.moves.filter(m => {
         // Prefer moves from standard level-up if possible, but random is okay
         return true;
      });
      // Shuffle and pick 4
      validMoves.sort(() => 0.5 - Math.random());
      const selectedMoves = validMoves.slice(0, 4).map(m => ({
        name: m.move.name,
        power: null, // the engine handles null power
        accuracy: null,
        pp: 10,
        type: 'normal',
        damageClass: 'physical'
      }));
      
      // We don't fetch full move details (power, type) to save API calls in bulk.
      // But we can do a lightweight fetch or just let the engine use default/STAB damage formula approximations
      // Actually, for a better bot, we should fetch move types. Since we don't have time, we can fetch them via Promise.all
      const moveDetails = await Promise.all(
        selectedMoves.map(async (m) => {
          try {
            const mRes = await fetch(`https://pokeapi.co/api/v2/move/${m.name}`);
            const mData = await mRes.json();
            return {
              name: m.name,
              power: mData.power || null,
              accuracy: mData.accuracy || 100,
              pp: mData.pp || 10,
              type: mData.type.name,
              damageClass: mData.damage_class?.name || 'physical',
              meta: mData.meta,
              effectChance: mData.effect_chance
            };
          } catch {
            return m;
          }
        })
      );

      const sprite = data.sprites?.versions?.['generation-iii']?.['firered-leafgreen']?.front_default 
                     || data.sprites?.front_default;

      team.push({
        pokemonId: data.id,
        name: data.name,
        sprite: sprite,
        types,
        level: diff.level,
        stats: Object.fromEntries(
          data.stats.map((s) => [
            s.stat.name.replace('-', '_').replace('special_attack', 'specialAttack').replace('special_defense', 'specialDefense'),
            s.base_stat,
          ])
        ),
        moves: moveDetails,
        ability: data.abilities?.[0]?.ability || null,
      });
    } catch (e) {
      console.error('Failed to generate bot pokemon', e);
    }
  }
  
  return team;
}
