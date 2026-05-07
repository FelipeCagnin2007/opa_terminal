import { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { useAuthContext } from '../../context/AuthContext';
import { Button } from '../atoms/Button';
import { Users, Plus, Play, Info, ArrowLeft, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrucoBoard } from './TrucoBoard';
import { initializeTrucoState } from '../../utils/trucoLogic';

export function MultiplayerTab() {
  const { profile } = useAuthContext();
  const [rooms, setRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRoomId, setSelectedRoomId] = useState(null);

  useEffect(() => {
    const fetchRooms = async () => {
      const { data } = await supabase
        .from('game_rooms')
        .select('id, host_id, status, created_at, game_state, usuarios (nome)')
        .eq('status', 'waiting')
        .order('created_at', { ascending: false });

      if (data) setRooms(data);
      setIsLoading(false);
    };

    fetchRooms();

    // Stable channel ID — prevents duplicate channels on re-mount
    const channel = supabase
      .channel('game_rooms_list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_rooms' }, (payload) => {
        // Apply delta directly — no full re-fetch on every event
        if (payload.eventType === 'INSERT' && payload.new.status === 'waiting') {
          setRooms(prev => [payload.new, ...prev]);
        } else if (payload.eventType === 'DELETE') {
          setRooms(prev => prev.filter(r => r.id !== payload.old.id));
        } else if (payload.eventType === 'UPDATE') {
          if (payload.new.status !== 'waiting') {
            // Room is no longer available — remove from list
            setRooms(prev => prev.filter(r => r.id !== payload.new.id));
          } else {
            setRooms(prev => prev.map(r => r.id === payload.new.id ? payload.new : r));
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const createRoom = async (mode = 'dupla') => {
    if (!profile) return;
    
    let initialState = {
        mode: mode,
        players: [profile.id], 
        positions: { 0: profile.id },
        score: { ours: 0, theirs: 0 }
    };

    // If Solo, initialize immediately
    if (mode === 'solo') {
        const soloPositions = { 0: profile.id, 1: 'CPU_1', 2: 'CPU_2', 3: 'CPU_3' };
        initialState = initializeTrucoState(initialState, soloPositions);
    }

    console.log("[MULTIPLAYER] Iniciando criação de sala...", mode);
    
    const { data, error } = await supabase
      .from('game_rooms')
      .insert([
        { 
          game_type: 'truco', 
          host_id: profile.id, 
          status: mode === 'solo' ? 'playing' : 'waiting',
          game_state: initialState
        }
      ])
      .select()
      .single();

    if (error) {
        console.error("[MULTIPLAYER] Erro ao criar sala:", error.message, error.details);
        alert(`PROTOCOLO_FALHOU: ${error.message}`);
    } else if (data) {
        console.log("[MULTIPLAYER] Sala criada com sucesso:", data.id);
        setSelectedRoomId(data.id);
    }
  };

  const joinRoom = async (room) => {
    if (!profile) return;

    // Prevent duplicate entry
    if (room.game_state.players.includes(profile.id) && room.host_id !== profile.id) {
        alert("PROTOCOLO_NEGADO: Você já está nesta mesa em outra instância.");
        return;
    }

    if (room.host_id === profile.id) {
        setSelectedRoomId(room.id);
        return;
    }

    const playersCount = room.game_state.players.length;
    const maxPlayers = room.game_state.mode === 'quarteto' ? 4 : (room.game_state.mode === 'dupla' ? 2 : 1);

    if (playersCount >= maxPlayers) {
        alert("SALA_LOTADA: Capacidade máxima do protocolo atingida.");
        return;
    }

    const newPlayers = [...room.game_state.players, profile.id];
    const newPositions = { ...room.game_state.positions, [playersCount]: profile.id };
    
    let nextStatus = 'waiting';
    let finalGameState = { ...room.game_state, players: newPlayers, positions: newPositions };

    // If room is full, start the game (Paulista Shuffle)
    if (newPlayers.length === maxPlayers || (room.game_state.mode === 'dupla' && newPlayers.length === 2)) {
        nextStatus = 'playing';
        
        // Fill remaining slots with CPUs correctly
        // Team 1: 0, 2 | Team 2: 1, 3
        if (room.game_state.mode === 'dupla') {
           // In dupla (2 humans), ensure pos 0 and 1 are kept (they are opponents)
           // and fill pos 2 and 3 with CPUs as their partners
           if (!newPositions[2]) newPositions[2] = 'CPU_PARTNER_0';
           if (!newPositions[3]) newPositions[3] = 'CPU_PARTNER_1';
        } else if (room.game_state.mode === 'quarteto') {
            // Quarteto needs 4 humans, but if we start early or something, fill rest
            for (let i = 0; i < 4; i++) {
                if (!newPositions[i]) newPositions[i] = `CPU_${i}`;
            }
        }
        
        finalGameState = initializeTrucoState(finalGameState, newPositions);
    }

    const { error } = await supabase
        .from('game_rooms')
        .update({ status: nextStatus, game_state: finalGameState })
        .eq('id', room.id);
    
    if (error) {
        console.error("[MULTIPLAYER] Erro ao entrar na sala:", error.message);
        alert(`FALHA_CONEXAO: ${error.message}`);
    } else {
        setSelectedRoomId(room.id);
    }
  };

  if (selectedRoomId) {
    return (
        <AnimatePresence>
            <motion.div 
                initial={{ opacity: 0, y: 50, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 50, scale: 0.95 }}
                className="fixed inset-0 z-[5000] w-screen h-screen bg-black"
            >
                <Button 
                    onClick={() => setSelectedRoomId(null)}
                    variant="primary"
                    className="absolute top-6 left-6 z-[6000] px-6 py-2 shadow-pop backdrop-blur-md"
                >
                    <ArrowLeft className="w-5 h-5" /> SAIR DA MESA
                </Button>
                <TrucoBoard roomId={selectedRoomId} profile={profile} onExit={() => setSelectedRoomId(null)} />
            </motion.div>
        </AnimatePresence>
    );
  }

  return (
    <div className="flex flex-col gap-8 md:gap-10 h-full p-2 md:p-6 lg:p-10 relative overflow-x-hidden">
      <div className="noise-bg absolute inset-0 opacity-5 pointer-events-none" />

      {/* Header Info */}
      <div className="grid grid-cols-1 md:grid-cols-[2fr_3fr] gap-6 md:gap-8 relative z-10">
        <div className="bg-surface-100/40 backdrop-blur-xl p-6 md:p-8 border border-border rounded-[1.5rem] md:rounded-[2.5rem] flex flex-col gap-4 shadow-main relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity duration-1000">
              <Users className="w-32 h-32 text-primary" />
            </div>
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-pop relative z-10">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div className="relative z-10">
              <h3 className="text-text-main text-xl md:text-2xl font-black uppercase tracking-[0.15em] md:tracking-[0.2em] mb-2">
                  CENTRAL_MULTIJOGADOR
              </h3>
              <p className="text-[9px] md:text-[10px] text-text-muted uppercase leading-relaxed font-bold tracking-[0.2em] md:tracking-[0.3em]">
                  Estabeleça conexão com outros protocolos para sessões de Truco OPA ou otimização cooperativa.
              </p>
            </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch gap-4">
            <button onClick={() => createRoom('solo')} className="flex-1 bg-surface-100/30 backdrop-blur-md border border-border hover:border-border/50 hover:bg-surface-200/50 transition-all duration-300 rounded-[2rem] flex flex-col items-center justify-center gap-4 py-8 shadow-main group">
                <User className="w-8 h-8 text-text-muted/20 group-hover:text-text-main transition-colors" />
                <span className="text-xs font-black uppercase tracking-[0.4em] text-text-muted/60 group-hover:text-text-main transition-colors">SOLO_MODE</span>
            </button>
            <Button 
                onClick={() => createRoom('dupla')} 
                variant="primary"
                className="flex-1 flex flex-col items-center justify-center gap-4 py-8 group rounded-[2rem] shadow-pop"
            >
                <Users className="w-8 h-8 group-hover:scale-110 transition-transform duration-500" />
                <span className="text-xs font-black uppercase tracking-[0.4em]">DUO_LINK</span>
            </Button>
            <button onClick={() => createRoom('quarteto')} className="flex-1 bg-surface-100/30 backdrop-blur-md border border-accent/30 hover:border-accent/60 hover:bg-accent/5 transition-all duration-300 rounded-[2rem] flex flex-col items-center justify-center gap-4 py-8 shadow-pop-accent group">
                <Plus className="w-8 h-8 text-accent/60 group-hover:text-accent transition-colors" />
                <span className="text-xs font-black uppercase tracking-[0.4em] text-accent/80 group-hover:text-accent transition-colors">GROUP_NET</span>
            </button>
        </div>
      </div>

      {/* Rooms List */}
      <div className="flex-grow flex flex-col gap-6 relative z-10">
        <h4 className="text-[10px] text-text-muted font-black uppercase tracking-[0.5em] flex items-center gap-4">
            <span className="w-1.5 h-1.5 bg-primary rounded-full shadow-pop animate-pulse" />
            ACTIVE_SESSIONS (AWAITING_CONNECTION)
            <div className="flex-grow h-px bg-border/20" />
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {rooms.map((room, index) => (
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    key={room.id}
                    className="bg-surface-100/40 backdrop-blur-xl border border-border p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] flex flex-col gap-6 hover:border-primary/30 hover:shadow-pop transition-all duration-500 hover:-translate-y-2 group"
                >
                    <div className="flex justify-between items-start">
                        <div className="flex flex-col gap-2">
                            <span className="text-[8px] bg-surface-200 text-text-muted border border-border px-3 py-1 rounded-full uppercase font-black tracking-[0.3em] inline-block w-fit">
                                {room.game_state.mode || 'TRUCO_CORE'}
                            </span>
                            <h5 className="text-text-main font-black text-lg tracking-widest mt-1">#{room.id.slice(0, 6)}</h5>
                        </div>
                        <div className="w-10 h-10 bg-surface-200 border border-border rounded-xl flex items-center justify-center group-hover:bg-primary/10 group-hover:border-primary/20 transition-colors duration-500">
                            <Users className="w-4 h-4 text-text-muted/20 group-hover:text-primary transition-colors duration-500" />
                        </div>
                    </div>

                    <div className="text-[9px] text-text-muted flex flex-col gap-3 uppercase font-black tracking-[0.3em] bg-surface-200 p-4 rounded-2xl border border-border/10">
                        <div className="flex justify-between items-center">
                            <span>HOST:</span> 
                            <b className="text-text-main/80 truncate max-w-[100px]">{room.usuarios?.nome || 'ANONYMOUS'}</b>
                        </div>
                        <div className="flex justify-between items-center">
                            <span>STATUS:</span> 
                            <span className="text-primary flex items-center gap-2">
                              <span className="w-1 h-1 bg-primary rounded-full animate-ping" />
                              ESTÁVEL
                            </span>
                        </div>
                    </div>

                    <Button 
                        onClick={() => joinRoom(room)}
                        variant="primary"
                        className="w-full mt-auto py-4 text-[10px]"
                    >
                        INITIATE_CONNECTION
                    </Button>
                </motion.div>
            ))}

            {rooms.length === 0 && !isLoading && (
                <div className="col-span-full py-20 md:py-32 flex flex-col items-center justify-center gap-6 md:gap-8 text-center bg-surface-100/20 backdrop-blur-sm rounded-[2rem] md:rounded-[3rem] border border-border border-dashed">
                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-full border border-border flex items-center justify-center relative">
                      <div className="absolute inset-0 border border-border/10 rounded-full scale-150 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]" />
                      <Info className="w-6 h-6 md:w-8 md:h-8 text-text-muted/20" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs md:text-sm text-text-muted/60 font-black tracking-[0.2em] md:tracking-[0.3em] uppercase">NENHUMA_SESSÃO_DETECTADA</p>
                      <p className="text-[9px] md:text-[10px] text-text-muted/30 tracking-[0.3em] md:tracking-[0.4em] uppercase font-bold">Inicialize um novo protocolo para começar.</p>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
