import { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, User, ArrowLeft, Cpu, Zap, MessageSquare } from 'lucide-react';
import { Button } from '../atoms/Button';
import { getCPUMove, autoRespondToTruco } from '../../utils/trucoAI';
import { getCardPower, resolveRound, createDeck, getManilhaValue, initializeTrucoState } from '../../utils/trucoLogic';
import { usePet } from '../../context/PetContext';

const SUIT_ICONS = {
  'Ouros': { symbol: '♦', color: '#ef4444' }, // Red
  'Espadas': { symbol: '♠', color: '#000000' }, // Black
  'Copas': { symbol: '♥', color: '#ef4444' }, // Red
  'Paus': { symbol: '♣', color: '#000000' } // Black
};

const Card = ({ card, size = 'md', isVira = false, className = '' }) => {
  const suitInfo = SUIT_ICONS[card.suit] || { symbol: '?', color: '#ffffff' };
  
  return (
      <div className={`relative bg-white rounded-xl flex flex-col items-center justify-center font-black shadow-2xl border-2 overflow-hidden transform transition-all hover:scale-105 ${size === 'lg' ? 'w-20 h-32 md:w-24 md:h-36' : size === 'sm' ? 'w-12 h-18 md:w-16 md:h-24' : 'w-16 h-28 md:w-20 md:h-32'} ${isVira ? 'border-[#ffd700] shadow-[0_0_20px_rgba(255,215,0,0.8)]' : 'border-black/5'} ${className}`}>
          {isVira && (
              <div className="absolute top-0 inset-x-0 bg-[#ffd700] text-black text-[7px] md:text-[9px] font-black text-center py-0.5 tracking-widest uppercase z-10">
                  MANILHA
              </div>
          )}
          <span className={`absolute top-3 left-1 text-[10px] md:text-sm`} style={{ color: suitInfo.color }}>{suitInfo.symbol}</span>
          <span className={`text-3xl md:text-5xl text-black leading-none ${isVira ? 'mt-2' : ''}`}>{card.value}</span>
          <span className={`text-xl md:text-2xl mt-1`} style={{ color: suitInfo.color }}>{suitInfo.symbol}</span>
          <span className={`absolute bottom-1 right-1 text-[10px] md:text-sm rotate-180`} style={{ color: suitInfo.color }}>{suitInfo.symbol}</span>
          {isVira && <div className="absolute inset-0 bg-[#ffd700]/10 animate-pulse pointer-events-none" />}
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
    // Only the Host of the room should run the CPU logic to prevent duplicated shots
    if (gameState.host_id === profile.id && gameState.trucoChallenge?.status === 'pending') {
        const challengerId = gameState.trucoChallenge.challenger;
        const challengerPosStr = Object.keys(gameState.positions).find(k => gameState.positions[k] === challengerId);
        
        if (challengerPosStr !== undefined) {
            const challengerPos = parseInt(challengerPosStr);
            // The next player immediately adjacent to the challenger on the opposing team
            const targetPos = (challengerPos + 1) % 4;
            const targetId = gameState.positions[targetPos];

            // Is the responder a CPU?
            if (targetId && targetId.toString().startsWith('CPU_')) {
                const response = autoRespondToTruco(gameState.hands[targetPos] || [], gameState.vira, gameState);
                const timeout = setTimeout(() => handleTrucoResponse(response === 'ACCEPTED'), 2500);
                return () => clearTimeout(timeout);
            }
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
                let roundResultTeam = null;
                
                if (result.draw) {
                    roundWinners[nextRound] = 0; // 0 = draw
                    nextTurnId = newTable[0].player;
                    roundResultTeam = 'draw';
                    newState.lastWinner = 'draw';
                } else {
                    const winnerPos = result.pos;
                    const winningTeam = (winnerPos === 0 || winnerPos === 2) ? 'ours' : 'theirs';
                    roundWinners[nextRound] = winningTeam === 'ours' ? 1 : 2;
                    nextTurnId = gameState.positions[winnerPos];
                    roundResultTeam = winningTeam;
                    newState.lastWinner = winningTeam;
                }

                // Truco Tie-Breaker Logic
                const w1 = roundWinners[0];
                const w2 = roundWinners[1];
                const w3 = roundWinners[2];

                let handWinner = null;
                const team1Wins = roundWinners.filter(w => w === 1).length;
                const team2Wins = roundWinners.filter(w => w === 2).length;

                if (team1Wins >= 2) handWinner = 'ours';
                else if (team2Wins >= 2) handWinner = 'theirs';
                else if (w1 === 0) { // 1st round drew
                    if (w2 === 1 || w3 === 1) handWinner = 'ours';
                    else if (w2 === 2 || w3 === 2) handWinner = 'theirs';
                    else if (w1 === 0 && w2 === 0 && w3 === 0) handWinner = 'draw'; // Triple draw
                } else if (w2 === 0 && w1 !== undefined && w1 !== 0) { // 2nd round drew
                    handWinner = w1 === 1 ? 'ours' : 'theirs';
                } else if (w3 === 0 && w1 !== undefined && w1 !== 0) { // 3rd round drew
                    handWinner = w1 === 1 ? 'ours' : 'theirs';
                }

                let finalState = {
                    ...newState,
                    table: [],
                    roundPoints: roundWinners,
                    currentRound: nextRound + 1,
                    currentTurn: nextTurnId
                };

                if (handWinner) {
                   const points = gameState.handPoints || 1;
                   if (handWinner === 'ours') finalState.score.ours += points;
                   else if (handWinner === 'theirs') finalState.score.theirs += points;
                   
                   if (finalState.score.ours >= 12) finalState.winner = 'ours';
                   else if (finalState.score.theirs >= 12) finalState.winner = 'theirs';

                   if (finalState.winner) {
                        finalState.status = 'finished';
                        if (finalState.winner === 'ours') addReward(100, 200);
                   } else {
                       const freshState = initializeTrucoState({ score: finalState.score }, finalState.positions);
                       finalState = { ...finalState, ...freshState };
                       finalState.lastWinner = roundResultTeam; // Show banner for the last round
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

  // Guard against initial null crash
  if (!gameState || !profile || myPosition === null) {
      return (
          <div className="h-full flex items-center justify-center bg-black/80 backdrop-blur-md">
              <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 border-4 border-glow/20 border-t-glow rounded-full animate-spin" />
                  <span className="text-xs text-glow uppercase tracking-[0.2em] font-black animate-pulse">CARREGANDO APOSTAS...</span>
              </div>
          </div>
      );
  }

  const positions = [0, 1, 2, 3];
  const botNames = ['BOT ALFA', 'BOT BETA', 'BOT GAMA', 'BOT DELTA'];
  
  return (
    <div className="h-full flex flex-col font-terminal relative overflow-hidden bg-[#0a1e12] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#113a22] via-[#0a1e12] to-black">
      {/* HUD Removed from global top. Moved to Main Table Area bottom. */}

      {/* Standalone Vira Slot */}
      {gameState.vira && (
          <div className="absolute top-[30%] md:top-[120px] left-4 md:left-8 z-[70] transform scale-[0.8] md:scale-100 flex flex-col items-center gap-2">
              <span className="bg-black/80 border-2 border-glow text-glow text-[10px] font-black px-4 py-1 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.5)] whitespace-nowrap uppercase tracking-widest">A VIRA</span>
              <Card card={gameState.vira} size="sm" isVira />
          </div>
      )}

      {/* Main Table Area */}
      <div className="flex-grow relative flex items-center justify-center p-4 mt-8 md:mt-0 z-10 w-full h-full max-h-[1000px] max-w-[1200px] mx-auto">
          
          {/* HUD - Placar (Bottom Left) */}
          <div className="absolute bottom-4 md:bottom-8 left-4 md:left-8 z-[60]">
               <div className="bg-black/40 border-2 border-white/10 px-4 py-2 md:px-6 md:py-3 rounded-2xl backdrop-blur-xl flex items-center gap-4 shadow-2xl">
                  <div className="flex items-center gap-4 md:gap-6 px-1 md:px-2">
                    <div className="flex flex-col items-center">
                        <span className="text-[8px] md:text-[10px] text-white/50 font-black uppercase tracking-[0.2em] block mb-1">NÓS</span>
                        <span className="text-xl md:text-2xl font-black text-glow leading-none">{gameState.score?.ours || 0}</span>
                    </div>
                    <div className="w-px h-6 md:h-8 bg-white/20" />
                    <div className="flex flex-col items-center">
                        <span className="text-[8px] md:text-[10px] text-white/50 font-black uppercase tracking-[0.2em] block mb-1">ELES</span>
                        <span className="text-xl md:text-2xl font-black text-white/90 leading-none">{gameState.score?.theirs || 0}</span>
                    </div>
                  </div>
              </div>
          </div>

          {/* HUD - Mãos Ganhas (Bottom Right) */}
          <div className="absolute bottom-4 md:bottom-8 right-4 md:right-8 z-[60]">
              <div className="flex flex-col items-center gap-2 bg-black/40 border-2 border-white/10 px-4 py-2 md:px-6 md:py-3 rounded-2xl backdrop-blur-xl shadow-2xl">
                <span className="text-[7px] md:text-[9px] text-white/50 font-black uppercase tracking-[0.3em]">MÃOS GANHAS</span>
                <div className="flex gap-3 md:gap-4 pt-1">
                    {[0, 1, 2].map(i => {
                        const winner = gameState.roundPoints?.[i];
                        return (
                            <div key={i} className={`w-3 h-3 md:w-4 md:h-4 rounded-sm rotate-45 flex items-center justify-center transition-all duration-300 border-2 ${winner === 1 ? 'bg-glow border-glow shadow-[0_0_15px_rgba(16,185,129,0.8)] scale-125 z-10' : winner === 2 ? 'bg-cyber-blue border-cyber-blue shadow-[0_0_15px_rgba(56,189,248,0.8)] scale-125 z-10' : 'border-white/20 bg-black/50'}`}>
                                {winner !== undefined && <div className="w-1 md:w-1.5 h-1 md:h-1.5 bg-white rounded-full shadow-lg" />}
                            </div>
                        );
                    })}
                </div>
              </div>
          </div>

          {/* HUD - Hand Points (Top Center) */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[60]">
               <div className="bg-glow/20 border-2 border-glow/50 px-4 py-2 md:px-6 md:py-3 rounded-2xl flex items-center gap-2 md:gap-3 shadow-[0_0_20px_rgba(16,185,129,0.2)] backdrop-blur-md">
                 <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-glow rounded-full animate-blink shadow-[0_0_10px_rgba(16,185,129,1)]" />
                 <span className="text-[10px] md:text-xs font-black text-white uppercase tracking-[0.2em] drop-shadow-md">{gameState.handPoints || 1} PONTOS DA MÃO</span>
              </div>
          </div>
        
        {/* Decorative Casino Ring */}
        <div className="absolute inset-2 md:inset-12 border-2 border-white/5 rounded-full pointer-events-none" />

        {/* Center Mesa */}
        <div className="w-[280px] h-[280px] md:w-[600px] md:h-[600px] rounded-full border-4 border-white/10 bg-black/30 relative flex items-center justify-center backdrop-blur-sm shadow-[inset_0_0_120px_rgba(0,0,0,0.9)] z-20">

            {/* Cards on Table */}
            <AnimatePresence>
                {gameState.table?.map((play, idx) => {
                    // Normalize rotation to relative positions
                    const relativePlayPos = (play.pos - myPosition + 4) % 4;
                    const rotations = [0, -90, 180, 90]; 
                    const offsets = [
                        {y: 45}, // Bottom
                        {x: 75}, // Right
                        {y: -45},// Top
                        {x: -75} // Left
                    ];
                    
                    const manilhaValue = gameState.vira ? getManilhaValue(gameState.vira.value) : null;
                    const isPlayManilha = play.card.value === manilhaValue;

                    return (
                        <motion.div 
                            initial={{ scale: 0.5, opacity: 0, rotate: rotations[relativePlayPos] + 45 }}
                            animate={{ scale: 1, opacity: 1, x: offsets[relativePlayPos]?.x || 0, y: offsets[relativePlayPos]?.y || 0, rotate: rotations[relativePlayPos] }}
                            key={idx}
                            className="absolute z-30 drop-shadow-2xl"
                        >
                            <Card card={play.card} size="md" isVira={isPlayManilha} />
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>

        {/* Players Layout */}
        {positions.map((pos) => {
            const isUser = pos === myPosition;
            const playerId = gameState.positions[pos];
            if (!playerId) return null;
            
            const isCPU = playerId.toString().startsWith('CPU_');
            const handCount = gameState.hands?.[pos]?.length || 0;
            const activeTurn = gameState.currentTurn === playerId;

            // positioning relative to user at 0
            const relativePos = (pos - myPosition + 4) % 4;
            const posStyles = [
                "bottom-5 md:bottom-12",  // You (0)
                "right-5 md:right-12",    // Right opponent (1)
                "top-24 md:top-12",       // Partner (2)
                "left-5 md:left-12"       // Left opponent (3)
            ];

            return (
                <div key={pos} className={`absolute ${posStyles[relativePos]} flex flex-col items-center gap-2 z-40 transition-all duration-300`}>
                    <div className={`w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center p-1 transition-all duration-300 ${activeTurn ? 'bg-glow border-2 border-white shadow-[0_0_30px_rgba(16,185,129,0.8)] scale-110' : 'bg-black/60 border-2 border-white/20'}`}>
                         <div className="w-full h-full rounded-full bg-[#0a1e12] flex items-center justify-center shadow-inner">
                            {isCPU ? <Cpu className={`w-8 h-8 ${activeTurn ? 'text-glow' : 'text-white/50'}`} /> : <User className={`w-8 h-8 ${activeTurn ? 'text-glow' : 'text-white/50'}`} />}
                         </div>
                    </div>
                    <div className={`flex flex-col items-center px-4 py-2 rounded-xl backdrop-blur-md shadow-lg border-2 ${activeTurn ? 'bg-glow/20 border-glow' : 'bg-black/80 border-white/10'}`}>
                        <span className="text-[10px] font-black w-full text-center text-white/50 tracking-[0.2em] mb-1 leading-none uppercase">
                            {isUser ? 'TU' : (isCPU ? botNames[pos] : 'ADVERSÁRIO')}
                        </span>
                        {handCount > 0 && (
                            <div className="flex gap-1">
                                {[...Array(handCount)].map((_, i) => (
                                    <div key={i} className={`w-3 h-4 rounded-[2px] border ${isUser ? 'bg-glow border-white' : 'bg-neutral-800 border-neutral-600'}`} />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            );
        })}
      </div>

      {/* Footer: User Hand */}
      <div className="h-48 md:h-56 bg-[#050f09] border-t-4 border-white/10 flex flex-col items-center justify-center p-4 z-[100] relative drop-shadow-[0_-20px_30px_rgba(0,0,0,0.8)]">
        
        {/* TRUCO BUTTON EXPLICIT CLEAR HITBOX */}
        <div className="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2 z-[200]">
            <Button 
                onClick={callTruco} 
                className="bg-glow text-black font-black px-12 py-4 rounded-2xl border-b-4 border-black/40 hover:-translate-y-1 active:translate-y-0 active:border-b-0 transition-all text-sm tracking-[0.3em] uppercase hover:shadow-[0_0_30px_rgba(16,185,129,0.8)] disabled:opacity-20 disabled:grayscale disabled:shadow-none disabled:hover:translate-y-0"
                disabled={!isMyTurn || !!gameState.trucoChallenge}
            >
                TRUCO!
            </Button>
        </div>

        <div className="flex items-center gap-6 md:gap-8 pt-8">
            <AnimatePresence>
                {myPosition !== null && gameState.hands?.[myPosition]?.map((card, idx) => {
                    const manilhaValue = gameState.vira ? getManilhaValue(gameState.vira.value) : null;
                    const isHandManilha = card.value === manilhaValue;

                    return (
                        <motion.button
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 50 }}
                            whileHover={isMyTurn ? { y: -20, scale: 1.1 } : {}}
                            whileTap={isMyTurn ? { scale: 0.95 } : {}}
                            onClick={() => playMyCard(idx)}
                            disabled={!isMyTurn}
                            key={card.value + card.suit}
                            className={`group relative outline-none transition-all duration-300 ${!isMyTurn ? 'opacity-50 grayscale scale-95' : 'hover:z-50 cursor-pointer drop-shadow-2xl'}`}
                        >
                            <Card card={card} size="lg" isVira={isHandManilha} className={`${isMyTurn ? 'border-glow/50' : 'border-white/5'}`} />
                            {isMyTurn && (
                                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-black border border-white/20 text-white text-[8px] font-black px-3 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap uppercase tracking-widest pointer-events-none z-10 shadow-lg">
                                    JOGAR CARTA
                                </div>
                            )}
                        </motion.button>
                    );
                })}
            </AnimatePresence>
        </div>

        {myPosition === null || !gameState.hands || !gameState.hands[myPosition] || gameState.hands[myPosition].length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/80 backdrop-blur-md z-10">
                <span className="text-xs text-glow font-black uppercase tracking-[0.4em] animate-pulse">Aguardando Conexões e Baralho...</span>
                <Button variant="danger" onClick={onExit} className="px-6 py-2 text-[10px] tracking-widest rounded-xl">SAIR DA MESA</Button>
            </div>
        ) : null}
      </div>

      {/* Turn Banner */}
      {isMyTurn && !gameState.trucoChallenge && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-28 left-1/2 -translate-x-1/2 z-[110] bg-surface-brighter text-white px-6 py-2 rounded-full font-black text-[10px] tracking-[0.2em] shadow-lg border border-glow/30 uppercase backdrop-blur-md"
          >
            <span className="text-glow animate-pulse mr-2">●</span> SUA_VEZ
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
                <div className="bg-surface/90 border border-white/10 backdrop-blur-xl px-8 py-5 rounded-3xl shadow-2xl text-center flex flex-col items-center">
                    <span className="text-[9px] text-neutral-400 font-black block mb-2 uppercase tracking-widest">RESULTADO_RODADA</span>
                    <span className="text-2xl md:text-3xl font-black text-white uppercase tracking-widest">
                        {gameState.lastWinner === 'draw' ? <span className="text-neutral-400">EMPATE (CANGOU)</span> : gameState.lastWinner === 'ours' ? <span className="text-glow">VITÓRIA</span> : <span className="text-danger">DERROTA</span>}
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
                className="absolute inset-0 z-[200] flex items-center justify-center p-6 bg-bg/90 backdrop-blur-xl"
            >
                <div className="bg-surface-brighter border border-white/10 p-8 md:p-12 rounded-[2.5rem] max-w-sm w-full text-center shadow-2xl">
                    <div className="w-20 h-20 bg-glow/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Zap className="w-10 h-10 text-glow animate-pulse" />
                    </div>
                    <h3 className="text-3xl font-black mb-3 text-white tracking-widest">TRUCO!</h3>
                    <p className="text-[10px] text-neutral-400 uppercase tracking-widest mb-8 leading-relaxed">
                        {gameState.trucoChallenge.challenger === profile.id ? 'VOCÊ INICIOU O PROTOCOLO DE TRUCO.' : 'UM OPONENTE DESAFIOU O SISTEMA.'}
                        <br/><span className="text-white bg-white/5 border border-white/10 px-3 py-1 rounded-full mt-4 inline-block">VALOR: <span className="text-glow">{gameState.trucoChallenge.value} PONTOS</span></span>
                    </p>

                    {gameState.trucoChallenge.challenger !== profile.id ? (
                        <div className="flex flex-col gap-4">
                            <Button variant="glow" onClick={() => handleTrucoResponse(true)} className="w-full py-4 text-[10px] tracking-widest rounded-xl">ACEITAR DESAFIO</Button>
                            <Button variant="danger" onClick={() => handleTrucoResponse(false)} className="w-full py-4 text-[10px] tracking-widest rounded-xl bg-danger/10 border-danger/20 text-danger hover:bg-danger/20">FUGIR (ABORTAR)</Button>
                        </div>
                    ) : (
                        <p className="text-[10px] text-neutral-500 animate-pulse font-black uppercase tracking-widest">Aguardando_Oponente...</p>
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
                className="absolute inset-0 z-[300] bg-bg/95 backdrop-blur-2xl flex items-center justify-center p-6"
            >
                <motion.div 
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    className={`max-w-md w-full p-10 rounded-[2.5rem] border text-center shadow-2xl ${gameState.winner === 'ours' ? 'border-glow/30 bg-surface/80' : 'border-danger/30 bg-surface/80'}`}
                >
                    <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 border ${gameState.winner === 'ours' ? 'bg-glow/5 border-glow/20' : 'bg-danger/5 border-danger/20'}`}>
                        <Trophy className={`w-10 h-10 ${gameState.winner === 'ours' ? 'text-glow' : 'text-danger/60'}`} />
                    </div>
                    <h2 className={`text-4xl md:text-5xl font-black mb-4 tracking-widest ${gameState.winner === 'ours' ? 'text-white' : 'text-danger'}`}>
                        {gameState.winner === 'ours' ? 'VITÓRIA' : 'DERROTA'}
                    </h2>
                    <p className="text-[10px] md:text-xs text-neutral-400 uppercase tracking-[0.2em] mb-12 leading-relaxed">
                        {gameState.winner === 'ours' 
                            ? 'PROTOCOLO CONCLUÍDO. RECOMPENSAS ADICIONADAS AO CLUSTER.' 
                            : 'FALHA SISTÊMICA. INTEGRIDADE DO CÓDIGO COMPROMETIDA.'
                        }
                    </p>
                    
                    <div className="flex flex-col gap-4">
                        <Button variant={gameState.winner === 'ours' ? 'glow' : 'danger'} onClick={onExit} className="w-full py-5 text-[10px] font-black uppercase tracking-widest rounded-xl">
                            RETORNAR_AO_HUB
                        </Button>
                    </div>
                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
