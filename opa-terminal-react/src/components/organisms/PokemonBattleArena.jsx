/**
 * PokemonBattleArena — Turn-based battle UI using the P2P connection or Bot mode.
 * Shows HP bars, move selection, and battle log with FireRed aesthetics.
 */
import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { initBattlePokemon, resolveTurn } from '../../utils/pokemonBattleEngine';
import { sendMessage, MSG } from '../../utils/pokemonP2P';
import { usePet } from '../../context/PetContext';

function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1).replace(/-/g, ' ') : '';
}

function HpBar({ current, max, label }) {
  const pct = Math.max(0, Math.min(100, (current / max) * 100));
  let barColor = '#48d0b0'; // Classic green
  if (pct < 50) barColor = '#f8d030'; // Yellow
  if (pct < 20) barColor = '#f85838'; // Red

  return (
    <div className="flex items-center gap-1.5 w-full px-1">
      <span className="text-[9px] sm:text-[10px] font-black text-pokemon-gold tracking-tighter" style={{ textShadow: '1px 1px 0px var(--color-pokemon-dark)' }}>{label}</span>
      <div className="flex-1 h-2.5 sm:h-3 bg-pokemon-dark rounded-full overflow-hidden border-[1px] border-pokemon-dark flex items-center bg-[#506858] shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]">
        <motion.div
          initial={{ width: '100%' }}
          animate={{ width: `${pct}%` }}
          transition={{ type: 'spring', bounce: 0, duration: 0.5 }}
          className="h-full border-b border-black/20"
          style={{ background: barColor }}
        />
      </div>
    </div>
  );
}

function PokemonSprite({ pokemon, isOpponent, isAttacking, isHit }) {
  if (!pokemon) return null;
  const sprite = isOpponent ? pokemon.sprite : (pokemon.spriteBack || pokemon.sprite);

  return (
    <motion.div
      animate={{
        y: isAttacking ? (isOpponent ? [0, 15, 0] : [0, -15, 0]) : 0,
        x: isHit ? [-4, 4, -4, 4, 0] : 0,
        opacity: pokemon.isFainted ? 0 : 1,
      }}
      transition={{ duration: 0.3 }}
      className={`relative w-full h-full flex items-center justify-center ${pokemon.isFainted ? 'translate-y-10' : ''} transition-transform duration-1000 z-10`}
    >
      <img
        src={sprite}
        alt={pokemon.name}
        className="w-full h-full object-contain relative z-10"
        style={{
          transform: isOpponent ? 'scale(1.2)' : 'scale(1.5)',
          imageRendering: 'pixelated'
        }}
      />
    </motion.div>
  );
}

export function PokemonBattleArena({ isHost, isBot, difficulty, myTeamData, opponentTeamData, onExit, p2pHandlers }) {
  const { addReward } = usePet();
  const [logs, setLogs] = useState(['Uma batalha selvagem começou!']);
  const [turnState, setTurnState] = useState('init'); // init | waiting | selecting | animating | end
  const [winner, setWinner] = useState(null);
  const logsEndRef = useRef(null);

  // Battle State
  const [myTeam, setMyTeam] = useState(() => myTeamData.map(p => initBattlePokemon(p)));
  const [oppTeam, setOppTeam] = useState(() => opponentTeamData.map(p => initBattlePokemon(p)));
  const [myActiveIdx, setMyActiveIdx] = useState(0);
  const [oppActiveIdx, setOppActiveIdx] = useState(0);

  // Actions
  const [myAction, setMyAction] = useState(null);
  const [oppAction, setOppAction] = useState(null);

  const myActive = myTeam[myActiveIdx];
  const oppActive = oppTeam[oppActiveIdx];

  // Hook into P2P messages
  useEffect(() => {
    p2pHandlers.current = {
      onMessage: (msg) => {
        if (msg.type === MSG.ACTION_SELECTED) {
          if (isHost) {
            setOppAction(msg.payload);
          }
        }
        if (msg.type === MSG.STATE_UPDATE) {
          if (!isHost) {
            setMyTeam(msg.payload.guestTeam);
            setOppTeam(msg.payload.hostTeam);
            setMyActiveIdx(msg.payload.guestActive);
            setOppActiveIdx(msg.payload.hostActive);
            setLogs(prev => [...prev, ...msg.payload.logs]);
            
            if (msg.payload.winner) {
              setWinner(msg.payload.winner);
              setTurnState('end');
            } else {
              setTurnState('selecting');
              setMyAction(null);
            }
          }
        }
        if (msg.type === MSG.BATTLE_END) {
          setWinner(msg.payload.winner);
          setTurnState('end');
        }
      }
    };
    
    if (turnState === 'init') {
      setTimeout(() => setTurnState('selecting'), 1500);
    }
  }, [isHost, turnState, p2pHandlers]);

  // Bot logic
  useEffect(() => {
    if (isBot && (turnState === 'selecting' || turnState === 'waiting') && !oppAction && oppActive) {
      const delay = Math.random() * 1000 + 800; // 0.8s - 1.8s
      const timer = setTimeout(() => {
        const validMoves = oppActive.moves || [];
        const randomIndex = validMoves.length > 0 ? Math.floor(Math.random() * validMoves.length) : 0;
        setOppAction({ type: 'move', moveIndex: randomIndex });
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [isBot, turnState, oppAction, oppActive]);

  // Host: Resolve turn when both actions are in
  useEffect(() => {
    if (!isHost || turnState !== 'waiting' || !myAction || !oppAction) return;

    const resolveFullTurn = async () => {
      try {
        setTurnState('animating');
        // Small delay for drama/readability
        await new Promise(r => setTimeout(r, 1000));

        const turnLogs = [];
        let nextMyTeam = [...myTeam];
        let nextOppTeam = [...oppTeam];
        let myP = { ...nextMyTeam[myActiveIdx] };
        let oppP = { ...nextOppTeam[oppActiveIdx] };

        const mySpeed = myP.stats?.speed || 50;
        const oppSpeed = oppP.stats?.speed || 50;
        const iGoFirst = mySpeed >= oppSpeed;

        const firstActor = iGoFirst ? { p: myP, a: myAction, isHost: true } : { p: oppP, a: oppAction, isHost: false };
        const secondActor = iGoFirst ? { p: oppP, a: oppAction, isHost: false } : { p: myP, a: myAction, isHost: true };

        const execAction = (actor, target) => {
          if (actor.a.type === 'move') {
            const move = actor.p.moves[actor.a.moveIndex];
            const { attackerAfter, defenderAfter, logs: resLogs } = resolveTurn(actor.p, target.p, move);
            actor.p = attackerAfter;
            target.p = defenderAfter;
            turnLogs.push(...resLogs);
          } else if (actor.a.type === 'switch') {
             turnLogs.push(`${actor.p.name} trocou para ${actor.a.newActiveName}!`);
          }
        };

        execAction(firstActor, secondActor);
        if (!secondActor.p.isFainted) {
          execAction(secondActor, firstActor);
        }

        if (iGoFirst) { myP = firstActor.p; oppP = secondActor.p; }
        else { oppP = firstActor.p; myP = secondActor.p; }

        nextMyTeam[myActiveIdx] = myP;
        nextOppTeam[oppActiveIdx] = oppP;

        const hostAlive = nextMyTeam.some(p => !p.isFainted);
        const guestAlive = nextOppTeam.some(p => !p.isFainted);
        
        let battleWinner = null;
        if (!hostAlive) battleWinner = 'guest';
        if (!guestAlive) battleWinner = 'host';

        let nextMyIdx = myActiveIdx;
        let nextOppIdx = oppActiveIdx;
        
        if (myP.isFainted && hostAlive) {
          nextMyIdx = nextMyTeam.findIndex(p => !p.isFainted);
          turnLogs.push(`Jogador enviou ${nextMyTeam[nextMyIdx].name}!`);
        }
        if (oppP.isFainted && guestAlive) {
          nextOppIdx = nextOppTeam.findIndex(p => !p.isFainted);
          turnLogs.push(`Oponente enviou ${nextOppTeam[nextOppIdx].name}!`);
        }

        setMyTeam(nextMyTeam);
        setOppTeam(nextOppTeam);
        setMyActiveIdx(nextMyIdx);
        setOppActiveIdx(nextOppIdx);
        setLogs(prev => [...prev, ...turnLogs]);

        const stateUpdate = {
          hostTeam: nextMyTeam,
          guestTeam: nextOppTeam,
          hostActive: nextMyIdx,
          guestActive: nextOppIdx,
          logs: turnLogs,
          winner: battleWinner
        };

        if (!isBot) {
          sendMessage(MSG.STATE_UPDATE, stateUpdate);
        }

        if (battleWinner) {
          setWinner(battleWinner);
          setTurnState('end');
          
          // Give reward if user won
          const userWon = battleWinner === (isHost ? 'host' : 'guest');
          if (userWon && isBot) {
            const rewards = {
              'easy':   { coins: 50,  xp: 10 },
              'medium': { coins: 100, xp: 25 },
              'hard':   { coins: 250, xp: 60 },
              'elite':  { coins: 600, xp: 150 }
            };
            const r = rewards[difficulty] || rewards['medium'];
            addReward(r.coins, r.xp);
            setLogs(prev => [...prev, `[SISTEMA] RECOMPENSA_RECEBIDA: +${r.coins} OPACOINS!`]);
          }
        } else {
          setMyAction(null);
          setOppAction(null);
          setTurnState('selecting');
        }
      } catch (err) {
        console.error("BATTLE_FATAL_ERROR:", err);
        setTurnState('selecting');
        setMyAction(null);
        setOppAction(null);
      }
    };

    resolveFullTurn();
  }, [isHost, isBot, myAction, oppAction, turnState, myTeam, oppTeam, myActiveIdx, oppActiveIdx]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleSelectMove = (moveIndex) => {
    if (turnState !== 'selecting') return;
    
    const action = { type: 'move', moveIndex };
    setMyAction(action);
    setTurnState('waiting');
    
    if (!isBot && !isHost) {
      sendMessage(MSG.ACTION_SELECTED, action);
    }
  };

  return (
    <div className="flex flex-col h-full bg-black font-mono select-none overflow-hidden touch-manipulation">
      {/* Top Header */}
            <div className="flex justify-between items-center px-4 py-1.5 bg-gray-900 border-b-[3px] border-pokemon-dark">
        <div className="flex items-center gap-1.5">
           {myTeam.map((p, i) => (
             <div key={i} className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border-2 border-gray-700 ${p.isFainted ? 'bg-pokemon-red' : 'bg-pokemon-teal'}`} />
           ))}
        </div>
        <span className="text-[10px] sm:text-xs font-black text-white/50 px-2 tracking-widest">VS</span>
        <div className="flex items-center gap-1.5">
           {oppTeam.map((p, i) => (
             <div key={i} className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border-2 border-gray-700 ${p.isFainted ? 'bg-pokemon-red' : 'bg-pokemon-teal'}`} />
           ))}
        </div>
      </div>

      {/* Arena Battlefield */}
      <div className="flex-1 relative overflow-hidden bg-gradient-to-b from-[#f0f8f8] to-[#a0d8a8]">
        
        {/* Opponent Sprite (Top Right) */}
        <div className="absolute top-[8%] sm:top-[5%] right-[5%] w-[35%] max-w-[160px] aspect-square flex items-end justify-center">
          <div className="absolute bottom-[10%] w-[130%] h-[35%] bg-pokemon-green rounded-[100%] border border-pokemon-green-dark" />
          <PokemonSprite pokemon={oppActive} isOpponent={true} />
        </div>

        {/* Opponent HP Box (Top Left) */}
        <div className="absolute top-[12%] sm:top-[8%] left-[3%] w-[55%] max-w-[240px] z-20">
          <div className="bg-pokemon-light border-2 border-pokemon-dark p-1.5 shadow-lg" style={{ borderRadius: '0 12px 0 12px' }}>
            <div className="flex justify-between items-start mb-0.5 px-1">
              <span className="text-pokemon-dark font-black uppercase text-[10px] sm:text-sm tracking-tighter" style={{ textShadow: '1px 1px 0px var(--color-pokemon-gray)' }}>{capitalize(oppActive?.name)}</span>
              <span className="text-[9px] sm:text-xs font-black text-pokemon-dark">Lv{oppActive?.level}</span>
            </div>
            <HpBar current={oppActive?.currentHp || 0} max={oppActive?.maxHp || 1} label="HP" />
            {oppActive?.status && (
              <span className="mt-1 ml-1 inline-block px-1 py-0.5 rounded text-[8px] font-black uppercase bg-pokemon-dark text-white shadow-[inset_1px_1px_0_rgba(0,0,0,0.5)]">
                {oppActive.status}
              </span>
            )}
          </div>
        </div>

        {/* Player Sprite (Bottom Left) */}
        <div className="absolute bottom-[20%] sm:bottom-[15%] left-[5%] w-[45%] max-w-[180px] aspect-square flex items-end justify-center">
          <div className="absolute bottom-[5%] w-[130%] h-[30%] bg-pokemon-green rounded-[100%] border border-pokemon-green-dark" />
          <PokemonSprite pokemon={myActive} isOpponent={false} />
        </div>

        {/* Player HP Box (Bottom Right) */}
        <div className="absolute bottom-[10%] sm:bottom-[8%] right-[3%] w-[65%] max-w-[260px] z-20">
          <div className="bg-pokemon-light border-2 border-pokemon-dark p-1.5 shadow-lg" style={{ borderRadius: '12px 0 12px 0' }}>
            <div className="flex justify-between items-start mb-0.5 px-1">
              <span className="text-pokemon-dark font-black uppercase text-[10px] sm:text-sm tracking-tighter" style={{ textShadow: '1px 1px 0px var(--color-pokemon-gray)' }}>{capitalize(myActive?.name)}</span>
              <span className="text-[9px] sm:text-xs font-black text-pokemon-dark">Lv{myActive?.level}</span>
            </div>
            <HpBar current={myActive?.currentHp || 0} max={myActive?.maxHp || 1} label="HP" />
            {myActive?.status && (
              <span className="mt-1 ml-1 inline-block px-1 py-0.5 rounded text-[8px] font-black uppercase bg-pokemon-dark text-white shadow-[inset_1px_1px_0_rgba(0,0,0,0.5)]">
                {myActive.status}
              </span>
            )}
            <div className="flex justify-end mt-1 border-t-2 border-pokemon-gray pt-0.5 px-1">
              <span className="text-[10px] sm:text-xs font-black text-pokemon-dark font-mono tracking-tighter">
                {myActive?.currentHp || 0} / {myActive?.maxHp || 1}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Control Panel (Dialogue Box style) */}
      <div className="h-[35vh] min-h-[220px] max-h-[300px] border-t-8 border-pokemon-dark bg-pokemon-dark p-1.5 sm:p-2 flex flex-col">
        <div className="flex-1 bg-white rounded-lg flex flex-col sm:flex-row border-4 border-pokemon-purple shadow-[0_0_0_4px_theme(colors.pokemon.red)] overflow-hidden m-0.5 sm:m-1">
          
          {/* Battle Log */}
          <div className="w-full sm:w-1/2 p-3 sm:p-4 border-b-4 sm:border-b-0 sm:border-r-4 border-pokemon-purple flex-1 overflow-y-auto flex flex-col gap-2 sm:gap-3 font-mono text-[11px] sm:text-[13px] uppercase text-pokemon-dark font-black leading-snug" style={{ textShadow: '1px 1px 0px var(--color-pokemon-gray)' }}>
            {logs.map((log, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <span className="text-[#d05068] mt-0.5 sm:mt-0">&gt;</span>
                <span className={i === logs.length - 1 ? 'opacity-100' : 'opacity-60'}>{log}</span>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>

          {/* Actions */}
          <div className="w-full sm:w-1/2 flex-1 bg-[#f8f8f8]">
            {winner ? (
              <div className="h-full flex flex-col items-center justify-center gap-3 text-center p-4">
                <h3 className="text-pokemon-dark font-black text-lg sm:text-xl uppercase tracking-widest" style={{ textShadow: '1px 1px 0px var(--color-pokemon-gray)' }}>
                  {winner === (isHost ? 'host' : 'guest') ? 'VITÓRIA!' : 'DERROTA...'}
                </h3>
                <button onClick={onExit} className="px-6 py-3 sm:py-2 bg-pokemon-red text-white font-black rounded-lg text-xs sm:text-sm hover:bg-pokemon-red/80 uppercase border-2 border-pokemon-dark shadow-[2px_2px_0_theme(colors.pokemon.dark)] active:translate-y-px active:shadow-none w-full sm:w-auto">
                  SAIR DA BATALHA
                </button>
              </div>
            ) : turnState === 'selecting' ? (
              <div className="h-full flex flex-col p-1.5 sm:p-2">
                <div className="grid grid-cols-2 grid-rows-2 gap-1.5 sm:gap-2 h-full">
                  {myActive?.moves?.map((m, i) => {
                    return (
                      <button
                        key={i}
                        onClick={() => handleSelectMove(i)}
                        className="bg-white border-2 border-pokemon-gray rounded-lg p-2 flex flex-col justify-between hover:bg-pokemon-light hover:border-pokemon-dark transition-colors shadow-[2px_2px_0_theme(colors.pokemon.gray)] active:translate-y-px active:shadow-none"
                      >
                        <div className="text-[10px] sm:text-[11px] font-black uppercase text-pokemon-dark truncate w-full text-left" style={{ textShadow: '1px 1px 0px #ffffff' }}>
                          {capitalize(m.name)}
                        </div>
                        <div className="flex justify-between items-center w-full">
                          <span className="text-[9px] sm:text-[10px] font-black text-pokemon-dark tracking-tighter">PP {myActive.pp[m.name]}/{m.pp}</span>
                          <span className="text-[8px] sm:text-[9px] font-black text-white bg-pokemon-red px-1.5 py-0.5 rounded uppercase shadow-[inset_1px_1px_0_rgba(255,255,255,0.3)] border border-pokemon-dark">{m.type}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center gap-3 sm:gap-4 text-[#404040]">
                <RefreshCw className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-[#d05068]" />
                <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest" style={{ textShadow: '1px 1px 0px #d0d0d0' }}>
                  {turnState === 'waiting' ? 'WAITING...' : turnState === 'init' ? 'INITIALIZING...' : 'FIGHTING!'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
