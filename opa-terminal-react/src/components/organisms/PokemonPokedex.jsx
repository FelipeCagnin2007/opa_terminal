/**
 * PokemonPokedex — Grid listing of Pokémon with infinite scroll, search, and type filter.
 * Follows the OPA Terminal cyberpunk aesthetic.
 */
import { useEffect, useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Plus, Check } from 'lucide-react';
import { usePokemonList, usePokemonDetail, TYPE_COLORS_NEON } from '../../hooks/usePokemon';

const ALL_TYPES = [
  'fire', 'water', 'grass', 'electric', 'ice', 'fighting', 'poison',
  'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon',
  'dark', 'steel', 'fairy', 'normal',
];

function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

function PokemonCard({ pokemon, onSelect, inTeam }) {
  const { fetchDetail, cache } = usePokemonDetail();
  const [detail, setDetail] = useState(null);
  const fetched = useRef(false);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;
    const cached = cache[pokemon.name];
    if (cached) { setDetail(cached); return; }
    fetchDetail(pokemon.id).then(setDetail);
  }, [pokemon.id, pokemon.name, fetchDetail, cache]);

  const sprite = detail?.sprites?.front_default ||
    `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png`;
  const types = detail?.types?.map((t) => t.type.name) || [];
  const primaryType = types[0] || 'normal';
  const accentColor = TYPE_COLORS_NEON[primaryType] || '#a0a0a0';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -4 }}
      onClick={() => onSelect(detail || pokemon)}
      className="relative cursor-pointer group"
    >
      <div
        className="bg-surface-100/60 backdrop-blur-xl border rounded-2xl p-4 flex flex-col items-center gap-3 transition-all duration-300 overflow-hidden"
        style={{
          borderColor: inTeam ? accentColor : 'var(--color-border)',
          boxShadow: inTeam ? `0 0 20px ${accentColor}40` : 'none',
        }}
      >
        {/* Glow BG */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{ background: `radial-gradient(circle at 50% 30%, ${accentColor}15, transparent 70%)` }}
        />

        {/* ID */}
        <span className="text-[8px] font-black tracking-[0.3em] text-text-muted self-start">
          #{String(pokemon.id).padStart(3, '0')}
        </span>

        {/* Sprite */}
        <div className="relative w-16 h-16 flex items-center justify-center">
          {sprite && (
            <img
              src={sprite}
              alt={pokemon.name}
              className="w-full h-full object-contain drop-shadow-lg group-hover:scale-110 transition-transform duration-300"
              loading="lazy"
            />
          )}
        </div>

        {/* Name */}
        <span className="text-text-main font-black text-[10px] uppercase tracking-[0.2em] text-center truncate w-full">
          {capitalize(pokemon.name)}
        </span>

        {/* Types */}
        <div className="flex gap-1 flex-wrap justify-center">
          {types.map((t) => (
            <span
              key={t}
              className="text-[7px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-full"
              style={{ background: `${TYPE_COLORS_NEON[t]}20`, color: TYPE_COLORS_NEON[t], border: `1px solid ${TYPE_COLORS_NEON[t]}40` }}
            >
              {t}
            </span>
          ))}
        </div>

        {/* In-team badge */}
        {inTeam && (
          <div
            className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
            style={{ background: accentColor }}
          >
            <Check className="w-3 h-3 text-black" />
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function PokemonPokedex({ onSelectPokemon, teamIds = [] }) {
  const { list, loading, hasMore, loadMore, init } = usePokemonList();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const loaderRef = useRef(null);

  useEffect(() => { init(); }, [init]);

  // Infinite scroll observer
  useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting && hasMore && !loading) loadMore(); },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, loading, loadMore]);

  const filtered = list.filter((p) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true; // Type filter happens at detail level — skip for now on list
  });

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted/60" />
          <input
            type="text"
            placeholder="PROCURAR_POKÉMON..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-surface-200/60 border border-border rounded-xl pl-10 pr-4 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-text-main placeholder:text-text-muted/20 focus:outline-none focus:border-primary/40 transition-colors"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-text-muted/60 shrink-0" />
          <button
            onClick={() => setTypeFilter('')}
            className={`text-[8px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-lg border transition-all ${!typeFilter ? 'border-primary/40 text-primary bg-primary/10' : 'border-border text-text-muted hover:border-border/50'}`}
          >
            TODOS
          </button>
          {ALL_TYPES.slice(0, 6).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(typeFilter === t ? '' : t)}
              className="text-[8px] font-black uppercase tracking-[0.15em] px-3 py-1.5 rounded-lg border transition-all"
              style={{
                borderColor: typeFilter === t ? TYPE_COLORS_NEON[t] : 'var(--color-border)',
                color: typeFilter === t ? TYPE_COLORS_NEON[t] : 'var(--color-text-muted)',
                background: typeFilter === t ? `${TYPE_COLORS_NEON[t]}15` : 'transparent',
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3 overflow-y-auto flex-1 pr-1 pb-4">
        {filtered.map((p) => (
          <PokemonCard
            key={p.id}
            pokemon={p}
            onSelect={onSelectPokemon}
            inTeam={teamIds.includes(p.id)}
          />
        ))}

        {/* Infinite scroll trigger */}
        <div ref={loaderRef} className="col-span-full flex justify-center py-6">
          {loading && (
            <div className="flex items-center gap-3 text-text-muted/60 text-[10px] font-black tracking-[0.3em] uppercase">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              CARREGANDO_DADOS...
            </div>
          )}
          {!hasMore && !loading && (
            <span className="text-text-muted/20 text-[9px] font-black tracking-[0.4em] uppercase">
              TODOS_OS_POKÉMON_CARREGADOS
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
