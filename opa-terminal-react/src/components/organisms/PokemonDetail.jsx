/**
 * PokemonDetail — Full details panel for a selected Pokémon.
 * Shows stats, moves (selectable up to 4), ability, and a button to add to team.
 */
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Plus, Minus, Zap, Shield, Sword, Wind, ChevronDown } from 'lucide-react';
import { usePokemonDetail, TYPE_COLORS_NEON } from '../../hooks/usePokemon';

function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1).replace(/-/g, ' ') : '';
}

function StatBar({ label, value, max = 255, color }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className="flex items-center gap-3">
      <span className="text-[8px] text-text-muted font-black uppercase tracking-[0.2em] w-14 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>
      <span className="text-[9px] font-black text-text-main/60 w-8 text-right">{value}</span>
    </div>
  );
}

const STAT_LABELS = {
  hp: { label: 'HP', color: '#ff5f5f' },
  attack: { label: 'ATK', color: '#ff9050' },
  defense: { label: 'DEF', color: '#60a0ff' },
  'special-attack': { label: 'S.ATK', color: '#c050d0' },
  'special-defense': { label: 'S.DEF', color: '#60d850' },
  speed: { label: 'SPD', color: '#ffd840' },
};

export function PokemonDetail({ pokemon, onAddToTeam, onClose, inTeam }) {
  const { fetchDetail } = usePokemonDetail();
  const [detail, setDetail] = useState(null);
  const [selectedMoves, setSelectedMoves] = useState([]);
  const [selectedAbility, setSelectedAbility] = useState(null);
  const [showMoves, setShowMoves] = useState(false);

  useEffect(() => {
    if (!pokemon) return;
    // If already has full detail (sprites, stats), use it directly
    if (pokemon.stats && pokemon.sprites) {
      setDetail(pokemon);
      // Pre-select first 4 moves
      const firstMoves = (pokemon.moves || []).slice(0, 4).map((m) => ({
        name: m.move.name,
        power: null, accuracy: null, pp: 10, type: 'normal', damageClass: 'physical',
        shortEffect: '',
      }));
      setSelectedMoves(firstMoves);
      if (pokemon.abilities?.length) {
        const ab = pokemon.abilities[0].ability;
        setSelectedAbility({ name: ab.name, shortEffect: '' });
      }
    } else {
      fetchDetail(pokemon.id || pokemon.name).then((d) => {
        setDetail(d);
        const firstMoves = (d?.moves || []).slice(0, 4).map((m) => ({
          name: m.move.name,
          power: null, accuracy: null, pp: 10, type: 'normal', damageClass: 'physical',
          shortEffect: '',
        }));
        setSelectedMoves(firstMoves);
        if (d?.abilities?.length) {
          const ab = d.abilities[0].ability;
          setSelectedAbility({ name: ab.name, shortEffect: '' });
        }
      });
    }
  }, [pokemon, fetchDetail]);

  if (!detail) {
    return (
      <div className="flex items-center justify-center h-64 text-text-muted text-[10px] font-black tracking-[0.3em] uppercase animate-pulse">
        LOADING_DATA...
      </div>
    );
  }

  const types = detail.types?.map((t) => t.type.name) || [];
  const primaryType = types[0] || 'normal';
  const accentColor = TYPE_COLORS_NEON[primaryType] || '#a0a0a0';
  const sprite = detail.sprites?.other?.['official-artwork']?.front_default
    || detail.sprites?.front_default
    || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${detail.id}.png`;

  const allMoves = (detail.moves || []).map((m) => m.move.name);
  const abilities = detail.abilities || [];
  const stats = detail.stats || [];

  const toggleMove = (moveName) => {
    setSelectedMoves((prev) => {
      if (prev.find((m) => m.name === moveName)) {
        return prev.filter((m) => m.name !== moveName);
      }
      if (prev.length >= 4) return prev;
      return [...prev, { name: moveName, power: null, accuracy: null, pp: 10, type: 'normal', damageClass: 'physical', shortEffect: '' }];
    });
  };

  const buildTeamEntry = () => ({
    pokemonId: detail.id,
    name: detail.name,
    sprite: detail.sprites?.front_default,
    spriteBack: detail.sprites?.back_default,
    spriteArtwork: sprite,
    types,
    stats: Object.fromEntries(
      stats.map((s) => [
        s.stat.name.replace('-', '_').replace('special_attack', 'specialAttack').replace('special_defense', 'specialDefense'),
        s.base_stat,
      ])
    ),
    moves: selectedMoves,
    ability: selectedAbility,
    flavorText: detail.flavorText,
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative bg-surface-100 backdrop-blur-xl border border-border rounded-3xl overflow-hidden"
      style={{ borderColor: `${accentColor}30` }}
    >
      {/* BG glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(circle at 50% 0%, ${accentColor}12, transparent 60%)` }}
      />

      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 rounded-xl bg-surface-200 hover:bg-surface-300 text-text-muted hover:text-text-main transition-all"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="grid md:grid-cols-[250px_1fr] gap-0">
        {/* Left: Sprite + Basic Info */}
        <div
          className="p-8 flex flex-col items-center gap-4 relative"
          style={{ background: `linear-gradient(180deg, ${accentColor}10 0%, transparent 100%)` }}
        >
          <span className="text-[9px] font-black tracking-[0.3em] text-text-muted">
            #{String(detail.id).padStart(3, '0')}
          </span>
          <img
            src={sprite}
            alt={detail.name}
            className="w-32 h-32 object-contain drop-shadow-2xl"
            style={{ filter: `drop-shadow(0 0 20px ${accentColor}60)` }}
          />
          <h3 className="text-text-main font-black text-lg uppercase tracking-[0.2em]">
            {capitalize(detail.name)}
          </h3>
          <div className="flex gap-2">
            {types.map((t) => (
              <span
                key={t}
                className="text-[8px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full"
                style={{ background: `${TYPE_COLORS_NEON[t]}20`, color: TYPE_COLORS_NEON[t], border: `1px solid ${TYPE_COLORS_NEON[t]}40` }}
              >
                {t}
              </span>
            ))}
          </div>
          {detail.flavorText && (
            <p className="text-[9px] text-text-muted/60 text-center leading-relaxed font-mono italic px-2">
              "{detail.flavorText.slice(0, 120)}..."
            </p>
          )}

          {/* Abilities */}
          <div className="w-full">
            <span className="text-[8px] font-black uppercase tracking-[0.3em] text-text-muted block mb-2">ABILITY_SLOT</span>
            <div className="flex flex-col gap-1.5">
              {abilities.map((a) => (
                <button
                  key={a.ability.name}
                  onClick={() => setSelectedAbility({ name: a.ability.name, shortEffect: '' })}
                  className="w-full text-left px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.15em] border transition-all"
                  style={{
                    borderColor: selectedAbility?.name === a.ability.name ? accentColor : 'var(--color-border)',
                    color: selectedAbility?.name === a.ability.name ? accentColor : 'var(--color-text-muted)',
                    background: selectedAbility?.name === a.ability.name ? `${accentColor}15` : 'transparent',
                  }}
                >
                  {capitalize(a.ability.name)} {a.is_hidden ? '(Hidden)' : ''}
                </button>
              ))}
            </div>
          </div>

          {/* Add to team */}
          <button
            onClick={() => onAddToTeam(buildTeamEntry())}
            disabled={inTeam}
            className="w-full py-3 rounded-xl font-black text-[10px] uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-2"
            style={{
              background: inTeam ? 'var(--color-surface-200)' : `${accentColor}20`,
              border: `1px solid ${inTeam ? 'var(--color-border)' : accentColor + '60'}`,
              color: inTeam ? 'var(--color-text-muted)' : accentColor,
            }}
          >
            <Plus className="w-4 h-4" />
            {inTeam ? 'IN_TEAM' : 'ADD_TO_TEAM'}
          </button>
        </div>

        {/* Right: Stats + Moves */}
        <div className="p-8 flex flex-col gap-6 border-l border-border overflow-y-auto max-h-[600px]">
          {/* Stats */}
          <div>
            <span className="text-[9px] font-black uppercase tracking-[0.4em] text-text-muted block mb-4">
              STATUS_BASE
            </span>
            <div className="flex flex-col gap-3">
              {stats.map((s) => {
                const cfg = STAT_LABELS[s.stat.name] || { label: s.stat.name, color: '#a0a0a0' };
                return (
                  <StatBar key={s.stat.name} label={cfg.label} value={s.base_stat} color={cfg.color} />
                );
              })}
            </div>
          </div>

          {/* Move Selector */}
          <div>
            <button
              onClick={() => setShowMoves(!showMoves)}
              className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.4em] text-text-muted hover:text-text-main transition-colors mb-3"
            >
              <Zap className="w-3.5 h-3.5" />
              SELEÇÃO_DE_GOLPES ({selectedMoves.length}/4)
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showMoves ? 'rotate-180' : ''}`} />
            </button>

            {/* Selected moves preview */}
            <div className="flex flex-wrap gap-2 mb-3">
              {selectedMoves.map((m) => (
                <span
                  key={m.name}
                  className="text-[8px] font-black uppercase tracking-[0.15em] px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer hover:opacity-70 transition-opacity"
                  style={{ background: `${accentColor}20`, color: accentColor, border: `1px solid ${accentColor}40` }}
                  onClick={() => toggleMove(m.name)}
                >
                  {capitalize(m.name)} <X className="w-2.5 h-2.5" />
                </span>
              ))}
              {selectedMoves.length === 0 && (
                <span className="text-[8px] text-text-muted/20 font-bold uppercase tracking-[0.2em]">
                  Select up to 4 moves below
                </span>
              )}
            </div>

            {showMoves && (
              <div className="grid grid-cols-2 gap-1.5 max-h-56 overflow-y-auto">
                {allMoves.slice(0, 100).map((moveName) => {
                  const isSelected = selectedMoves.find((m) => m.name === moveName);
                  return (
                    <button
                      key={moveName}
                      onClick={() => toggleMove(moveName)}
                      disabled={!isSelected && selectedMoves.length >= 4}
                      className="text-left px-3 py-2 rounded-lg text-[8px] font-black uppercase tracking-[0.1em] border transition-all disabled:opacity-30"
                      style={{
                        borderColor: isSelected ? accentColor : 'var(--color-border)',
                        color: isSelected ? accentColor : 'var(--color-text-muted)',
                        background: isSelected ? `${accentColor}15` : 'transparent',
                      }}
                    >
                      {capitalize(moveName)}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
