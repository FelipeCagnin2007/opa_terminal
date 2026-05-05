/**
 * usePokemonMoves — Hook for fetching and caching Pokémon move data from PokéAPI v2
 */
import { useState, useCallback } from 'react';
import { cachedFetch, cacheGet, cacheSet } from '../utils/pokemonCache';

const BASE = 'https://pokeapi.co/api/v2';

export function usePokemonMoves() {
  const [moveCache, setMoveCache] = useState({});
  const [loading, setLoading] = useState(false);

  const getMove = useCallback(async (nameOrId) => {
    const key = String(nameOrId).toLowerCase();

    if (moveCache[key]) return moveCache[key];

    const localCached = cacheGet(`move_${key}`);
    if (localCached) {
      setMoveCache((prev) => ({ ...prev, [key]: localCached }));
      return localCached;
    }

    setLoading(true);
    try {
      const data = await cachedFetch(`${BASE}/move/${key}`, `move_${key}`);
      const move = {
        id: data.id,
        name: data.name,
        power: data.power,
        accuracy: data.accuracy,
        pp: data.pp,
        type: data.type?.name,
        damageClass: data.damage_class?.name, // physical | special | status
        effectChance: data.effect_chance,
        shortEffect: data.effect_entries?.find((e) => e.language.name === 'en')?.short_effect || '',
        target: data.target?.name,
        priority: data.priority,
        meta: data.meta,
      };
      cacheSet(`move_${key}`, move);
      setMoveCache((prev) => ({ ...prev, [key]: move }));
      return move;
    } catch (e) {
      console.error('[usePokemonMoves]', e);
      return null;
    } finally {
      setLoading(false);
    }
  }, [moveCache]);

  /**
   * Fetch multiple moves at once (batch)
   */
  const getMoves = useCallback(async (namesOrIds) => {
    const results = await Promise.allSettled(namesOrIds.map(getMove));
    return results.map((r) => (r.status === 'fulfilled' ? r.value : null));
  }, [getMove]);

  return { getMove, getMoves, loading, moveCache };
}
