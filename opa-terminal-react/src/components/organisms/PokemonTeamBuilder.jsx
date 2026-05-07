/**
 * PokemonTeamBuilder — Interface to build and save a team of up to 6 Pokémon.
 * Integrates Pokédex browsing + detail view + Supabase save.
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, Trash2, Swords, X, CheckCircle } from 'lucide-react';
import { PokemonPokedex } from './PokemonPokedex';
import { PokemonDetail } from './PokemonDetail';
import { usePokemonTeam } from '../../hooks/usePokemonTeam';
import { TYPE_COLORS_NEON } from '../../hooks/usePokemon';

function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1).replace(/-/g, ' ') : '';
}

function TeamSlot({ member, index, onRemove }) {
  const accentColor = member
    ? (TYPE_COLORS_NEON[member.types?.[0]] || '#a0a0a0')
    : 'var(--color-surface-200)';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all group"
      style={{
        borderColor: member ? `${accentColor}40` : 'var(--color-border)',
        background: member ? `${accentColor}08` : 'var(--color-surface-100)',
        minHeight: '110px',
      }}
    >
      <span className="text-[7px] font-black tracking-[0.3em] text-text-muted/60">SLOT_{index + 1}</span>
      {member ? (
        <>
          <img
            src={member.sprite}
            alt={member.name}
            className="w-12 h-12 object-contain"
            style={{ filter: `drop-shadow(0 0 8px ${accentColor}60)` }}
          />
          <span className="text-[8px] font-black uppercase tracking-[0.15em] text-text-main/70 text-center truncate w-full">
            {capitalize(member.name)}
          </span>
          <button
            onClick={() => onRemove(member.pokemonId)}
            className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/40"
          >
            <X className="w-3 h-3" />
          </button>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border border-dashed border-border flex items-center justify-center">
            <span className="text-text-muted/20 text-xl font-black">+</span>
          </div>
        </div>
      )}
    </motion.div>
  );
}

export function PokemonTeamBuilder({ userId, onBattle }) {
  const { team, teamName, setTeamName, saving, error, saveTeam, addToTeam, removeFromTeam } = usePokemonTeam(userId);
  const [selectedPokemon, setSelectedPokemon] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const teamIds = team.map((p) => p.pokemonId);

  const handleAddToTeam = (entry) => {
    addToTeam(entry);
    setSelectedPokemon(null);
  };

  const handleSave = async () => {
    const ok = await saveTeam(team);
    if (ok) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    }
  };

  // Fill team slots to always show 6
  const slots = Array.from({ length: 6 }, (_, i) => team[i] || null);

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* Team Strip */}
      <div className="bg-surface-100/40 backdrop-blur-xl border border-border rounded-3xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex flex-col gap-2">
            <h3 className="text-text-main font-black uppercase tracking-[0.3em] text-sm">EQUIPE_POKÉMON</h3>
            <div className="flex items-center gap-3">
              <input 
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value.toUpperCase())}
                placeholder="NOME_DA_EQUIPE"
                className="bg-surface-200 border border-border px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-primary focus:border-primary/40 outline-none w-48 transition-all"
              />
              <span className="text-[9px] text-text-muted uppercase tracking-[0.3em]">
                {team.length}/6 POKÉMON CARREGADOS
              </span>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving || team.length === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-black text-[9px] uppercase tracking-[0.3em] transition-all border border-primary/30 text-primary bg-primary/10 hover:bg-primary/20 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {saveSuccess ? (
                <><CheckCircle className="w-3.5 h-3.5" /> SALVO!</>
              ) : saving ? (
                <><div className="w-3.5 h-3.5 border border-primary border-t-transparent rounded-full animate-spin" /> SALVANDO...</>
              ) : (
                <><Save className="w-3.5 h-3.5" /> SALVAR_EQUIPE</>
              )}
            </button>
            {team.length >= 1 && (
              <button
                onClick={() => onBattle && onBattle(team)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl font-black text-[9px] uppercase tracking-[0.3em] transition-all btn-premium"
              >
                <Swords className="w-3.5 h-3.5" /> LUTAR!
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[9px] font-black uppercase tracking-[0.2em]">
            ERRO: {error}
          </div>
        )}

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {slots.map((member, i) => (
            <TeamSlot key={i} index={i} member={member} onRemove={removeFromTeam} />
          ))}
        </div>
      </div>

      {/* Pokédex or Detail */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {selectedPokemon ? (
            <motion.div
              key="detail"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="h-full overflow-y-auto"
            >
              <PokemonDetail
                pokemon={selectedPokemon}
                onAddToTeam={handleAddToTeam}
                onClose={() => setSelectedPokemon(null)}
                inTeam={teamIds.includes(selectedPokemon.id || selectedPokemon.pokemonId)}
              />
            </motion.div>
          ) : (
            <motion.div
              key="pokedex"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="h-full"
            >
              <div className="mb-4">
                <h4 className="text-[9px] text-text-muted font-black uppercase tracking-[0.5em] flex items-center gap-3">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full shadow-pop animate-pulse" />
                  POKÉDEX — SELECIONE PARA VER / ADICIONAR À EQUIPE
                  <div className="flex-grow h-px bg-border" />
                </h4>
              </div>
              <PokemonPokedex onSelectPokemon={setSelectedPokemon} teamIds={teamIds} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
