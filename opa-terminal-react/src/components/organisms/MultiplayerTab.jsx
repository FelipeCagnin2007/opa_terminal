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
        .select(`
          *,
          usuarios (nome)
        `)
        .eq('status', 'waiting')
        .order('created_at', { ascending: false });

      if (data) setRooms(data);
      setIsLoading(false);
    };

    fetchRooms();

    const channelId = `rooms_list_${Math.random().toString(36).slice(2, 7)}`;
    const channel = supabase
      .channel(channelId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_rooms' }, fetchRooms)
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
        
        // Finalize positions for Dupla (fill remaining with CPU)
        if (room.game_state.mode === 'dupla') {
           newPositions[2] = 'CPU_PARTNER';
           newPositions[1] = 'CPU_OPP_1';
           newPositions[3] = 'CPU_OPP_2';
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
        <div className="h-full relative">
            <button 
                onClick={() => setSelectedRoomId(null)}
                className="absolute top-4 left-4 z-50 text-glow flex items-center gap-2 text-xs font-black p-2 bg-black/40 rounded-lg border border-glow/20"
            >
                <ArrowLeft className="w-4 h-4" /> SAIR_SALA
            </button>
            <TrucoBoard roomId={selectedRoomId} profile={profile} onExit={() => setSelectedRoomId(null)} />
        </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 h-full">
      {/* Header Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white/5 p-6 border-2 border-white/5 rounded-2xl flex flex-col gap-3">
            <h3 className="text-white font-black uppercase tracking-widest text-xs flex items-center gap-2">
                <Users className="w-4 h-4 text-glow" />
                HUB MULTIPLAYER
            </h3>
            <p className="text-[11px] text-white/50 uppercase leading-relaxed font-bold">
                Conecte-se com outros protocolos para sessões de Truco OPA ou desafios cooperativos de otimização.
            </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => createRoom('solo')} className="flex-grow min-w-[100px] py-6 flex flex-col items-center gap-2">
                <User className="w-5 h-5" />
                <span>SOLO</span>
            </Button>
            <Button variant="glow" onClick={() => createRoom('dupla')} className="flex-grow min-w-[100px] py-6 flex flex-col items-center gap-2">
                <Users className="w-5 h-5" />
                <span>DUPLA</span>
            </Button>
            <Button variant="accent" onClick={() => createRoom('quarteto')} className="flex-grow min-w-[100px] py-6 flex flex-col items-center gap-2">
                <Plus className="w-5 h-5" />
                <span>GRUPO</span>
            </Button>
        </div>
      </div>

      {/* Rooms List */}
      <div className="flex-grow">
        <h4 className="text-[10px] text-white font-black uppercase tracking-[0.3em] mb-6 border-b-2 border-white/5 pb-3">
            SESSÕES_ATIVAS (AGUARDANDO_CONEXÃO)
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.map((room) => (
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={room.id}
                    className="bg-white/5 border-2 border-white/5 p-6 rounded-2xl flex flex-col gap-4 hover:border-glow/20 transition-all hover:-translate-y-1"
                >
                    <div className="flex justify-between items-start">
                        <div className="flex flex-col gap-1">
                            <span className="text-[9px] bg-glow text-bg px-2 py-0.5 rounded uppercase font-black">
                                {room.game_state.mode || 'TRUCO'}
                            </span>
                            <h5 className="mt-1 text-white font-black text-sm">#{room.id.slice(0, 8)}</h5>
                        </div>
                        <div className="p-2 bg-white/5 rounded-lg">
                            <Users className="w-3 h-3 text-white/40" />
                        </div>
                    </div>

                    <div className="text-[10px] text-white/60 flex flex-col gap-1 uppercase font-bold">
                        <div className="flex justify-between">
                            <span>HOST:</span> 
                            <b className="text-white">{room.usuarios?.nome || 'ANON'}</b>
                        </div>
                        <div className="flex justify-between">
                            <span>STATUS:</span> 
                            <span className="text-glow animate-pulse">ESTÁVEL</span>
                        </div>
                    </div>

                    <Button 
                        variant="glow" 
                        onClick={() => joinRoom(room)}
                        className="w-full mt-2"
                    >
                        INICIAR_CONEXÃO
                    </Button>
                </motion.div>
            ))}

            {rooms.length === 0 && !isLoading && (
                <div className="col-span-full py-24 flex flex-col items-center justify-center text-white/10 uppercase gap-6 text-center">
                    <Info className="w-16 h-16 opacity-5" />
                    <p className="text-sm font-black tracking-widest">&gt; NENHUMA SALA DETECTADA NO CLUSTER</p>
                    <p className="text-[10px]">Crie uma nova sala para iniciar o protocolo.</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
