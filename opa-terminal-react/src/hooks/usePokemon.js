/**
 * usePokemon — Hook for fetching and caching Pokémon data from PokéAPI v2
 * All requests are cached in localStorage to comply with Fair Use Policy.
 */
import { useState, useCallback, useRef } from 'react';
import { cachedFetch, cacheGet, cacheSet } from '../utils/pokemonCache';

const BASE = 'https://pokeapi.co/api/v2';
const PAGE_SIZE = 24;

// Type color map for UI accents
export const TYPE_COLORS = {
  normal: '#A8A878', fire: '#F08030', water: '#6890F0', electric: '#F8D030',
  grass: '#78C850', ice: '#98D8D8', fighting: '#C03028', poison: '#A040A0',
  ground: '#E0C068', flying: '#A890F0', psychic: '#F85888', bug: '#A8B820',
  rock: '#B8A038', ghost: '#705898', dragon: '#7038F8', dark: '#705848',
  steel: '#B8B8D0', fairy: '#EE99AC',
};

export const TYPE_COLORS_NEON = {
  normal: '#c8c8a8', fire: '#ff9050', water: '#60a0ff', electric: '#ffd840',
  grass: '#60d850', ice: '#a0f0f0', fighting: '#ff5040', poison: '#c050d0',
  ground: '#f0c860', flying: '#b8a0ff', psychic: '#ff60a0', bug: '#c0d830',
  rock: '#d0b840', ghost: '#9060c0', dragon: '#8048ff', dark: '#806858',
  steel: '#d0d0e8', fairy: '#ff99cc',
};

/**
 * Fetch paginated list of Pokémon names + IDs
 */
export function usePokemonList() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const offsetRef = useRef(0);
  const loadedRef = useRef(false);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const offset = offsetRef.current;
      const data = await cachedFetch(
        `${BASE}/pokemon?limit=${PAGE_SIZE}&offset=${offset}`,
        `pokemon_list_${offset}`
      );
      const items = data.results.map((p, i) => ({
        name: p.name,
        id: offset + i + 1,
        url: p.url,
      }));
      setList((prev) => [...prev, ...items]);
      offsetRef.current = offset + PAGE_SIZE;
      setHasMore(!!data.next);
    } catch (e) {
      console.error('[usePokemonList]', e);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore]);

  const init = useCallback(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    loadMore();
  }, [loadMore]);

  return { list, loading, hasMore, loadMore, init };
}

/**
 * Fetch full details for a single Pokémon by name or ID
 */
export function usePokemonDetail() {
  const [cache, setCache] = useState({});
  const [loading, setLoading] = useState(false);

  const fetchDetail = useCallback(async (nameOrId) => {
    const key = String(nameOrId).toLowerCase();
    if (cache[key]) return cache[key];

    const localCached = cacheGet(`pokemon_detail_${key}`);
    if (localCached) {
      setCache((prev) => ({ ...prev, [key]: localCached }));
      return localCached;
    }

    setLoading(true);
    try {
      const data = await cachedFetch(`${BASE}/pokemon/${key}`, `pokemon_detail_${key}`);
      // Also fetch species for flavor text
      let flavorText = '';
      try {
        const species = await cachedFetch(data.species.url, `species_${key}`);
        const engFlavor = species.flavor_text_entries?.find(
          (e) => e.language.name === 'en'
        );
        flavorText = engFlavor?.flavor_text?.replace(/\f/g, ' ') || '';
      } catch { /* non-critical */ }

      const detail = { ...data, flavorText };
      cacheSet(`pokemon_detail_${key}`, detail);
      setCache((prev) => ({ ...prev, [key]: detail }));
      return detail;
    } catch (e) {
      console.error('[usePokemonDetail]', e);
      return null;
    } finally {
      setLoading(false);
    }
  }, [cache]);

  return { fetchDetail, loading, cache };
}

/**
 * Batch pre-fetch sprites for a list of Pokémon IDs (lightweight)
 */
export async function prefetchSprites(ids) {
  await Promise.allSettled(
    ids.map((id) =>
      cachedFetch(`${BASE}/pokemon/${id}`, `pokemon_detail_${id}`)
    )
  );
}
