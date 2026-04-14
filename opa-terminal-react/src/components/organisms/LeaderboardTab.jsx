import { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { Trophy, Coins, Zap, User } from 'lucide-react';
import { motion } from 'framer-motion';

export function LeaderboardTab() {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaders = async () => {
      const { data, error } = await supabase
        .from('usuarios')
        .select('nome, coins, xp')
        .order('coins', { ascending: false })
        .limit(20);

      if (error) {
      console.error("[CHAT] Error sending message:", error);
      alert("ERRO_TRANSMISSÃO: Falha ao enviar dados para o cluster.");
    } else {
      setLeaders(data || []);
    }
    setLoading(false);
    };

    fetchLeaders();
  }, []);

  return (
    <div className="flex flex-col gap-6 h-full font-terminal p-4 md:p-8">
      {/* Header Info */}
      <div className="bg-surface/30 p-8 border border-border/40 rounded-3xl backdrop-blur-md relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5">
            <Trophy className="w-40 h-40" />
        </div>
        <h2 className="text-glow text-2xl font-black mb-2 flex items-center gap-3">
            <Trophy className="w-6 h-6" />
            RANKING DE PROTOCOLOS
        </h2>
        <p className="text-[10px] text-accent/60 uppercase tracking-[0.3em]">
            Os 20 usuários com maior patrimônio e experiência no cluster OPA.
        </p>
      </div>

      {/* Leaderboard Table */}
      <div className="flex-grow bg-black/20 border border-border/20 rounded-3xl p-6 overflow-y-auto custom-scrollbar">
        <div className="grid grid-cols-12 gap-4 pb-4 border-b border-border/20 text-[10px] text-accent/40 font-black uppercase tracking-widest px-4">
            <div className="col-span-1">#</div>
            <div className="col-span-5 md:col-span-6 text-left">PROTOCOLO_ID</div>
            <div className="col-span-3 md:col-span-2 text-right">MOEDAS</div>
            <div className="col-span-3 md:col-span-3 text-right">EXPERIÊNCIA</div>
        </div>

        <div className="mt-4 space-y-2">
            {loading ? (
                <div className="flex justify-center p-20 animate-pulse text-glow uppercase text-xs">Acessando banco de dados...</div>
            ) : leaders.map((leader, index) => (
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={leader.nome + index}
                    className={`grid grid-cols-12 gap-4 p-4 rounded-xl border transition-all ${index < 3 ? 'bg-glow/10 border-glow/30' : 'bg-surface/40 border-border/20'}`}
                >
                    <div className={`col-span-1 flex items-center font-black ${index === 0 ? 'text-glow' : index === 1 ? 'text-cyber-blue' : index === 2 ? 'text-energy' : 'text-accent/40'}`}>
                        {index + 1}
                    </div>
                    <div className="col-span-5 md:col-span-6 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-black/40 border border-border/40 flex items-center justify-center">
                            <User className={`w-4 h-4 ${index < 3 ? 'text-glow' : 'text-accent/30'}`} />
                        </div>
                        <span className="font-bold text-sm truncate">{leader.nome}</span>
                    </div>
                    <div className="col-span-3 md:col-span-2 flex items-center justify-end gap-1 font-mono text-glow">
                        {(leader.coins || 0).toLocaleString()} <Coins className="w-3 h-3 opacity-50" />
                    </div>
                    <div className="col-span-3 md:col-span-3 flex items-center justify-end gap-1 font-mono text-cyber-blue">
                        {(leader.xp || 0).toLocaleString()} <Zap className="w-3 h-3 opacity-50" />
                    </div>
                </motion.div>
            ))}

            {leaders.length === 0 && !loading && (
                <div className="text-center py-20 text-accent/20 uppercase text-xs">Nenhum protocolo registrado no cluster.</div>
            )}
        </div>
      </div>
    </div>
  );
}
