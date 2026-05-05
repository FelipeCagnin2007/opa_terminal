/**
 * PokemonBattleArena — Turn-based battle UI using the P2P connection.
 * Shows HP bars, move selection, and battle log.
 */
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Zap, RefreshCw, Trophy, Skull } from 'lucide-react';
import { initBattlePokemon, resolveTurn } from '../../utils/pokemonBattleEngine';
import { sendMessage, MSG } from '../../utils/pokemonP2P';
import { TYPE_COLORS_NEON } from '../../hooks/usePokemon';

function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1).replace(/-/g, ' ') : '';
}

function HpBar({ current, max, label, color }) {
  const pct = Math.max(0, Math.min(100, (current / max) * 100));
  let barColor = '#60d850'; // green
  if (pct < 50) barColor = '#ffd840'; // yellow
  if (pct < 20) barColor = '#ff5f5f'; // red

  return (
    <div className="flex flex-col gap-1 w-full">
      <div className="flex justify-between items-end">
        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/60">{label}</span>
        <span className="text-[9px] font-black font-mono" style={{ color: barColor }}>
          {current}/{max}
        </span>
      </div>
      <div className="h-2 bg-black/50 rounded-full overflow-hidden border border-white/10 p-0.5">
        <motion.div
          initial={{ width: '100%' }}
          animate={{ width: `${pct}%` }}
          transition={{ type: 'spring', bounce: 0, duration: 0.8 }}
          className="h-full rounded-full"
          style={{ background: barColor }}
        />
      </div>
    </div>
  );
}

function PokemonSprite({ pokemon, isOpponent, isAttacking, isHit }) {
  if (!pokemon) return null;
  const sprite = isOpponent ? pokemon.sprite : (pokemon.spriteBack || pokemon.sprite);
  const accent = TYPE_COLORS_NEON[pokemon.types?.[0]] || '#ffffff';

  return (
    <motion.div
      animate={{
        y: isAttacking ? (isOpponent ? [0, 20, 0] : [0, -20, 0]) : 0,
        x: isHit ? [-5, 5, -5, 5, 0] : 0,
        opacity: pokemon.isFainted ? 0.2 : 1,
        filter: pokemon.isFainted ? 'grayscale(100%)' : 'none',
      }}
      transition={{ duration: 0.3 }}
      className={`relative w-40 h-40 flex items-center justify-center ${pokemon.isFainted ? 'translate-y-10' : ''} transition-transform duration-1000`}
    >
      <div
        className="absolute bottom-0 w-32 h-8 rounded-[100%] blur-md"
        style={{ background: `${accent}40`, transform: 'scaleY(0.5)' }}
      />
      <img
        src={sprite}
        alt={pokemon.name}
        className="w-full h-full object-contain relative z-10"
        style={{
          filter: `drop-shadow(0 0 10px ${accent}40)`,
          transform: isOpponent ? 'scale(1)' : 'scale(1.2)',
        }}
      />
    </motion.div>
  );
}

export function PokemonBattleArena({ isHost, myTeamData, opponentTeamData, onExit, p2pHandlers }) {
  const [logs, setLogs] = useState(['BATTLE_INITIATED!']);
  const [turnState, setTurnState] = useState('waiting'); // waiting | selecting | animating | end
  const [winner, setWinner] = useState(null);

  // Battle State
  const [myTeam, setMyTeam] = useState(() => myTeamData.map(p => initBattlePokemon(p)));
  const [oppTeam, setOppTeam] = useState(() => opponentTeamData.map(p => initBattlePokemon(p)));
  const [myActiveIdx, setMyActiveIdx] = useState(0);
  const [oppActiveIdx, setOppActiveIdx] = useState(0);

  // Animations
  const [animatingAttacker, setAnimatingAttacker] = useState(null);
  const [animatingHit, setAnimatingHit] = useState(null);

  // Actions
  const [myAction, setMyAction] = useState(null);
  const [oppAction, setOppAction] = useState(null);

  const myActive = myTeam[myActiveIdx];
  const oppActive = oppTeam[oppActiveIdx];

  const logMsg = (msg) => setLogs(prev => [...prev, msg]);

  // Hook into P2P messages
  useEffect(() => {
    p2pHandlers.current = {
      onMessage: (msg) => {
        if (msg.type === MSG.ACTION_SELECTED) {
          if (isHost) {
            setOppAction(msg.payload);
          } else {
            // Unused by guest directly, guest waits for STATE_UPDATE
          }
        }
        if (msg.type === MSG.STATE_UPDATE) {
          if (!isHost) {
            // Apply host's resolved state
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
    
    // Start first turn
    if (turnState === 'waiting') {
      setTimeout(() => setTurnState('selecting'), 1000);
    }
  }, [isHost, turnState, p2pHandlers]);

  // Host: Resolve turn when both actions are in
  useEffect(() => {
    if (!isHost || turnState !== 'waiting' || !myAction || !oppAction) return;

    const resolveFullTurn = async () => {
      setTurnState('animating');
      const turnLogs = [];
      let nextMyTeam = [...myTeam];
      let nextOppTeam = [...oppTeam];
      let myP = { ...nextMyTeam[myActiveIdx] };
      let oppP = { ...nextOppTeam[oppActiveIdx] };

      // Determine order (simplification: Speed stat only, no priority moves for now)
      const mySpeed = myP.stats?.speed || 50;
      const oppSpeed = oppP.stats?.speed || 50;
      const iGoFirst = mySpeed >= oppSpeed;

      const firstActor = iGoFirst ? { p: myP, a: myAction, isHost: true } : { p: oppP, a: oppAction, isHost: false };
      const secondActor = iGoFirst ? { p: oppP, a: oppAction, isHost: false } : { p: myP, a: myAction, isHost: true };

      const execAction = (actor, target) => {
        if (actor.a.type === 'move') {
          const move = actor.p.moves[actor.a.moveIndex];
          const { attackerAfter, defenderAfter, logs } = resolveTurn(actor.p, target.p, move);
          actor.p = attackerAfter;
          target.p = defenderAfter;
          turnLogs.push(...logs);
        } else if (actor.a.type === 'switch') {
           // Swap pokemon logic
           turnLogs.push(`${actor.p.name} switched to ${actor.a.newActiveName}!`);
           // actual index swap happens outside
        }
      };

      // 1. First actor
      execAction(firstActor, secondActor);

      // 2. Second actor (if not fainted)
      if (!secondActor.p.isFainted) {
        execAction(secondActor, firstActor);
      }

      // Update refs
      if (iGoFirst) { myP = firstActor.p; oppP = secondActor.p; }
      else { oppP = firstActor.p; myP = secondActor.p; }

      nextMyTeam[myActiveIdx] = myP;
      nextOppTeam[oppActiveIdx] = oppP;

      // Check win condition
      const hostAlive = nextMyTeam.some(p => !p.isFainted);
      const guestAlive = nextOppTeam.some(p => !p.isFainted);
      
      let battleWinner = null;
      if (!hostAlive) battleWinner = 'guest';
      if (!guestAlive) battleWinner = 'host';

      // Auto-switch fainted (simplified: just pick next alive)
      let nextMyIdx = myActiveIdx;
      let nextOppIdx = oppActiveIdx;
      
      if (myP.isFainted && hostAlive) {
        nextMyIdx = nextMyTeam.findIndex(p => !p.isFainted);
        turnLogs.push(`HOST sent out ${nextMyTeam[nextMyIdx].name}!`);
      }
      if (oppP.isFainted && guestAlive) {
        nextOppIdx = nextOppTeam.findIndex(p => !p.isFainted);
        turnLogs.push(`GUEST sent out ${nextOppTeam[nextOppIdx].name}!`);
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

      sendMessage(MSG.STATE_UPDATE, stateUpdate);

      if (battleWinner) {
        setWinner(battleWinner);
        setTurnState('end');
      } else {
        setMyAction(null);
        setOppAction(null);
        setTurnState('selecting');
      }
    };

    resolveFullTurn();
  }, [isHost, myAction, oppAction, turnState, myTeam, oppTeam, myActiveIdx, oppActiveIdx]);

  const handleSelectMove = (moveIndex) => {
    if (turnState !== 'selecting') return;
    
    const action = { type: 'move', moveIndex };
    setMyAction(action);
    setTurnState('waiting');
    
    if (isHost) {
      // Host just waits for guest action
    } else {
      // Guest sends action to host
      sendMessage(MSG.ACTION_SELECTED, action);
    }
  };

  const myAccent = TYPE_COLORS_NEON[myActive?.types?.[0]] || '#ffffff';
  const oppAccent = TYPE_COLORS_NEON[oppActive?.types?.[0]] || '#ffffff';

  return (
    <div className="flex flex-col h-full bg-black">
      {/* Top Bar */}
      <div className="flex justify-between items-center p-4 border-b border-white/5 bg-surface/50 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse box-glow" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-red-400">BATTLE_PROTOCOL_ACTIVE</span>
        </div>
        <div className="flex items-center gap-2">
           {myTeam.map((p, i) => (
             <div key={i} className={`w-3 h-3 rounded-full border border-white/20 ${p.isFainted ? 'bg-black/50' : 'bg-glow box-glow'}`} />
           ))}
           <span className="mx-2 text-white/20">VS</span>
           {oppTeam.map((p, i) => (
             <div key={i} className={`w-3 h-3 rounded-full border border-white/20 ${p.isFainted ? 'bg-black/50' : 'bg-cyber-blue box-glow'}`} />
           ))}
        </div>
      </div>

      {/* Arena */}
      <div className="flex-1 relative overflow-hidden flex flex-col justify-between p-8">
        {/* Background Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] [transform:perspective(1000px)_rotateX(60deg)_translateY(-100px)_translateZ(-200px)] opacity-50 pointer-events-none" />

        {/* Opponent Area (Top Right) */}
        <div className="self-end flex items-end gap-6 relative z-10 w-full max-w-lg">
          <div className="flex-1 bg-surface/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 opacity-10" style={{ background: `linear-gradient(90deg, transparent, ${oppAccent})` }} />
            <div className="flex justify-between items-start mb-2">
              <span className="text-white font-black uppercase tracking-[0.2em]">{capitalize(oppActive?.name)}</span>
              <span className="text-[10px] font-black text-white/40">Lv{oppActive?.level}</span>
            </div>
            <HpBar current={oppActive?.currentHp || 0} max={oppActive?.maxHp || 1} label="INTEGRITY" />
            {oppActive?.status && (
              <span className="mt-2 inline-block px-2 py-0.5 rounded text-[8px] font-black uppercase bg-red-500/20 text-red-400 border border-red-500/40">
                {oppActive.status}
              </span>
            )}
          </div>
          <PokemonSprite pokemon={oppActive} isOpponent={true} />
        </div>

        {/* Player Area (Bottom Left) */}
        <div className="self-start flex items-end gap-6 relative z-10 w-full max-w-lg mt-12">
          <PokemonSprite pokemon={myActive} isOpponent={false} />
          <div className="flex-1 bg-surface/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 opacity-10" style={{ background: `linear-gradient(-90deg, transparent, ${myAccent})` }} />
            <div className="flex justify-between items-start mb-2">
              <span className="text-white font-black uppercase tracking-[0.2em]">{capitalize(myActive?.name)}</span>
              <span className="text-[10px] font-black text-white/40">Lv{myActive?.level}</span>
            </div>
            <HpBar current={myActive?.currentHp || 0} max={myActive?.maxHp || 1} label="INTEGRITY" />
            {myActive?.status && (
              <span className="mt-2 inline-block px-2 py-0.5 rounded text-[8px] font-black uppercase bg-red-500/20 text-red-400 border border-red-500/40">
                {myActive.status}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Control Panel */}
      <div className="h-64 grid grid-cols-1 md:grid-cols-2 border-t border-white/5 bg-surface/80 backdrop-blur-xl z-20">
        {/* Battle Log */}
        <div className="p-4 border-r border-white/5 overflow-y-auto flex flex-col gap-2 font-mono text-[10px] uppercase tracking-[0.1em]">
          {logs.map((log, i) => (
            <div key={i} className={`${i === logs.length - 1 ? 'text-white' : 'text-white/40'} flex items-start gap-2`}>
              <span className="text-glow opacity-50">&gt;</span>
              <span>{log}</span>
            </div>
          ))}
          {/* Scroll anchor logic ideally goes here */}
        </div>

        {/* Actions */}
        <div className="p-6 flex flex-col gap-4">
          {winner ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
              <Trophy className={`w-12 h-12 ${winner === (isHost ? 'host' : 'guest') ? 'text-yellow-400' : 'text-white/20'}`} />
              <div>
                <h3 className="text-white font-black text-xl uppercase tracking-[0.3em]">
                  {winner === (isHost ? 'host' : 'guest') ? 'VICTORY' : 'DEFEAT'}
                </h3>
                <p className="text-[9px] text-white/40 mt-1 uppercase tracking-[0.2em]">PROTOCOL_TERMINATED</p>
              </div>
              <button onClick={onExit} className="mt-4 px-8 py-3 btn-premium text-[10px]">
                EXIT_ARENA
              </button>
            </div>
          ) : turnState === 'selecting' ? (
            <>
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/50">AVAILABLE_MOVES</span>
                <span className="text-[9px] font-black uppercase text-glow animate-pulse">AWAITING_INPUT</span>
              </div>
              <div className="grid grid-cols-2 gap-3 flex-1">
                {myActive?.moves?.map((m, i) => {
                  const typeColor = TYPE_COLORS_NEON[m.type] || '#ffffff';
                  return (
                    <button
                      key={i}
                      onClick={() => handleSelectMove(i)}
                      className="relative p-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-left flex flex-col justify-center overflow-hidden group"
                    >
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity" style={{ background: typeColor }} />
                      <div className="flex justify-between items-center w-full">
                        <span className="text-[10px] font-black uppercase tracking-[0.1em] text-white/90 truncate">
                          {capitalize(m.name)}
                        </span>
                        <span className="text-[8px] font-black text-white/30">{myActive.pp[m.name]}/{m.pp}</span>
                      </div>
                      <div className="flex justify-between mt-2">
                        <span className="text-[7px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded border" style={{ color: typeColor, borderColor: `${typeColor}40`, background: `${typeColor}10` }}>
                          {m.type}
                        </span>
                        <span className="text-[8px] font-black text-white/40">
                          PWR: {m.power || '--'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-white/30">
              <RefreshCw className="w-8 h-8 animate-spin text-glow/50" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em]">
                {turnState === 'waiting' ? 'WAITING_FOR_OPPONENT' : 'RESOLVING_TURN_DATA'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
