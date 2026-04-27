import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, User, ArrowLeft, Cpu, Zap, MessageSquare } from 'lucide-react';
import { Button } from '../atoms/Button';
import { getCPUMove, autoRespondToTruco } from '../../utils/trucoAI';
import { getCardPower, resolveRound, createDeck, getManilhaValue, initializeTrucoState, determineHandWinner } from '../../utils/trucoLogic';
import { usePet } from '../../context/PetContext';
import { p2p } from '../../utils/p2pService';

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
  const [gameState, _setGameState] = useState(null);
  const gameStateRef = useRef(null);
  const setGameState = (val) => {
    const newVal = typeof val === 'function' ? val(gameStateRef.current) : val;
    gameStateRef.current = newVal;
    _setGameState(newVal);
  };
  
  const { addReward } = usePet();
  const [hostId, setHostId] = useState(null);
  const [myPosition, setMyPosition] = useState(null);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const responseInitiatedRef = useRef(null);
  const moveInitiatedRef = useRef(null);


  const [isP2PReady, setIsP2PReady] = useState(false);
  const [isHost, setIsHost] = useState(false);

  // Sync Logic Unified
  const updateGameState = async (newState) => {
    setGameState(newState);
    if (!newState.mode || newState.mode === 'solo') return; // Local only

    if (isHost) {
        // Broadcast to all peers
        p2p.broadcast({ type: 'STATE_UPDATE', gameState: newState });
    } else {
        // Client shouldn't typically update state directly, but send action
        // This is a safety fallback or for minor local-only visual updates
    }
  };

  const sendAction = (action) => {
    if (gameState?.mode === 'solo') {
        processAction(action, gameState);
        return;
    }

    if (isHost) {
        processAction(action, gameState);
    } else {
        // Send to host
        p2p.broadcast({ type: 'ACTION', action, from: profile.id });
    }
  };

  const processAction = async (action, currentState) => {
      // Move logic from handlePlayCard/handleTrucoResponse here
      // For now, I will keep the existing handlers but make them call updateGameState
  };

  useEffect(() => {
    const initGame = async () => {
        // 1. Check if Offline/Solo
        const { data: roomData } = await supabase
            .from('game_rooms')
            .select('*')
            .eq('id', roomId)
            .single();
        
        if (!roomData) return;
        const initialGS = roomData.game_state;
        const hostIdFromDB = roomData.host_id;
        
        setHostId(hostIdFromDB);
        setIsHost(hostIdFromDB === profile.id);

        if (initialGS.mode === 'solo') {
            setGameState(initialGS);
            setIsP2PReady(true);
            return;
        }

        // 2. Setup P2P
        // Use a unique ID based on Room + User for reliable discovery
        const myP2PId = `truco_${roomId}_${profile.id}`;
        await p2p.initialize(myP2PId);

        // All non-hosts connect to the host
        if (hostIdFromDB !== profile.id) {
            const hostP2PId = `truco_${roomId}_${hostIdFromDB}`;
            p2p.connect(hostP2PId);
        }

        p2p.onMessage((data) => {
            if (data.type === 'STATE_UPDATE') {
                setGameState(data.gameState);
            } else if (data.type === 'ACTION' && hostIdFromDB === profile.id) {
                // Host handles incoming actions
                handleIncomingAction(data.action, data.from);
            }
        });

        setGameState(initialGS);
        setIsP2PReady(true);
    };

    initGame();

    return () => {
      p2p.destroy();
    };
  }, [roomId]);

  const handleIncomingAction = (action, fromId) => {
      // Find position of fromId
      const pos = Object.keys(gameStateRef.current.positions).find(k => gameStateRef.current.positions[k] == fromId);
      if (pos === undefined) return;
      
      if (action.type === 'PLAY_CARD') {
          handlePlayCard(action.card, parseInt(pos));
      } else if (action.type === 'TRUCO_RESPONSE') {
          handleTrucoResponse(action.action, fromId);
      } else if (action.type === 'CALL_TRUCO') {
          callTrucoInternal(fromId);
      }
  };

  useEffect(() => {
    if (!gameState || !profile) return;
    
    // Find my position (0, 1, 2 or 3)
    const pos = Object.keys(gameState.positions).find(k => gameState.positions[k] == profile.id);
    setMyPosition(pos !== undefined ? parseInt(pos) : null);

    // Determine turn
    setIsMyTurn(gameState.currentTurn == profile.id);
  }, [gameState, profile]);

  // CPU MOVE TRIGGER
  useEffect(() => {
    if (!gameState || !gameState.currentTurn) return;
    
    console.log("[TRUCO_SYSTEM] Verificando estado para movimento CPU. Host:", hostId, "Eu:", profile.id, "Challenge:", gameState.trucoChallenge?.status);

    // 1. Handle Truco Responses
    // Only the Host of the room should run the CPU logic to prevent duplicated shots
    if (hostId == profile.id && gameState.trucoChallenge?.status === 'pending') {
        const challengerId = gameState.trucoChallenge.challenger;
        const challengerPosStr = Object.keys(gameState.positions).find(k => gameState.positions[k] == challengerId);
        
        if (challengerPosStr !== undefined) {
            const challengerPos = parseInt(challengerPosStr);
            const opposingPositions = (challengerPos % 2 === 0) ? [1, 3] : [0, 2];

            // Priority: next opponent first, then the other one
            const nextOpponent = (challengerPos + 1) % 4;
            const priorityPositions = opposingPositions.includes(nextOpponent) 
                ? [nextOpponent, opposingPositions.find(p => p !== nextOpponent)]
                : opposingPositions;

            for (const targetPos of priorityPositions) {
                const targetId = gameState.positions[targetPos];
                
                // If this position has a HUMAN, we STOP and wait for them
                if (targetId && !targetId.toString().startsWith('CPU_')) {
                    return; 
                }

                if (targetId && targetId.toString().startsWith('CPU_')) {
                    const challengeId = `${gameState.trucoChallenge.challenger}_${gameState.trucoChallenge.value}`;
                    if (responseInitiatedRef.current === challengeId) return;

                    responseInitiatedRef.current = challengeId;
                    console.log("[TRUCO_SYSTEM] Bot respondendo:", targetId);

                    const response = autoRespondToTruco(gameStateRef.current.hands[targetPos] || [], gameStateRef.current.vira, gameStateRef.current, targetPos);
                    const timeout = setTimeout(async () => {
                        try {
                            const currentContext = gameStateRef.current;
                            if (!currentContext.trucoChallenge || currentContext.trucoChallenge.status !== 'pending') {
                                console.log("[TRUCO_SYSTEM] Bot ignorando timeout: desafio já resolvido.");
                                return;
                            }

                            console.warn("[TRUCO_SYSTEM] EXECUTANDO RESPOSTA DO BOT AGORA!");
                            const handWithPower = (currentContext.hands[targetPos] || []).map(card => getCardPower(card, currentContext.vira));
                            const maxPower = Math.max(...handWithPower);
                            
                            let action = response === 'ACCEPTED' ? 'ACCEPT' : 'FOLD';
                            if (action === 'ACCEPT' && maxPower >= 8 && currentContext.handPoints < 12 && Math.random() < 0.3) {
                                action = 'RAISE';
                            }

                            await handleTrucoResponse(action, targetId);
                        } catch (err) {
                            console.error("[TRUCO_SYSTEM] Erro crítico no timeout do Bot:", err);
                        }
                    }, 1500 + Math.floor(Math.random() * 1000));

                    // DO NOT return a cleanup that clears this timeout immediately on next render
                    // as long as the challengeId is the same.
                    // Instead, we let it run and check the state inside the timeout.
                    return; 
                }
            }
        }
    } else if (!gameState.trucoChallenge || gameState.trucoChallenge.status !== 'pending') {
        responseInitiatedRef.current = null;
        
        // Reset moveInitiatedRef if the challenge was just accepted/resolved 
        // to ensure the CPU can resume its normal move if it was blocked
        if (gameState.trucoChallenge?.status === 'accepted') {
            moveInitiatedRef.current = null;
        }
    }
    
    // 2. Handle Normal Moves
    const isCpuTurn = gameState.currentTurn && gameState.currentTurn.toString().startsWith('CPU_');
    if (isCpuTurn && gameState.trucoChallenge?.status !== 'pending') {
        const cpuId = gameState.currentTurn;
        const challengeId = `MOVE_${cpuId}_${gameState.table.length}`;
        
        if (moveInitiatedRef.current !== challengeId) {
            const cpuPos = Object.keys(gameState.positions).find(k => gameState.positions[k] == cpuId);
            if (cpuPos !== undefined) {
                moveInitiatedRef.current = challengeId;
                setTimeout(() => {
                    // Check if it's still the same turn and state
                    if (gameStateRef.current.currentTurn === cpuId) {
                        executeCPUMove(parseInt(cpuPos));
                    }
                }, 2000);
            }
        }
    } else {
        moveInitiatedRef.current = null;
    }
  }, [gameState?.currentTurn, gameState?.trucoChallenge, gameState?.positions, profile?.id, hostId]);

  const executeCPUMove = async (cpuPos) => {
    const cpuId = gameState.positions[cpuPos];
    const cpuHand = gameState.hands[cpuPos];
    
    console.log(`[TRUCO_SYSTEM] CPU ${cpuId} executando movimento em posição ${cpuPos}`);
    
    // Safety check: don't play if a challenge is pending
    if (gameState.trucoChallenge?.status === 'pending') {
        console.log(`[TRUCO_SYSTEM] CPU ${cpuId} aguardando resolução de desafio.`);
        moveInitiatedRef.current = null; // Allow retry later
        return;
    }

    if (!cpuHand || cpuHand.length === 0) return;

    const move = getCPUMove(cpuHand, gameState.table, gameState.vira, gameState, cpuPos);
    if (move) {
        // AI SHOUTS TRUCO? (Can shout even if not their turn if they have a manilha or are bluffing)
        const cpuTeam = (cpuPos % 2 === 0) ? 'ours' : 'theirs';
        const lastChallengerTeam = gameState.trucoChallenge?.challengerTeam;
        
        // Increase calling frequency for CPUs
        const shouldCallTruco = move.shoutsTruco || (Math.random() < 0.15); // Random bluff calling

        const isChallengePending = gameState.trucoChallenge?.status === 'pending';

        if (shouldCallTruco && !isChallengePending && gameState.handPoints < 12 && cpuTeam !== lastChallengerTeam) {
            const nextPoints = gameState.handPoints === 1 ? 3 : gameState.handPoints + 3;
            // CPU shouts! 
            const cpuTrucoState = {
                ...gameState,
                handPoints: nextPoints,
                trucoChallenge: {
                    challenger: cpuId,
                    challengerTeam: cpuTeam,
                    status: 'pending',
                    value: nextPoints
                }
            };
            updateGameState(cpuTrucoState);
            return; // Wait for response
        }

        await handlePlayCard(cpuHand[move.cardIndex], cpuPos);
    }
  };

  const handlePlayCard = async (card, pos) => {
    if (gameState.currentTurn !== gameState.positions[pos] && gameState.currentTurn !== 'ANY') return;
    if (gameState.trucoChallenge?.status === 'pending') return;

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

    const maxTableSize = gameState.mode === 'solo' || gameState.mode === 'quarteto' ? 4 : 2;
    
    if (newTable.length < maxTableSize) {
        // Normal clockwise turn
        const nextPos = (pos + 1) % 4;
        newState.currentTurn = gameState.positions[nextPos];
    } else {
        // Round ends
        newState.currentTurn = 'WAITING_RESOLUTION';
    }

    // UPDATE LOCAL STATE IMMEDIATELY to prevent double clicks
    setGameState(newState);

    if (newTable.length === maxTableSize) {
        // HOST AUTHORITY: Resolve the round
        if (profile.id == hostId || (gameState.positions && gameState.positions[0] == profile.id)) {
            setTimeout(async () => {
                const currentTableState = gameStateRef.current;
                const result = resolveRound(currentTableState.table, currentTableState.vira);
                
                let nextRound = (currentTableState.currentRound || 0);
                let roundWinners = [...(currentTableState.roundPoints || [])];
                let nextTurnId = null;
                let roundResultTeam = null;
                
                if (result.draw) {
                    roundWinners[nextRound] = 0; // 0 = draw
                    // In a draw, the previous round's winner starts. If 1st round draws, next player starts.
                    nextTurnId = currentTableState.table[0].player; 
                    roundResultTeam = 'draw';
                } else {
                    const winnerPos = result.winner_pos;
                    const winningTeam = (winnerPos === 0 || winnerPos === 2) ? 'ours' : 'theirs';
                    roundWinners[nextRound] = winningTeam === 'ours' ? 1 : 2;
                    nextTurnId = currentTableState.positions[winnerPos];
                    roundResultTeam = winningTeam;
                }

                const handWinner = determineHandWinner(roundWinners);

                let finalState = {
                    ...currentTableState,
                    table: [],
                    roundPoints: roundWinners,
                    currentRound: nextRound + 1,
                    currentTurn: nextTurnId,
                    lastWinner: roundResultTeam
                };

                if (handWinner) {
                   const points = currentTableState.handPoints || 1;
                   if (handWinner === 'ours') finalState.score.ours += points;
                   else if (handWinner === 'theirs') finalState.score.theirs += points;
                   
                   if (finalState.score.ours >= 12) finalState.winner = 'ours';
                   else if (finalState.score.theirs >= 12) finalState.winner = 'theirs';

                    if (finalState.winner) {
                         finalState.status = 'finished';
                         if (finalState.winner === 'ours') addReward(100, 200);
                    } else {
                        // Re-initialize for next hand
                        const freshState = initializeTrucoState({ 
                            score: finalState.score,
                            dealer: currentTableState.dealer 
                        }, finalState.positions);
                        
                        finalState = { ...finalState, ...freshState, lastWinner: roundResultTeam };
                    }
                }

                updateGameState(finalState);
            }, 2000);
        }
    }

    if (pos === myPosition) {
        addReward(2, 5);
    }
    
    // Only if it was ME playing, and I'm not the host, send to Host
    if (pos === myPosition && !isHost && gameState.mode !== 'solo') {
        p2p.broadcast({ type: 'ACTION', action: { type: 'PLAY_CARD', card, pos }, from: profile.id });
    }

    if (newTable.length === maxTableSize) {
        addReward(10, 20);
    }
  };


  const callTruco = async () => {
    if (!isMyTurn || gameState.trucoChallenge) return;
    
    const nextPoints = gameState.handPoints === 1 ? 3 : gameState.handPoints + 3;
    if (nextPoints > 12) return;

    const challengerTeam = (myPosition === 0 || myPosition === 2) ? 'ours' : 'theirs';
    
    const nextState = {
        ...gameState,
        handPoints: nextPoints,
        trucoChallenge: {
            challenger: profile.id,
            challengerTeam: challengerTeam,
            status: 'pending',
            value: nextPoints
        }
    };

    updateGameState(nextState);

    // If client, send action to host
    if (!isHost && gameState.mode !== 'solo') {
        p2p.broadcast({ type: 'ACTION', action: { type: 'CALL_TRUCO', from: profile.id }, from: profile.id });
    }
  };

  const callTrucoInternal = (fromId) => {
      // Logic handled by Host via handleIncomingAction
      callTruco(); 
  };

  const handleTrucoResponse = async (action, actorId = null) => {
    const actingPlayerId = actorId || profile.id;
    const currentGameState = gameStateRef.current;
    
    if (!currentGameState?.trucoChallenge) {
        console.warn("[TRUCO_CORE] Tentativa de resposta sem desafio pendente.");
        return;
    }

    console.log(`[TRUCO_CORE] ${actingPlayerId} executando: ${action}`);
    let newState = { ...currentGameState };
    
    if (action === 'ACCEPT') {
        newState.trucoChallenge = {
            ...currentGameState.trucoChallenge,
            status: 'accepted' 
        };
    } else if (action === 'RAISE') {
        const nextPoints = currentGameState.handPoints + 3;
        if (nextPoints > 12) return;
        
        const actorPosStr = Object.keys(currentGameState.positions).find(k => currentGameState.positions[k] == actingPlayerId);
        const actorPos = parseInt(actorPosStr);
        const myTeam = (actorPos === 0 || actorPos === 2) ? 'ours' : 'theirs';

        newState.handPoints = nextPoints;
        newState.trucoChallenge = {
            challenger: actingPlayerId,
            challengerTeam: myTeam,
            status: 'pending',
            value: nextPoints
        };
    } else {
        // action === 'FOLD'
        const challengerId = currentGameState.trucoChallenge.challenger;
        const challengerPosStr = Object.keys(currentGameState.positions).find(k => currentGameState.positions[k] == challengerId);
        const challengerPos = parseInt(challengerPosStr);
        
        const winningTeam = (challengerPos === 0 || challengerPos === 2) ? 'ours' : 'theirs';
        const updatedScore = { ...currentGameState.score };
        // If team Folds, the other team gets the CURRENT value minus the boost (if it was a boost)
        // Actually, if someone says TRUCO (3 points) and I fold, they get 1 point.
        // If they say SEIS (6 points) and I fold, they get 3 points.
        // So it's the points BEFORE the current challenge boost.
        // In my logic, gameState.handPoints is updated BEFORE response.
        // So we give handPoints - 2? or handPoints - 3?
        // Default starts at 1. First truco goes to 3. If fold, give 1. (3-2)
        // Next is 6. If fold, give 3. (6-3)
        // Next is 9. If fold, give 6. (9-3)
        // Next is 12. If fold, give 9. (12-3)
        const pointsToAward = currentGameState.handPoints === 3 ? 1 : currentGameState.handPoints - 3;
        updatedScore[winningTeam] += pointsToAward; 

        if (updatedScore.ours >= 12) newState.winner = 'ours';
        else if (updatedScore.theirs >= 12) newState.winner = 'theirs';

        if (newState.winner) {
            newState.status = 'finished';
            if (newState.winner === 'ours') addReward(100, 200);
        } else {
            const freshState = initializeTrucoState({ 
                score: updatedScore,
                dealer: currentGameState.dealer 
            }, currentGameState.positions);
            newState = { ...currentGameState, ...freshState };
        }
    }

    updateGameState(newState);

    // If client, send to host
    if (!isHost && gameState.mode !== 'solo') {
        p2p.broadcast({ type: 'ACTION', action: { type: 'TRUCO_RESPONSE', action, from: actingPlayerId }, from: profile.id });
    }
  };

  const playMyCard = (cardIndex) => {
    if (!isMyTurn || myPosition === null || gameState.trucoChallenge?.status === 'pending') return;
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
                disabled={(() => {
                    if (!isMyTurn) return true;
                    if (gameState.trucoChallenge?.status === 'pending') return true;
                    
                    const myTeam = (myPosition === 0 || myPosition === 2) ? 'ours' : 'theirs';
                    // Disable if my team was the last to challenge/raise
                    if (gameState.trucoChallenge?.challengerTeam === myTeam) return true;
                    if (gameState.handPoints >= 12) return true;
                    
                    return false;
                })()}
            >
                {gameState.handPoints === 1 ? 'TRUCO!' : `PEDIR ${gameState.handPoints + 3}!`}
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

      {/* Truco Challenge Modal - Only shown to the team being challenged */}
      <AnimatePresence>
        {(() => {
            if (gameState.trucoChallenge?.status !== 'pending') return null;
            
            // Logic: Is it MY team that needs to respond?
            const challengerTeam = gameState.trucoChallenge.challengerTeam;
            const myTeam = (myPosition === 0 || myPosition === 2) ? 'ours' : 'theirs';
            const isMyTeamBeingChallenged = challengerTeam !== myTeam;

            if (!isMyTeamBeingChallenged) {
                // I'm waiting for the other team
                return (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                    >
                        <div className="bg-neutral-900 border border-white/10 p-8 rounded-3xl max-w-sm w-full text-center shadow-2xl relative overflow-hidden">
                            <h3 className="text-3xl font-black mb-3 text-white tracking-widest flex items-center justify-center gap-2">
                                <Zap className="fill-glow text-glow" /> TRUCO!
                            </h3>
                            <p className="text-neutral-400 text-sm mb-6 leading-relaxed">
                                VOCÊ DESAFIOU O OPONENTE.
                                <br/><span className="text-white bg-white/5 border border-white/10 px-3 py-1 rounded-full mt-4 inline-block uppercase text-[10px]">Aguardando resposta...</span>
                            </p>
                        </div>
                    </motion.div>
                );
            }

            return (
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
                            UM OPONENTE DESAFIOU O SISTEMA.
                            <br/><span className="text-white bg-white/5 border border-white/10 px-3 py-1 rounded-full mt-4 inline-block">VALOR: <span className="text-glow">{gameState.trucoChallenge.value} PONTOS</span></span>
                        </p>

                        <div className="flex flex-col gap-4">
                            <Button variant="glow" onClick={() => handleTrucoResponse('ACCEPT')} className="w-full py-4 text-[10px] tracking-widest rounded-xl">ACEITAR DESAFIO</Button>
                            {gameState.handPoints < 12 && (
                                <Button variant="cyber" onClick={() => handleTrucoResponse('RAISE')} className="w-full py-4 text-[10px] tracking-widest rounded-xl bg-cyber-blue/10 border-cyber-blue/20 text-cyber-blue">
                                    PEDIR {gameState.handPoints + 3}!
                                </Button>
                            )}
                            <Button variant="danger" onClick={() => handleTrucoResponse('FOLD')} className="w-full py-4 text-[10px] tracking-widest rounded-xl bg-danger/10 border-danger/20 text-danger hover:bg-danger/20">FUGIR (ABORTAR)</Button>
                        </div>
                    </div>
                </motion.div>
            );
        })()}
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
