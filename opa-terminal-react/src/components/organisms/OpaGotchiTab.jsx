import { useState, useEffect } from 'react';
import { usePet } from '../../context/PetContext';
import { useAuthContext } from '../../context/AuthContext';
import { PetStats } from './PetStats';
import { PetControls } from './PetControls';
import { AsciiEntity } from '../atoms/AsciiEntity';
import { PET_ASCII } from '../../utils/petConstants';
import { Button } from '../atoms/Button';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal as TerminalIcon } from 'lucide-react';
import { OptimizerGame, RunnerGame, FixadorGame } from './PetMiniGames';

export function OpaGotchiTab() {
  const { pet, updatePet, claimCoins, resetProtocol } = usePet();
  const { profile } = useAuthContext();
  const [activeGame, setActiveGame] = useState(null);
  const [toast, setToast] = useState(null);
  const [nameInput, setNameInput] = useState("");

  // Sync pet name with global profile name if not set
  useEffect(() => {
    if (profile?.nome && !pet.name) {
        updatePet({ name: profile.nome });
    }
  }, [profile, pet.name, updatePet]);

  // Helper to show notifications
  const showNotification = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Recharge Timer Helper
  const getRechargeTime = () => {
    const next = (pet.lastCoinClaim || 0) + 24 * 60 * 60 * 1000;
    const diff = next - Date.now();
    if (diff <= 0) return null;
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return `${h}h ${m}m ${s}s`;
  };

  const handleAction = (type) => {
    if (pet.isDead) return;
    
    // Cost check
    if (type !== 'sleep' && pet.coins < 10) {
      showNotification("SALDO INSUFICIENTE: Requer 10 OPACOINS");
      return;
    }

    if (type === 'sleep') {
      const newState = !pet.isSleeping;
      updatePet({ isSleeping: newState, thoughts: "" });
      showNotification(newState ? "COMANDO: MODO SLEEP ATIVADO" : "COMANDO: ENTIDADE DESPERTADA");
      return;
    }

    if (['play', 'patch', 'dino'].includes(type)) {
      const stageIdx = ['EGG', 'LEXER_BABY', 'PROTOCOL_GUARDIAN', 'SYNTAX_KNIGHT', 'NODE_WIZARD', 'QUANTUM_MASTER'].indexOf(pet.stage);
      
      let isLocked = false;
      if (type === 'patch' && stageIdx < 1) isLocked = true;
      if (type === 'play' && stageIdx < 2) isLocked = true;
      if (type === 'dino' && stageIdx < 3) isLocked = true;

      if (isLocked) {
        // "Simple Training" logic
        updatePet({
          coins: pet.coins - 10,
          mood: Math.min(100, pet.mood + 10),
          stability: Math.min(100, pet.stability + 5),
          interactions: (pet.interactions || 0) + 1,
          thoughts: ""
        });
        showNotification("COMANDO: TREINO SIMPLES EXECUTADO [MOEDAS -10]");
        return;
      }

      setActiveGame(type);
      showNotification(`COMANDO: INICIAR ${type.toUpperCase()}.BIT`);
      return;
    }

    // Interaction increment and cost
    const patch = { 
      coins: pet.coins - 10,
      interactions: (pet.interactions || 0) + 1,
      thoughts: ""
    };

    if (type === 'feed') {
      if (pet.stage === 'EGG') return;
      patch.energy = Math.min(100, pet.energy + 25);
      showNotification("COMANDO: PROTOCOLO ALIMENTAR ACEITO");
    }

    updatePet(patch);
  };

  const onGameFinish = (type, result) => {
    setActiveGame(null);
    if (!result || typeof result.score !== 'number') return;

    const patch = {
      coins: pet.coins - 10, // Cost for playing
      interactions: (pet.interactions || 0) + 1,
      thoughts: ""
    };

    if (type === 'play') {
       patch.mood = Math.min(100, pet.mood + result.score * 3);
       patch.coins += result.score;
       showNotification(`SESSÃO FINALIZADA: +${result.score} OPACOINS`);
    } else if (type === 'dino') {
       patch.mood = Math.min(100, pet.mood + Math.min(20, result.score));
       patch.agility = Math.min(100, pet.agility + Math.min(30, result.score * 2));
       patch.coins += Math.floor(result.score / 5);
       showNotification(`SESSÃO FINALIZADA: AGILIDADE +${Math.min(30, result.score * 2)}%`);
    } else if (type === 'patch') {
       patch.stability = Math.min(100, pet.stability + result.score * 5);
       patch.coins += result.score;
       showNotification(`SESSÃO FINALIZADA: ESTABILIDADE +${result.score * 5}%`);
    }

    updatePet(patch);
  };

  const confirmName = () => {
    if (nameInput.trim()) {
      updatePet({ name: nameInput.trim().toUpperCase() });
      showNotification("SISTEMA: PROTOCOLO DE IDENTIFICAÇÃO REGISTRADO");
    }
  };

  const handleClaim = () => {
    claimCoins();
    showNotification("SUCESSO: +100 OPACOINS COLETADOS");
  };

  if (pet.isDead) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-danger/10 border border-danger rounded-2xl animate-pulse">
        <h2 className="text-3xl text-danger mb-4 font-black">FATAL ERROR</h2>
        <p className="text-sm text-danger/80 mb-8 uppercase tracking-widest">
          Integridade do Protocolo Compromitida.<br />
          Entidade desalocada da memória.
        </p>
        <Button variant="danger" onClick={resetProtocol}>Reiniciar Protocolo</Button>
      </div>
    );
  }

  const rechargeTime = getRechargeTime();

  return (
    <div className="flex flex-col gap-10 py-6 relative h-full">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[200] bg-surface-300 text-text-main px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] shadow-main border border-border"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Naming Overlay */}
      <AnimatePresence>
        {!pet.name && (
          <motion.div 
            initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, backdropFilter: 'blur(12px)' }}
            className="absolute inset-x-0 -top-4 bottom-0 z-50 bg-bg/80 flex items-center justify-center rounded-[1.5rem] md:rounded-[3rem] border border-border shadow-main p-4 md:p-0"
          >
            <div className="flex flex-col items-center gap-6 md:gap-8 p-8 md:p-12 w-full max-w-sm text-center bg-surface-200/80 rounded-[2rem] md:rounded-[2.5rem] border border-border shadow-pop">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-pop">
                <TerminalIcon className="text-primary w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black tracking-widest text-text-main uppercase">REGISTRO_DE_ENTIDADE</h3>
                <p className="text-[10px] text-text-muted uppercase tracking-[0.2em] font-bold">Alocar fragmento de identificação único</p>
              </div>
              <input 
                type="text" 
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="SEQUENCIA_ID" 
                maxLength={15}
                className="w-full text-center text-primary uppercase tracking-[0.5em] h-14 bg-surface-200/50 border border-border rounded-2xl focus:border-primary/30"
              />
              <button 
                onClick={confirmName} 
                disabled={!nameInput.trim()} 
                className="btn-premium w-full py-4"
              >
                CONFIRMAR_REGISTRO
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 md:gap-10 overflow-x-hidden">
        <div className="flex flex-col gap-6 md:gap-8">
          <PetStats pet={pet} />
          
          <div className="flex-grow flex flex-col items-center justify-center min-h-[300px] md:min-h-[400px] border border-border rounded-[2rem] md:rounded-[3rem] bg-surface-100/30 backdrop-blur-md relative overflow-hidden group shadow-main">
             <div className="noise-bg absolute inset-0 opacity-5 pointer-events-none" />
             <AnimatePresence>
               {pet.thoughts && (
                 <motion.div 
                   initial={{ opacity: 0, scale: 0.8, y: 10 }}
                   animate={{ opacity: 1, scale: 1, y: 0 }}
                   exit={{ opacity: 0, scale: 0.8 }}
                   className="absolute top-12 px-8 py-4 bg-surface-300 text-text-main text-[10px] font-black uppercase tracking-[0.3em] max-w-[80%] rounded-[1.5rem] shadow-main z-10 border border-border"
                 >
                   <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-surface-300 border-r border-b border-border rotate-45" />
                   {pet.thoughts}
                 </motion.div>
               )}
             </AnimatePresence>

            <div className="relative z-0 transition-transform duration-500 group-hover:scale-110">
              <AsciiEntity content={PET_ASCII[pet.stage]} isSleeping={pet.isSleeping} />
            </div>

            {/* Stage Badge */}
            <div className="absolute bottom-8 px-4 py-1.5 bg-surface-200 border border-border rounded-full text-[8px] font-black uppercase tracking-[0.3em] text-text-muted">
              Estágio_Evolutivo: <span className="text-primary">{pet.stage}</span>
            </div>
          </div>

          <PetControls pet={pet} onAction={handleAction} />
        </div>

        <div className="flex flex-col gap-6">
          <div className="bg-surface-100/40 backdrop-blur-xl border border-border p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] flex flex-col gap-8 shadow-main relative overflow-hidden">
            <div className="noise-bg absolute inset-0 opacity-5 pointer-events-none" />
            <div className="flex flex-col gap-6 relative z-10">
              <h3 className="text-[10px] text-text-muted font-black uppercase tracking-[0.4em] flex items-center gap-3">
                <span className="w-1.5 h-1.5 bg-primary rounded-full shadow-pop" />
                LOG_DO_SISTEMA_REALTIME
              </h3>
              <div className="flex flex-col gap-4 font-mono text-[11px] text-text-muted h-[200px] lg:h-[350px] overflow-y-auto custom-scrollbar pr-4">
                <div className="space-y-1">
                  <p className="flex justify-between"><span>&gt; ID_ENTIDADE:</span> <span className="text-text-main font-bold">{pet.name || "NÃO_REGISTRADO"}</span></p>
                  <p className="flex justify-between"><span>&gt; ESTADO_PULSO:</span> <span className="text-primary font-bold">{pet.isSleeping ? "HIBERNAÇÃO" : "CICLOS_ATIVOS"}</span></p>
                  <p className="flex justify-between"><span>&gt; IDADE_TEMPORAL:</span> <span className="text-text-muted/60">{Math.floor(pet.age / 10)} UNIDADES</span></p>
                  <p className="flex justify-between"><span>&gt; VERSÃO_NÚCLEO:</span> <span className="text-text-muted/60">v2.8_NEURAL</span></p>
                </div>
                <div className="h-px bg-border/20 my-2" />
                {pet.energy < 30 && (
                  <p className="text-danger font-black animate-flicker">
                    &gt;&gt;&gt; WARNING: CRITICAL_ENERGY_DEPLEATED
                  </p>
                )}
                <p className="text-[9px] leading-relaxed italic opacity-40">
                  Pronto para entrada neural. Mantenha estabilidade ideal para avanço de estágio...
                </p>
              </div>
            </div>

            <div className="pt-6 border-t border-border flex flex-col gap-5 relative z-10">
              <div className="flex justify-between items-center text-[9px] uppercase tracking-[0.3em] text-text-muted font-black">
                <span>Próximo_Ciclo_Crédito:</span>
                <span className={rechargeTime ? "text-text-muted/40" : "text-primary"}>{rechargeTime || "PRONTO_PARA_COLETA"}</span>
              </div>
              <button 
                onClick={handleClaim} 
                disabled={!!rechargeTime}
                className="btn-premium w-full py-5 text-[11px]"
              >
                {rechargeTime ? 'RECARREGANDO_BUFFER...' : 'COLETAR_OPACOINS'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mini-game Modals */}
      <AnimatePresence>
        {activeGame === 'play' && (
          <FixadorGame onFinish={(res) => onGameFinish('play', res)} />
        )}
        {activeGame === 'patch' && (
          <OptimizerGame onFinish={(res) => onGameFinish('patch', res)} />
        )}
        {activeGame === 'dino' && (
          <RunnerGame onFinish={(res) => onGameFinish('dino', res)} />
        )}
      </AnimatePresence>
    </div>
  );
}
