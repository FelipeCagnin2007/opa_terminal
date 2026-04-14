import { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, User, ArrowLeft, Cpu, Zap, MessageSquare } from 'lucide-react';
import { Button } from '../atoms/Button';
import { getCPUMove, autoRespondToTruco } from '../../utils/trucoAI';
import { getCardPower, resolveRound, createDeck, getManilhaValue } from '../../utils/trucoLogic';
import { usePet } from '../../context/PetContext';

const SUIT_ICONS = {
  'Ouros': { symbol: '♦', color: '#ef4444' }, // Red
  'Espadas': { symbol: '♠', color: '#ffffff' }, // White
  'Copas': { symbol: '♥', color: '#ef4444' }, // Red
  'Paus': { symbol: '♣', color: '#ffffff' } // White
};

const Card = ({ card, size = 'md', isVira = false, className = '' }) => {
  const suitInfo = SUIT_ICONS[card.suit] || { symbol: '?', color: '#ffffff' };
  
  return (
      <div className={`relative bg-white rounded-xl flex flex-col items-center justify-center font-black shadow-2xl border-2 border-black/5 overflow-hidden transform transition-all hover:scale-105 ${size === 'lg' ? 'w-20 h-32 md:w-24 md:h-36' : size === 'sm' ? 'w-12 h-18 md:w-16 md:h-24' : 'w-16 h-28 md:w-20 md:h-32'} ${isVira ? 'border-glow shadow-glow-sm' : ''} ${className}`}>
          <span className={`absolute top-1 left-1 text-[10px] md:text-sm`} style={{ color: suitInfo.color }}>{suitInfo.symbol}</span>
          <span className="text-3xl md:text-5xl text-black leading-none">{card.value}</span>
          <span className={`text-xl md:text-2xl mt-1`} style={{ color: suitInfo.color }}>{suitInfo.symbol}</span>
          <span className={`absolute bottom-1 right-1 text-[10px] md:text-sm rotate-180`} style={{ color: suitInfo.color }}>{suitInfo.symbol}</span>
          {isVira && <div className="absolute inset-0 bg-glow/5 animate-pulse" />}
      </div>
  );
};

export function TrucoBoard({ roomId, profile, onExit }) {
  const { addReward } = usePet();
  const [gameState, setGameState] = useState(null);
  const [myPosition, setMyPosition] = useState(null);
  const [isMyTurn, setIsMyTurn] = useState(false);

  useEffect(() => {
    // Use a unique session ID for the channel
    const channelId = `room_${roomId}_${Math.random().toString(36).slice(2, 7)}`;
    const channel = supabase
      .channel(channelId)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'game_rooms',
        filter: `id=eq.${roomId}`
      }, (payload) => {
        setGameState(payload.new.game_state);
      })
      .subscribe();

    // 2. Initial Fetch
    const fetchGame = async () => {
      const { data } = await supabase
        .from('game_rooms')
        .select('*')
        .eq('id', roomId)
        .single();
      
      if (data) setGameState(data.game_state);
    };

    fetchGame();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  useEffect(() => {
    if (!gameState || !profile) return;
    
    // Find my position (0, 1, 2 or 3)
    const pos = Object.keys(gameState.positions).find(k => gameState.positions[k] === profile.id);
    setMyPosition(pos !== undefined ? parseInt(pos) : null);

    // Determine turn
    setIsMyTurn(gameState.currentTurn === profile.id);
  }, [gameState, profile]);

  // CPU MOVE TRIGGER
  useEffect(() => {
    if (!gameState || !gameState.currentTurn) return;
    
    // 1. Handle Truco Responses
    if (gameState.trucoChallenge && gameState.trucoChallenge.challenger !== profile.id) {
        const targetPos = (Object.keys(gameState.positions).find(k => gameState.positions[k] === profile.id) + 1) % 4; // Simplified: check if partners or single
        // Actually, in Solo/Multi, we need to check if any CPU is on the target team
        const isCpuTarget = gameState.currentTurn.toString().startsWith('CPU_');
        
        if (isCpuTarget && gameState.trucoChallenge.status === 'pending') {
            const cpuId = gameState.currentTurn;
            const cpuPos = Object.keys(gameState.positions).find(k => gameState.positions[k] === cpuId);
            const response = autoRespondToTruco(gameState.hands[cpuPos], gameState.vira, gameState);
            
            setTimeout(() => handleTrucoResponse(response === 'ACCEPTED'), 2000);
            return;
        }
    }

    // 2. Handle Normal Moves
    const isCpuTurn = gameState.currentTurn.toString().startsWith('CPU_');
    if (isCpuTurn && !gameState.trucoChallenge) {
        const cpuId = gameState.currentTurn;
        const cpuPos = Object.keys(gameState.positions).find(k => gameState.positions[k] === cpuId);
        
        if (cpuPos !== undefined) {
            const timeout = setTimeout(() => executeCPUMove(parseInt(cpuPos)), 2000);
            return () => clearTimeout(timeout);
        }
    }
  }, [gameState?.currentTurn, gameState?.trucoChallenge]);

  const executeCPUMove = async (cpuPos) => {
    const cpuId = gameState.positions[cpuPos];
    const cpuHand = gameState.hands[cpuPos];
    
    if (!cpuHand || cpuHand.length === 0) return;

    const move = getCPUMove(cpuHand, gameState.table, gameState.vira, gameState);
    if (move) {
        await handlePlayCard(cpuHand[move.cardIndex], cpuPos);
    }
  };

  const handlePlayCard = async (card, pos) => {
    const newHand = (gameState.hands[pos] || []).filter(c => c.value !== card.value || c.suit !== card.suit);
    const newTable = [...(gameState.table || []), { player: gameState.positions[pos], card, pos }];
    
    let newState = {
        ...gameState,
        table: newTable,
        hands: {
            ...gameState.hands,
            [pos]: newHand
        }
    };

    // Determine Turn Strategy
    const maxTableSize = gameState.mode === 'solo' || gameState.mode === 'quarteto' ? 4 : 2;
    if (newTable.length < maxTableSize) {
        // Normal clockwise turn
        const nextPos = (pos + 1) % 4;
        newState.currentTurn = gameState.positions[nextPos];
    } else {
        // Round ends. Stop turns until Host resolves.
        newState.currentTurn = 'WAITING_RESOLUTION';
    }

    if (newTable.length === maxTableSize) {
        // HOST AUTHORITY: Resolve the round
        if (profile.id === gameState.host_id || gameState.positions[0] === profile.id) {
            setTimeout(async () => {
                const result = resolveRound(newTable, gameState.vira);
                
                let nextRound = (gameState.currentRound || 0);
                let roundWinners = [...(gameState.roundPoints || [])];
                let nextTurnId = null;
                
                if (result.draw) {
                    roundWinners[nextRound] = 0;
                    // In case of draw, previous winner or first player starts
                    nextTurnId = newTable[0].player;
                } else {
                    const winnerPos = result.pos;
                    const winningTeam = (winnerPos === 0 || winnerPos === 2) ? 'ours' : 'theirs';
                    roundWinners[nextRound] = winningTeam === 'ours' ? 1 : 2;
                    nextTurnId = gameState.positions[winnerPos];
                    newState.lastWinner = winnerPos;
                }

                const team1Wins = roundWinners.filter(w => w === 1).length;
                const team2Wins = roundWinners.filter(w => w === 2).length;
                let isHandOver = team1Wins >= 2 || team2Wins >= 2;
                
                let finalState = {
                    ...newState,
                    table: [],
                    roundPoints: roundWinners,
                    currentRound: nextRound + 1,
                    currentTurn: nextTurnId
                };

                if (isHandOver) {
                   const points = gameState.handPoints || 1;
                   if (team1Wins >= 2) finalState.score.ours += points;
                   else finalState.score.theirs += points;
                   
                   if (finalState.score.ours >= 12) finalState.winner = 'ours';
                   else if (finalState.score.theirs >= 12) finalState.winner = 'theirs';

                   if (finalState.winner) {
                        finalState.status = 'finished';
                        if (finalState.winner === 'ours') addReward(100, 200);
                   } else {
                       // Hand is Over, but not game. DEAL NEW HAND.
                       const freshState = initializeTrucoState({ score: finalState.score }, finalState.positions);
                       finalState = { ...finalState, ...freshState };
                   }
                }

                await supabase.from('game_rooms').update({ 
                    game_state: finalState,
                    status: finalState.status || 'playing' 
                }).eq('id', roomId);
            }, 2000);
        }
    }

    // Reward the user for active participation
    if (pos === myPosition) {
        addReward(2, 5); // +2 coins, +5 xp per card
    }

    await supabase
        .from('game_rooms')
        .update({ game_state: newState })
        .eq('id', roomId);
    
    // If round ends, extra group reward
    if (newTable.length === maxTableSize) {
        addReward(10, 20); // Bonus for finishing a round
    }
  };

  const callTruco = async () => {
    if (!isMyTurn || gameState.trucoChallenge) return;
    
    const nextPoints = gameState.handPoints === 1 ? 3 : gameState.handPoints + 3;
    if (nextPoints > 12) return;

    await supabase.from('game_rooms').update({
        game_state: {
            ...gameState,
            handPoints: nextPoints,
            trucoChallenge: {
                challenger: profile.id,
                status: 'pending',
                value: nextPoints
            }
        }
    }).eq('id', roomId);
  };

  const handleTrucoResponse = async (accept) => {
    if (!gameState.trucoChallenge) return;

    let newState = { ...gameState };
    if (accept) {
        newState.trucoChallenge = null;
    } else {
        // Team ran away. Points go to challenger.
        const challengerPos = Object.keys(gameState.positions).find(k => gameState.positions[k] === gameState.trucoChallenge.challenger);
        const winningTeam = (challengerPos === "0" || challengerPos === "2") ? 'ours' : 'theirs';
        newState.score[winningTeam] += (gameState.handPoints - 3) || 1; // Previous points
        
        // Reset Hand
        const deck = createDeck();
        newState.hands = { 0: deck.splice(0, 3), 1: deck.splice(0, 3), 2: deck.splice(0, 3), 3: deck.splice(0, 3) };
        newState.vira = deck.splice(0, 1)[0];
        newState.currentRound = 0;
        newState.roundPoints = [];
        newState.handPoints = 1;
        newState.trucoChallenge = null;
        newState.table = [];
    }

    await supabase.from('game_rooms').update({ game_state: newState }).eq('id', roomId);
  };

  const playMyCard = (cardIndex) => {
    if (!isMyTurn || myPosition === null || gameState.trucoChallenge) return;
    const card = gameState.hands[myPosition][cardIndex];
    handlePlayCard(card, myPosition);
  };

  const positions = [0, 1, 2, 3]; 
  
  return (
    <div className="h-full flex flex-col font-terminal relative overflow-hidden bg-black/40 backdrop-blur-md">
      {/* Table HUD */}
      <div className="absolute top-4 left-4 right-4 z-[60] flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="bg-white/5 border-2 border-white/10 px-4 py-2 rounded-xl backdrop-blur-xl flex items-center gap-3 shadow-2xl">
              <div className="flex items-center gap-4 px-2">
                <div className="flex flex-col">
                    <span className="text-[8px] text-white/40 font-black uppercase tracking-widest block">TIME_A</span>
                    <span className="text-xl font-black text-glow">{gameState.score?.ours || 0}</span>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div className="flex flex-col">
                    <span className="text-[8px] text-white/40 font-black uppercase tracking-widest block">TIME_B</span>
                    <span className="text-xl font-black text-white">{gameState.score?.theirs || 0}</span>
                </div>
              </div>
          </div>

          <div className="flex flex-col items-center gap-1">
            <span className="text-[7px] text-white/40 font-black uppercase tracking-[0.3em]">PROGRESSO_DA_MÃO</span>
            <div className="flex gap-4">
                {[0, 1, 2].map(i => {
                    const winner = gameState.roundPoints?.[i];
                    return (
                        <div key={i} className={`w-4 h-4 rounded-sm border-2 rotate-45 flex items-center justify-center transition-all duration-500 ${winner === 1 ? 'bg-glow border-glow shadow-glow scale-110' : winner === 2 ? 'bg-cyber-blue border-cyber-blue shadow-cyber-blue scale-110' : 'border-white/10 bg-white/5 opacity-30'}`}>
                            {winner !== undefined && <div className="w-1 h-1 bg-white/50 rounded-full" />}
                        </div>
                    );
                })}
            </div>
          </div>

          <div className="bg-glow/10 border border-glow/20 px-6 py-2 rounded-xl flex items-center gap-3">
             <div className="w-1.5 h-1.5 bg-glow rounded-full animate-blink" />
             <span className="text-[12px] font-black text-glow uppercase tracking-[0.2em]">{gameState.handPoints || 1} PONTOS EM JOGO</span>
          </div>
      </div>

      {/* Main Table Area */}
      <div className="flex-grow relative flex items-center justify-center p-4">
        {/* Opponents & Partner Positions */}
        {positions.map((pos) => {
            const isUser = pos === myPosition;
            const playerId = gameState.positions[pos];
            if (!playerId) return null;
            
            const isCPU = playerId.toString().startsWith('CPU_');
            const handCount = gameState.hands[pos]?.length || 0;
            const activeTurn = gameState.currentTurn === playerId;

            // positioning relative to user at 0
            const posStyles = [
                "bottom-2 md:bottom-10",  // 0
                "right-2 md:right-10",   // 1
                "top-24 md:top-10",     // 2
                "left-2 md:left-10"      // 3
            ];

            return (
                <div key={pos} className={`absolute ${posStyles[pos]} flex flex-col items-center gap-2 z-20 transition-all duration-500`}>
                    <div className={`w-12 h-12 md:w-16 md:h-16 rounded-full border-2 flex items-center justify-center p-1 transition-all ${activeTurn ? 'border-glow scale-110 shadow-glow bg-glow/5' : 'border-white/10 opacity-50'}`}>
                         <div className="w-full h-full rounded-full bg-white/5 flex items-center justify-center shadow-inner">
                            {isCPU ? <Cpu className="w-5 h-5 md:w-7 md:h-7 text-white" /> : <User className="w-5 h-5 md:w-7 md:h-7 text-white" />}
                         </div>
                    </div>
                    <div className="flex flex-col items-center bg-black/60 px-3 py-1.5 rounded-lg border border-white/5 backdrop-blur-md">
                        <span className="text-[7px] font-black uppercase text-white/30 tracking-[0.2em] mb-0.5">P{pos}</span>
                        <span className="text-[9px] font-black text-white truncate max-w-[70px] uppercase">
                            {isUser ? 'VOCÊ' : (isCPU ? 'BIT_BOT' : 'PLAYER')}
                        </span>
                        {handCount > 0 && (
                            <div className="flex gap-0.5 mt-1">
                                {[...Array(handCount)].map((_, i) => (
                                    <div key={i} className="w-1.5 h-2.5 bg-glow rounded-sm shadow-glow" />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            );
        })}

        {/* Center Mesa (Responsive) */}
        <div className="w-56 h-56 s-small:w-64 s-small:h-64 md:w-96 md:h-96 rounded-full border-2 border-white/5 bg-white/5 relative flex items-center justify-center backdrop-blur-2xl shadow-inner">
            <div className="absolute inset-0 rounded-full border-2 border-glow/5 opacity-20 animate-pulse" />
            
            {/* The VIRA */}
            {gameState.vira && (
                <div className="absolute top-0 -translate-y-1/2 z-[70] transform hover:scale-110 transition-transform">
                    <Card card={gameState.vira} size="sm" isVira />
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-glow text-bg text-[7px] font-black px-2 py-0.5 rounded-full shadow-glow whitespace-nowrap">VIRA_SISTEMA</span>
                </div>
            )}

            {/* Cards on Table */}
            <AnimatePresence>
                {gameState.table?.map((play, idx) => {
                    const rotations = [0, 90, 180, 270];
                    const offsets = [
                        {y: 35}, // Bottom
                        {x: 35}, // Right
                        {y: -35},// Top
                        {x: -35} // Left
                    ];
                    return (
                        <motion.div 
                            initial={{ scale: 0, opacity: 0, rotate: rotations[play.pos] - 45 }}
                            animate={{ scale: 1, opacity: 1, x: offsets[play.pos]?.x || 0, y: offsets[play.pos]?.y || 0, rotate: rotations[play.pos] }}
                            key={idx}
                            className="absolute z-10"
                        >
                            <Card card={play.card} size="sm" />
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
      </div>

      {/* Footer: User Hand */}
      <div className="h-44 md:h-48 bg-white/5 border-t-2 border-white/10 backdrop-blur-3xl flex items-center justify-center p-4 gap-3 z-[100]">
        <div className="absolute top-[-30px] left-1/2 -translate-x-1/2 flex gap-4">
            <Button 
                onClick={callTruco} 
                className="bg-glow text-bg font-black px-8 py-2 border-b-4 border-black/20 hover:scale-105 active:scale-95 transition-all text-xs"
                disabled={!isMyTurn || !!gameState.trucoChallenge}
            >
                TRUCO!
            </Button>
        </div>

        <AnimatePresence mode="popLayout">
            {myPosition !== null && gameState.hands[myPosition]?.map((card, idx) => (
                <motion.button
                    layout
                    initial={{ y: 80, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    whileHover={{ y: -30, scale: 1.1 }}
                    whileTap={{ scale: 0.9, y: 0 }}
                    onClick={() => playMyCard(idx)}
                    disabled={!isMyTurn}
                    key={card.value + card.suit}
                    className={`group relative transition-all ${!isMyTurn ? 'opacity-40 grayscale cursor-not-allowed' : 'cursor-pointer'}`}
                >
                    <Card card={card} size="lg" className={isMyTurn ? 'border-glow shadow-glow-sm' : ''} />
                    {isMyTurn && (
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-glow text-bg text-[7px] font-black px-2 py-0.5 rounded-full shadow-glow opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap uppercase">
                            EXECUTAR_PLAY
                        </div>
                    )}
                </motion.button>
            ))}
        </AnimatePresence>

        {(!myPosition === null || (!gameState.hands[myPosition] || gameState.hands[myPosition].length === 0)) && (
            <div className="flex flex-col items-center gap-6">
                <div className="flex flex-col items-center gap-2">
                    <span className="text-[9px] text-white/20 font-black uppercase tracking-[0.4em] animate-pulse">Sincronizando_Jogadas</span>
                    <div className="w-12 h-1 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-glow w-1/2 animate-shimmer" />
                    </div>
                </div>
                <Button variant="danger" onClick={onExit} className="px-8 text-[9px]">INTERROMPER_SESSÃO</Button>
            </div>
        )}
      </div>

      {/* Turn Banner */}
      {isMyTurn && !gameState.trucoChallenge && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-24 left-1/2 -translate-x-1/2 z-[110] bg-white text-bg px-6 py-2 rounded-full font-black text-[10px] tracking-[0.2em] shadow-glow border-2 border-glow uppercase"
          >
            TERMINAL_STATUS: SUA_VEZ
          </motion.div>
      )}

      {/* Round Result Banner */}
      <AnimatePresence>
        {gameState.lastWinner && !gameState.table.length && gameState.currentRound > 0 && (
            <motion.div 
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[150] pointer-events-none"
            >
                <div className="bg-glow/20 border-2 border-glow backdrop-blur-xl px-8 py-4 rounded-2xl shadow-glow text-center">
                    <span className="text-[10px] text-white/60 font-black block mb-1">RODADA_VENCIDA_POR:</span>
                    <span className="text-2xl font-black text-glow uppercase tracking-widest">
                        {gameState.positions[gameState.lastWinner] === profile.id ? 'VOCÊ' : 'OPONENTE'}
                    </span>
                </div>
            </motion.div>
        )}
      </AnimatePresence>

      {/* Truco Challenge Modal */}
      <AnimatePresence>
        {gameState.trucoChallenge && (
            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="absolute inset-0 z-[200] flex items-center justify-center p-8 bg-bg/80 backdrop-blur-lg"
            >
                <div className="bg-surface border-4 border-glow p-8 rounded-3xl max-w-sm w-full text-center shadow-[0_0_100px_rgba(0,255,65,0.2)]">
                    <Zap className="w-16 h-16 text-glow mx-auto mb-6 animate-pulse" />
                    <h3 className="text-3xl font-black mb-2 text-glow">TRUCO DESAFIADO!</h3>
                    <p className="text-xs text-white/40 uppercase tracking-widest mb-8">
                        {gameState.trucoChallenge.challenger === profile.id ? 'VOCÊ GRITOU TRUCO!' : 'UM OPONENTE DESAFIOU O PROTOCOLO!'}
                        <br/>VALOR ATUAL: <span className="text-glow">{gameState.trucoChallenge.value} PONTOS</span>
                    </p>

                    {gameState.trucoChallenge.challenger !== profile.id ? (
                        <div className="flex flex-col gap-3">
                            <Button variant="glow" onClick={() => handleTrucoResponse(true)} className="w-full">ACEITAR PROPOSTA</Button>
                            <Button variant="danger" onClick={() => handleTrucoResponse(false)} className="w-full">ABORTAR MISSÃO (FUGIR)</Button>
                        </div>
                    ) : (
                        <p className="text-[10px] text-glow animate-pulse font-black">AGUARDANDO DECISÃO DO OPONENTE...</p>
                    )}
                </div>
            </motion.div>
        )}
      </AnimatePresence>

      {/* Win/Loss Overlay */}
      <AnimatePresence>
        {gameState.winner && (
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 z-[300] bg-bg/95 backdrop-blur-2xl flex items-center justify-center p-8"
            >
                <motion.div 
                    initial={{ scale: 0.8, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    className={`max-w-md w-full p-8 rounded-3xl border-4 text-center shadow-[0_0_100px_rgba(0,255,65,0.1)] ${gameState.winner === 'ours' ? 'border-glow bg-glow/5' : 'border-danger bg-danger/5'}`}
                >
                    <Trophy className={`w-24 h-24 mx-auto mb-6 ${gameState.winner === 'ours' ? 'text-glow' : 'text-danger/40'}`} />
                    <h2 className={`text-5xl font-black mb-4 ${gameState.winner === 'ours' ? 'text-glow' : 'text-danger'}`}>
                        {gameState.winner === 'ours' ? 'VICTORY' : 'DEFEAT'}
                    </h2>
                    <p className="text-xs text-white/40 uppercase tracking-[0.3em] mb-12">
                        {gameState.winner === 'ours' 
                            ? 'PROTOCOLO CONCLUÍDO COM SUCESSO. RECOMPENSAS ADICIONADAS AO CLUSTER.' 
                            : 'CONEXÃO PERDIDA. INTEGRIDADE DO PROTOCOLO COMPROMETIDA.'
                        }
                    </p>
                    
                    <div className="flex flex-col gap-4">
                        <Button variant={gameState.winner === 'ours' ? 'glow' : 'danger'} onClick={onExit} className="w-full py-6 font-black uppercase tracking-widest">
                            FINALIZAR_SESSÃO
                        </Button>
                    </div>
                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
