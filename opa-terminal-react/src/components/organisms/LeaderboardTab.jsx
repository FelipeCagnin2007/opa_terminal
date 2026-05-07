import { useState, useCallback, useMemo } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { Trophy, Coins, Zap, User, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthContext } from '../../context/AuthContext';
import { usePet } from '../../context/PetContext';

export function LeaderboardTab() {
  const [dbLeaders, setDbLeaders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastSynced, setLastSynced] = useState(null); // null = never fetched
  const { profile } = useAuthContext();
  const { pet } = usePet();

  const fetchLeaders = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('usuarios')
      .select('nome, coins, xp')
      .order('coins', { ascending: false })
      .limit(20);

    if (error) {
      console.error('[LEADERBOARD] Error fetching data:', error);
    } else {
      setDbLeaders(data || []);
      setLastSynced(new Date());
    }
    setLoading(false);
  }, []);

  // Merge live local pet state into the fetched list
  const leaders = useMemo(() => {
    if (!profile) return dbLeaders;

    let currentLeaders = [...dbLeaders];
    const userIndex = currentLeaders.findIndex(l => l.nome === profile.nome);

    if (userIndex !== -1) {
      currentLeaders[userIndex] = {
        ...currentLeaders[userIndex],
        coins: pet?.coins ?? currentLeaders[userIndex].coins,
        xp: pet?.xp ?? currentLeaders[userIndex].xp,
      };
    } else if (pet && (pet.coins > 0 || pet.xp > 0)) {
      currentLeaders.push({ nome: profile.nome, coins: pet.coins, xp: pet.xp });
    }

    currentLeaders.sort((a, b) => b.coins - a.coins);

    if (userIndex === -1 && currentLeaders.length > 20) {
      const localIsTop20 = currentLeaders.findIndex(l => l.nome === profile.nome) < 20;
      if (!localIsTop20) currentLeaders = currentLeaders.slice(0, 20);
    }

    return currentLeaders;
  }, [dbLeaders, profile, pet]);

  const timeLabel = lastSynced
    ? `LAST SYNC: ${lastSynced.toLocaleTimeString()}`
    : 'NOT YET SYNCED — CLICK TO LOAD';

  return (
    <div className="flex flex-col gap-10 h-full p-2 md:p-6 lg:p-10 relative">
      <div className="noise-bg absolute inset-0 opacity-5 pointer-events-none" />

      {/* Header */}
      <div className="bg-surface-100/40 p-6 md:p-10 border border-border rounded-[1.5rem] md:rounded-[2.5rem] backdrop-blur-3xl relative overflow-hidden shadow-main z-10">
        <div className="absolute top-[-20%] right-[-10%] p-4 opacity-5">
          <Trophy className="w-64 h-64 text-primary rotate-12" />
        </div>

        <div className="flex flex-col gap-3 relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 mb-4 shadow-pop">
            <Trophy className="text-primary w-8 h-8" />
          </div>
          <h2 className="text-text-main text-xl md:text-3xl font-black flex items-center gap-4 tracking-[0.1em] md:tracking-[0.2em] uppercase">
            RANKING_GLOBAL
          </h2>
          <div className="h-px w-32 bg-gradient-to-r from-primary/50 to-transparent my-2" />
          <div className="flex flex-wrap items-center gap-4">
            <p className="text-[9px] md:text-[10px] text-text-muted uppercase tracking-[0.2em] md:tracking-[0.4em] font-bold">
              As 20 principais entidades por riqueza computacional e experiência no OPA Cluster.
            </p>
            {/* Manual sync button */}
            <button
              onClick={fetchLeaders}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-primary/5 border border-primary/20 rounded-xl text-primary text-[9px] font-black uppercase tracking-[0.3em] hover:bg-primary/10 hover:border-primary/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'SYNCING...' : 'SYNC RANKING'}
            </button>
          </div>
          <p className="text-[8px] text-text-muted/60 uppercase tracking-[0.3em] font-bold">{timeLabel}</p>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="flex-grow bg-surface-100/30 backdrop-blur-xl border border-border rounded-[1.5rem] md:rounded-[2.5rem] p-4 md:p-8 overflow-y-auto custom-scrollbar shadow-main relative z-10">
        {/* Table Header */}
        <div className="hidden md:grid grid-cols-12 gap-6 pb-6 border-b border-border text-[9px] text-text-muted font-black uppercase tracking-[0.4em] px-6 sticky top-0 bg-surface-100/90 backdrop-blur-md z-20">
          <div className="col-span-1">RANK</div>
          <div className="col-span-6">IDENTIFICAÇÃO_DA_ENTIDADE</div>
          <div className="col-span-2 text-center">OPACOINS</div>
          <div className="col-span-2 text-center">EXPERIÊNCIA</div>
          <div className="col-span-1 text-right">AÇÕES</div>
        </div>

        <div className="mt-6 space-y-4">
          {/* Empty state — not yet fetched */}
          {!lastSynced && !loading && (
            <div className="flex flex-col items-center justify-center py-20 gap-6 opacity-50">
              <Trophy className="w-16 h-16 text-text-muted/20" />
              <p className="text-[10px] text-text-muted uppercase tracking-[0.4em] font-black text-center">
                O ranking ainda não foi carregado.<br />Clique em SINCRONIZAR RANKING para buscar dados.
              </p>
              <button
                onClick={fetchLeaders}
                className="flex items-center gap-2 px-6 py-3 bg-glow/10 border border-glow/30 rounded-xl text-glow text-[9px] font-black uppercase tracking-[0.3em] hover:bg-glow/20 transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                CARREGAR RANKING
              </button>
            </div>
          )}

          {/* Loading spinner */}
          {loading && (
            <div className="col-span-full py-24 flex flex-col items-center justify-center gap-6 text-text-muted/20 uppercase tracking-[0.4em]">
              <div className="w-24 h-24 border-4 border-border border-t-primary rounded-full animate-spin" />
              <p className="text-xs font-black">Sincronizando registros do cluster...</p>
            </div>
          )}

          {/* Rows */}
          {!loading && lastSynced && leaders.map((leader, index) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              key={leader.nome + index}
              className={`flex flex-col md:grid md:grid-cols-12 gap-4 md:gap-6 p-5 md:p-6 rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${index === 0 ? 'bg-primary/10 border-primary/30 shadow-pop' :
                  index === 1 ? 'bg-accent/10 border-accent/30 shadow-pop-accent' :
                    index === 2 ? 'bg-danger/10 border-danger/30 shadow-pop-danger' :
                      'bg-surface-200 border-border hover:border-border-hover hover:bg-surface-300'
                }`}
            >
              <div className="flex items-center justify-between md:col-span-6 gap-2 min-w-0">
                <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
                  <div className={`shrink-0 w-7 h-7 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center font-black text-[10px] md:text-lg border ${index === 0 ? 'text-primary border-primary/20 bg-primary/10' :
                      index === 1 ? 'text-accent border-accent/20 bg-accent/10' :
                        index === 2 ? 'text-danger border-danger/20 bg-danger/10' :
                          'text-text-muted/40 border-border bg-surface-200'
                    }`}>
                    #{index + 1}
                  </div>
                  <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                    <div className={`hidden sm:flex shrink-0 w-8 h-8 rounded-xl items-center justify-center border ${index < 3 ? 'bg-surface-300/40 border-current' : 'bg-surface-200 border-border'
                      }`}>
                      <User className={`w-4 h-4 ${index === 0 ? 'text-primary' :
                          index === 1 ? 'text-accent' :
                            index === 2 ? 'text-danger' :
                              'text-text-muted/20'
                        }`} />
                    </div>
                    <span className={`font-black tracking-wider uppercase truncate text-xs md:text-base min-w-0 ${index < 3 ? 'text-text-main' : 'text-text-muted'}`}>
                      {leader.nome}
                    </span>
                  </div>
                </div>
              </div>

              <div className="hidden md:flex col-span-3 items-center justify-end gap-2 font-mono font-bold text-primary">
                {(leader.coins || 0).toLocaleString()}
                <Coins className="w-3.5 h-3.5 opacity-50" />
              </div>
              <div className="hidden md:flex col-span-3 items-center justify-end gap-2 font-mono font-bold text-accent">
                {(leader.xp || 0).toLocaleString()}
                <Zap className="w-3.5 h-3.5 opacity-50" />
              </div>
            </motion.div>
          ))}

          {!loading && lastSynced && leaders.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-30">
              <Trophy className="w-16 h-16 text-text-main" />
              <span className="text-[10px] text-text-main uppercase tracking-[0.4em] font-black">No entities registered in cluster.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
