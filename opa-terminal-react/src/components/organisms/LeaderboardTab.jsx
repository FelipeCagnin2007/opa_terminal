import { useState, useCallback, useMemo } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { Trophy, Coins, Zap, User, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthContext } from '../../context/AuthContext';
import { usePet } from '../../context/PetContext';

export function LeaderboardTab() {
  const [dbLeaders, setDbLeaders]     = useState([]);
  const [loading, setLoading]         = useState(false);
  const [lastSynced, setLastSynced]   = useState(null); // null = never fetched
  const { profile } = useAuthContext();
  const { pet }     = usePet();

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
        xp:    pet?.xp    ?? currentLeaders[userIndex].xp,
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
      <div className="bg-surface/40 p-10 border border-white/5 rounded-[2.5rem] backdrop-blur-3xl relative overflow-hidden shadow-2xl z-10">
        <div className="absolute top-[-20%] right-[-10%] p-4 opacity-5">
          <Trophy className="w-64 h-64 text-glow rotate-12" />
        </div>

        <div className="flex flex-col gap-3 relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-glow/10 flex items-center justify-center border border-glow/20 mb-4 shadow-glow">
            <Trophy className="text-glow w-8 h-8" />
          </div>
          <h2 className="text-white text-3xl font-black flex items-center gap-4 tracking-[0.2em] uppercase">
              GLOBAL_PROTOCOL_RANKING
          </h2>
          <div className="h-px w-32 bg-gradient-to-r from-glow/50 to-transparent my-2" />
          <div className="flex flex-wrap items-center gap-4">
            <p className="text-[10px] text-white/40 uppercase tracking-[0.4em] font-bold">
                Top 20 Entities by Computational Wealth and Experience inside OPA Cluster.
            </p>
            {/* Manual sync button */}
            <button
              onClick={fetchLeaders}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-glow/5 border border-glow/20 rounded-xl text-glow text-[9px] font-black uppercase tracking-[0.3em] hover:bg-glow/10 hover:border-glow/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'SYNCING...' : 'SYNC RANKING'}
            </button>
          </div>
          <p className="text-[8px] text-white/20 uppercase tracking-[0.3em] font-bold">{timeLabel}</p>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="flex-grow bg-surface/30 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-8 overflow-y-auto custom-scrollbar shadow-2xl relative z-10">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-6 pb-6 border-b border-white/10 text-[9px] text-white/30 font-black uppercase tracking-[0.4em] px-6 sticky top-0 bg-surface/90 backdrop-blur-md z-20">
            <div className="col-span-1">RANK</div>
            <div className="col-span-5 text-left">ENTITY_ID</div>
            <div className="col-span-3 text-right">WEALTH (OPACOINS)</div>
            <div className="col-span-3 text-right">EXPERIENCE_XP</div>
        </div>

        <div className="mt-6 space-y-4">
          {/* Empty state — not yet fetched */}
          {!lastSynced && !loading && (
            <div className="flex flex-col items-center justify-center py-20 gap-6 opacity-50">
              <Trophy className="w-16 h-16 text-white/20" />
              <p className="text-[10px] text-white/40 uppercase tracking-[0.4em] font-black text-center">
                Ranking not loaded yet.<br />Click SYNC RANKING to fetch data.
              </p>
              <button
                onClick={fetchLeaders}
                className="flex items-center gap-2 px-6 py-3 bg-glow/10 border border-glow/30 rounded-xl text-glow text-[9px] font-black uppercase tracking-[0.3em] hover:bg-glow/20 transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                LOAD RANKING
              </button>
            </div>
          )}

          {/* Loading spinner */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-12 h-12 border-2 border-glow/20 border-t-glow rounded-full animate-spin" />
              <span className="text-[10px] text-glow uppercase tracking-[0.4em] font-black animate-pulse">Syncing Database...</span>
            </div>
          )}

          {/* Rows */}
          {!loading && lastSynced && leaders.map((leader, index) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              key={leader.nome + index}
              className={`grid grid-cols-12 gap-6 p-6 rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${
                index === 0 ? 'bg-glow/10 border-glow/30 shadow-glow' :
                index === 1 ? 'bg-cyber-blue/10 border-cyber-blue/30 shadow-[0_0_20px_rgba(0,240,255,0.1)]' :
                index === 2 ? 'bg-orange-500/10 border-orange-500/30 shadow-[0_0_20px_rgba(249,115,22,0.1)]' :
                'bg-white/[0.02] border-white/5 hover:border-white/20 hover:bg-white/[0.04]'
              }`}
            >
              <div className={`col-span-1 flex items-center font-black text-lg ${
                index === 0 ? 'text-glow' :
                index === 1 ? 'text-cyber-blue' :
                index === 2 ? 'text-orange-500' :
                'text-white/20'
              }`}>
                #{index + 1}
              </div>
              <div className="col-span-5 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                  index < 3 ? 'bg-black/40 border-current' : 'bg-surface border-white/5'
                }`}>
                  <User className={`w-5 h-5 ${
                    index === 0 ? 'text-glow' :
                    index === 1 ? 'text-cyber-blue' :
                    index === 2 ? 'text-orange-500' :
                    'text-white/20'
                  }`} />
                </div>
                <span className={`font-black tracking-widest uppercase truncate ${index < 3 ? 'text-white' : 'text-white/60'}`}>
                  {leader.nome}
                </span>
              </div>
              <div className="col-span-3 flex items-center justify-end gap-2 font-mono font-bold text-glow">
                {(leader.coins || 0).toLocaleString()}
                <Coins className="w-3.5 h-3.5 opacity-50" />
              </div>
              <div className="col-span-3 flex items-center justify-end gap-2 font-mono font-bold text-cyber-blue">
                {(leader.xp || 0).toLocaleString()}
                <Zap className="w-3.5 h-3.5 opacity-50" />
              </div>
            </motion.div>
          ))}

          {!loading && lastSynced && leaders.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-30">
              <Trophy className="w-16 h-16 text-white" />
              <span className="text-[10px] text-white uppercase tracking-[0.4em] font-black">No entities registered in cluster.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
