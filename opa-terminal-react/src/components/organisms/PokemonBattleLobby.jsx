/**
 * PokemonBattleLobby — P2P lobby for Pokémon battles using PeerJS.
 * Host generates a code; Guest enters it. After handshake, battle starts.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check, Wifi, WifiOff, Swords, ArrowLeft, User } from 'lucide-react';
import { createPeer, hostListen, guestConnect, sendMessage, destroyPeer, MSG, getPeerShortCode } from '../../utils/pokemonP2P';
import { TYPE_COLORS_NEON } from '../../hooks/usePokemon';
import { generateBotTeam, BOT_DIFFICULTIES } from '../../utils/pokemonBot';

function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1).replace(/-/g, ' ') : '';
}

function TeamPreview({ team, label }) {
  return (
    <div className="flex flex-col gap-3">
      <span className="text-[8px] font-black uppercase tracking-[0.4em] text-white/30">{label}</span>
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 6 }, (_, i) => {
          const p = team[i];
          const color = p ? (TYPE_COLORS_NEON[p.types?.[0]] || '#a0a0a0') : undefined;
          return (
            <div
              key={i}
              className="rounded-xl p-2 flex flex-col items-center gap-1 border transition-all"
              style={{
                borderColor: p ? `${color}30` : 'rgba(255,255,255,0.05)',
                background: p ? `${color}08` : 'rgba(255,255,255,0.02)',
              }}
            >
              {p ? (
                <>
                  <img src={p.sprite} alt={p.name} className="w-10 h-10 object-contain" />
                  <span className="text-[7px] font-black uppercase text-white/50 truncate w-full text-center">
                    {capitalize(p.name)}
                  </span>
                </>
              ) : (
                <div className="w-10 h-10 rounded-full border border-dashed border-white/10 flex items-center justify-center">
                  <span className="text-white/10 text-lg">?</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PokemonBattleLobby({ myTeam, onBattleStart, onBack, p2pHandlersRef }) {
  const [mode, setMode] = useState(null); // 'host' | 'guest' | 'solo'
  const [peerId, setPeerId] = useState('');
  const [shortCode, setShortCode] = useState('');
  const [guestCode, setGuestCode] = useState('');
  const [status, setStatus] = useState('idle'); // idle | connecting | connected | ready | error
  const [opponentTeam, setOpponentTeam] = useState(null);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const peerRef = useRef(null);
  const oppTeamRef = useRef(null);
  const isHost = mode === 'host';

  const cleanup = useCallback(() => {
    // Removed destroyPeer from here because it drops connection when moving to Arena
  }, []);

  useEffect(() => { return cleanup; }, [cleanup]);

  // ── HOST FLOW ────────────────────────────────────────────────────────────
  const startHost = async () => {
    setStatus('connecting');
    setErrorMsg('');
    try {
      const generatedCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const { peer, peerId: id } = await createPeer(generatedCode.toLowerCase());
      peerRef.current = peer;
      setPeerId(id);
      setShortCode(generatedCode);
      setStatus('waiting'); // waiting for guest to connect

      hostListen(peer, {
        onConnect: (guestPeerId) => {
          setStatus('connected');
          // Send our team as challenge
          sendMessage(MSG.BATTLE_CHALLENGE, { team: myTeam });
        },
        onMessage: (msg) => {
          if (msg.type === MSG.BATTLE_ACCEPT) {
            setOpponentTeam(msg.payload.team);
            oppTeamRef.current = msg.payload.team;
            // Determine who goes first (faster Pokémon)
            const mySpeed = myTeam[0]?.stats?.speed || 50;
            const oppSpeed = (msg.payload.team[0]?.stats?.speed) || 50;
            const firstTurn = mySpeed >= oppSpeed ? 'host' : 'guest';
            sendMessage(MSG.BATTLE_READY, { hostTeam: myTeam, guestTeam: msg.payload.team, firstTurn });
            setStatus('ready');
          }

          // Forward to Arena if mounted
          if (p2pHandlersRef?.current?.onMessage) {
            p2pHandlersRef.current.onMessage(msg);
          }
        },
        onDisconnect: () => {
          setStatus('idle');
          setErrorMsg('OPPONENT_DISCONNECTED');
        },
      });
    } catch (e) {
      setStatus('error');
      setErrorMsg(e.message || 'PEER_CONNECTION_FAILED');
    }
  };

  // ── GUEST FLOW ───────────────────────────────────────────────────────────
  const joinAsGuest = async () => {
    if (!guestCode.trim()) return;
    setStatus('connecting');
    setErrorMsg('');
    try {
      const { peer } = await createPeer();
      peerRef.current = peer;

      // Build full peer ID from short code (format: opa-poke-XXXXXX)
      // Actually search for the host by trying both formats
      const hostPeerId = guestCode.includes('-') ? guestCode : `opa-poke-${guestCode.toLowerCase()}`;

      await guestConnect(peer, hostPeerId, {
        onConnect: () => setStatus('connected'),
        onMessage: (msg) => {
          if (msg.type === MSG.BATTLE_CHALLENGE) {
            setOpponentTeam(msg.payload.team);
            oppTeamRef.current = msg.payload.team;
            // Accept and send our team
            sendMessage(MSG.BATTLE_ACCEPT, { team: myTeam });
            setStatus('handshake');
          }
          if (msg.type === MSG.BATTLE_READY) {
            setStatus('ready');
            // Guest receives the battle state directly when arena renders
          }
          if (msg.type === 'BATTLE_START') {
            if (onBattleStart) {
              onBattleStart({
                isHost: false,
                myTeam,
                opponentTeam: oppTeamRef.current,
                peerId: peerRef.current?.id,
              });
            }
          }

          // Forward to Arena if mounted
          if (p2pHandlersRef?.current?.onMessage) {
            p2pHandlersRef.current.onMessage(msg);
          }
        },
        onDisconnect: () => {
          setStatus('idle');
          setErrorMsg('HOST_DISCONNECTED');
        },
      });
    } catch (e) {
      setStatus('error');
      setErrorMsg(e.message || 'CONNECTION_FAILED');
    }
  };

  // ── SOLO FLOW ────────────────────────────────────────────────────────────
  const startSolo = async (difficulty) => {
    setStatus('connecting');
    try {
      const botTeam = await generateBotTeam(difficulty);
      // Tag team members with difficulty for the reward system
      const taggedTeam = botTeam.map(p => ({ ...p, difficulty }));
      setOpponentTeam(taggedTeam);
      setStatus('ready');
    } catch (e) {
      setStatus('error');
      setErrorMsg('ERRO_AO_GERAR_EQUIPE_BOT');
    }
  };

  const handleBattleStart = () => {
    if (isHost && mode !== 'solo') {
      sendMessage('BATTLE_START');
    }
    if (onBattleStart) {
      onBattleStart({
        isHost: isHost || mode === 'solo',
        isBot: mode === 'solo',
        difficulty: mode === 'solo' ? (opponentTeam?.[0]?.difficulty || 'medium') : null, // Store difficulty
        myTeam,
        opponentTeam,
        peerId,
      });
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(peerId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const statusColor = {
    idle: '#a0a0a0', connecting: '#ffd840', waiting: '#60a0ff',
    connected: '#60d850', handshake: '#60d850', ready: '#c050d0', error: '#ff5f5f',
  }[status] || '#a0a0a0';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-8 max-w-2xl mx-auto"
    >
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => { destroyPeer(); onBack(); }} className="p-2 rounded-xl bg-surface-200 hover:bg-surface-300 text-text-muted hover:text-text-main transition-all border border-border">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h3 className="text-text-main font-black text-lg uppercase tracking-[0.3em]">SALA_DE_BATALHA</h3>
          <p className="text-[9px] text-text-muted uppercase tracking-[0.3em]">
            ESTABELECER LINK P2P COM OPONENTE
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: statusColor }} />
          <span className="text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: statusColor }}>
            {status.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Team warning */}
      {myTeam.length === 0 && (
        <div className="px-6 py-4 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-[10px] font-black uppercase tracking-[0.2em]">
          ⚠ MONTE UMA EQUIPE PRIMEIRO — Vá para a aba EQUIPE
        </div>
      )}

      {/* Mode Selection */}
      {!mode && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => { setMode('solo'); }}
            disabled={myTeam.length === 0}
            className="flex flex-col items-center gap-4 p-8 rounded-3xl border border-green-500/20 bg-green-500/5 hover:bg-green-500/10 hover:border-green-500/40 transition-all disabled:opacity-30 disabled:cursor-not-allowed group"
          >
            <div className="w-14 h-14 rounded-2xl bg-green-500/10 flex items-center justify-center border border-green-500/20 group-hover:scale-110 transition-transform">
              <User className="w-7 h-7 text-green-500" />
            </div>
            <div className="text-center">
              <p className="text-text-main font-black uppercase tracking-[0.3em] text-sm">BATALHA_SOLO</p>
              <p className="text-[9px] text-text-muted mt-1 uppercase tracking-[0.2em]">CONTRA BOT I.A.</p>
            </div>
          </button>
          <button
            onClick={() => { setMode('host'); startHost(); }}
            disabled={myTeam.length === 0}
            className="flex flex-col items-center gap-4 p-8 rounded-3xl border border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/40 transition-all disabled:opacity-30 disabled:cursor-not-allowed group shadow-main"
          >
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:scale-110 transition-transform shadow-pop">
              <Wifi className="w-7 h-7 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-text-main font-black uppercase tracking-[0.3em] text-sm">CRIAR_SALA</p>
              <p className="text-[9px] text-text-muted mt-1 uppercase tracking-[0.2em]">Gerar código de link</p>
            </div>
          </button>

          <button
            onClick={() => setMode('guest')}
            disabled={myTeam.length === 0}
            className="flex flex-col items-center gap-4 p-8 rounded-3xl border border-accent/20 bg-accent/5 hover:bg-accent/10 hover:border-accent/40 transition-all disabled:opacity-30 disabled:cursor-not-allowed group shadow-main"
          >
            <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center border border-accent/20 group-hover:scale-110 transition-transform shadow-pop-accent">
              <User className="w-7 h-7 text-accent" />
            </div>
            <div className="text-center">
              <p className="text-text-main font-black uppercase tracking-[0.3em] text-sm">ENTRAR_EM_SALA</p>
              <p className="text-[9px] text-text-muted mt-1 uppercase tracking-[0.2em]">Inserir código do host</p>
            </div>
          </button>
        </div>
      )}

      {/* Solo Panel */}
      {mode === 'solo' && status === 'idle' && (
        <div className="bg-surface-100/40 backdrop-blur-xl border border-border rounded-3xl p-8 flex flex-col gap-6 shadow-main">
          <span className="text-[9px] text-white/40 font-black uppercase tracking-[0.4em] text-center">SELECIONAR_DIFICULDADE</span>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(BOT_DIFFICULTIES).map(([key, info]) => (
              <button
                key={key}
                onClick={() => startSolo(key)}
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all"
              >
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-main">{info.label}</span>
                <span className="text-[8px] font-black text-text-muted uppercase tracking-[0.1em]">Lv{info.level} / {info.size} PKMN</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Host Panel */}
      {mode === 'host' && (
        <div className="bg-surface-100/40 backdrop-blur-xl border border-border rounded-3xl p-8 flex flex-col gap-6 shadow-main">
          <div className="flex flex-col items-center gap-4">
            {status === 'connecting' ? (
              <div className="flex items-center gap-3 text-white/40 text-[10px] font-black uppercase tracking-[0.3em]">
                <div className="w-4 h-4 border-2 border-glow border-t-transparent rounded-full animate-spin" />
                INICIALIZANDO_PEER...
              </div>
            ) : (
              <>
                <span className="text-[9px] text-text-muted font-black uppercase tracking-[0.4em]">SEU_CÓDIGO_DE_BATALHA</span>
                <div className="relative flex items-center gap-3">
                  <div className="px-8 py-4 rounded-2xl bg-surface-200 border border-primary/30 text-primary font-black text-3xl tracking-[0.5em] font-mono">
                    {shortCode}
                  </div>
                  <button onClick={copyCode} className="p-3 rounded-xl bg-primary/10 hover:bg-primary/20 transition-colors text-primary shadow-pop">
                    {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-[9px] text-white/30 uppercase tracking-[0.3em] text-center">
                  Compartilhe este código com seu oponente. ID completo também copiado.
                </p>
                {status === 'waiting' && (
                  <div className="flex items-center gap-3 text-accent text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">
                    <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                    AGUARDANDO_CONEXÃO...
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Guest Panel */}
      {mode === 'guest' && status === 'idle' && (
        <div className="bg-surface-100/40 backdrop-blur-xl border border-border rounded-3xl p-8 flex flex-col gap-6 shadow-main">
          <span className="text-[9px] text-text-muted font-black uppercase tracking-[0.4em]">INSERIR_CÓDIGO_DO_HOST</span>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="CÓDIGO DE BATALHA OU ID COMPLETO..."
              value={guestCode}
              onChange={(e) => setGuestCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && joinAsGuest()}
              className="flex-1 bg-surface-200 border border-border rounded-xl px-5 py-3 text-[11px] font-black uppercase tracking-[0.3em] text-text-main placeholder:text-text-muted/40 focus:outline-none focus:border-accent/40 transition-colors font-mono"
            />
            <Button
              onClick={joinAsGuest}
              variant="accent"
              className="px-6 py-3"
            >
              CONECTAR
            </Button>
          </div>
        </div>
      )}

      {/* Connecting status */}
      {mode === 'guest' && status === 'connecting' && (
        <div className="flex items-center justify-center gap-3 text-accent text-[10px] font-black uppercase tracking-[0.3em] py-8 animate-pulse">
          <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          ESTABELECENDO_LINK...
        </div>
      )}

      {/* Error */}
      {status === 'error' && (
        <div className="px-6 py-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-[0.2em]">
          ⚠ {errorMsg}
        </div>
      )}

      {/* Connected — show teams */}
      {(status === 'connected' || status === 'handshake') && (
        <div className="bg-surface-100/40 backdrop-blur-xl border border-border rounded-3xl p-8 flex flex-col gap-6 shadow-main">
          <div className="flex items-center gap-3 text-green-400 text-[10px] font-black uppercase tracking-[0.3em]">
            <Wifi className="w-4 h-4" />
            LINK_ESTABELECIDO — {isHost ? 'Aguardando dados da equipe...' : 'Enviando dados da equipe...'}
          </div>
          <TeamPreview team={myTeam} label="SUA_EQUIPE" />
          {opponentTeam && <TeamPreview team={opponentTeam} label="EQUIPE_OPONENTE" />}
        </div>
      )}

      {/* Ready to battle! */}
      {status === 'ready' && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-surface/40 backdrop-blur-xl border border-purple-500/30 rounded-3xl p-8 flex flex-col gap-6"
            style={{ boxShadow: '0 0 40px rgba(192, 80, 208, 0.2)' }}
          >
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-purple-500 animate-pulse" />
              <span className="text-purple-400 font-black text-[10px] uppercase tracking-[0.3em]">
                AMBAS_EQUIPES_PRONTAS — BATALHA_AUTORIZADA
              </span>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <TeamPreview team={myTeam} label="SUA_EQUIPE" />
              {opponentTeam && <TeamPreview team={opponentTeam} label="EQUIPE_OPONENTE" />}
            </div>
            {isHost || mode === 'solo' ? (
              <button
                onClick={handleBattleStart}
                className="btn-premium w-full py-4 flex items-center justify-center gap-3"
              >
                <Swords className="w-5 h-5" />
                INICIAR_PROTOCOLO_DE_BATALHA
              </button>
            ) : (
              <div className="w-full py-4 flex items-center justify-center gap-3 text-white/40 font-black uppercase tracking-[0.2em] border border-white/5 rounded-xl bg-white/5 animate-pulse">
                AGUARDANDO_O_HOST_INICIAR...
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </motion.div>
  );
}
