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
            className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[200] bg-white text-bg px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] shadow-2xl border border-white/20"
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
            className="absolute inset-x-0 -top-4 bottom-0 z-50 bg-bg/80 flex items-center justify-center rounded-[3rem] border border-white/5 shadow-2xl"
          >
            <div className="flex flex-col items-center gap-8 p-12 max-w-sm text-center bg-surface/80 rounded-[2.5rem] border border-white/10 shadow-glow">
              <div className="w-16 h-16 rounded-2xl bg-glow/10 flex items-center justify-center border border-glow/20">
                <TerminalIcon className="text-glow w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black tracking-widest text-white uppercase">Entity_Registration</h3>
                <p className="text-[10px] text-white/30 uppercase tracking-[0.2em] font-bold">Allocate unique identification fragment</p>
              </div>
              <input 
                type="text" 
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="ID_SEQUENCE" 
                maxLength={15}
                className="w-full text-center text-glow uppercase tracking-[0.5em] h-14 bg-bg/50 border-white/5 rounded-2xl focus:border-glow/30"
              />
              <button 
                onClick={confirmName} 
                disabled={!nameInput.trim()} 
                className="btn-premium w-full py-4"
              >
                CONFIRM_REGISTRY
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-10">
        <div className="flex flex-col gap-8">
          <PetStats pet={pet} />
          
          <div className="flex-grow flex flex-col items-center justify-center min-h-[400px] border border-white/5 rounded-[3rem] bg-surface/30 backdrop-blur-md relative overflow-hidden group shadow-2xl">
             <div className="noise-bg absolute inset-0 opacity-5 pointer-events-none" />
             <AnimatePresence>
               {pet.thoughts && (
                 <motion.div 
                   initial={{ opacity: 0, scale: 0.8, y: 10 }}
                   animate={{ opacity: 1, scale: 1, y: 0 }}
                   exit={{ opacity: 0, scale: 0.8 }}
                   className="absolute top-12 px-8 py-4 bg-white text-bg text-[10px] font-black uppercase tracking-[0.3em] max-w-[80%] rounded-[1.5rem] shadow-2xl z-10"
                 >
                   <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white rotate-45" />
                   {pet.thoughts}
                 </motion.div>
               )}
             </AnimatePresence>

            <div className="relative z-0 transition-transform duration-500 group-hover:scale-110">
              <AsciiEntity content={PET_ASCII[pet.stage]} isSleeping={pet.isSleeping} />
            </div>

            {/* Stage Badge */}
            <div className="absolute bottom-8 px-4 py-1.5 bg-white/[0.03] border border-white/10 rounded-full text-[8px] font-black uppercase tracking-[0.3em] text-white/30">
              Evolution_Stage: <span className="text-glow">{pet.stage}</span>
            </div>
          </div>

          <PetControls pet={pet} onAction={handleAction} />
        </div>

        <div className="flex flex-col gap-6">
          <div className="bg-surface/40 backdrop-blur-xl border border-white/5 p-8 rounded-[2.5rem] flex flex-col gap-8 shadow-2xl relative overflow-hidden">
            <div className="noise-bg absolute inset-0 opacity-5 pointer-events-none" />
            <div className="flex flex-col gap-6 relative z-10">
              <h3 className="text-[10px] text-white/30 font-black uppercase tracking-[0.4em] flex items-center gap-3">
                <span className="w-1.5 h-1.5 bg-glow rounded-full box-glow" />
                SYSTEM_LOG_REALTIME
              </h3>
              <div className="flex flex-col gap-4 font-mono text-[11px] text-white/40 h-[200px] lg:h-[350px] overflow-y-auto custom-scrollbar pr-4">
                <div className="space-y-1">
                  <p className="flex justify-between"><span>&gt; ENTITY_ID:</span> <span className="text-white font-bold">{pet.name || "UNREGISTERED"}</span></p>
                  <p className="flex justify-between"><span>&gt; PULSE_STATE:</span> <span className="text-glow font-bold">{pet.isSleeping ? "HIBERNATION" : "ACTIVE_CYCLES"}</span></p>
                  <p className="flex justify-between"><span>&gt; TEMPORAL_AGE:</span> <span className="text-white/60">{Math.floor(pet.age / 10)} UNITS</span></p>
                  <p className="flex justify-between"><span>&gt; CORE_VERSION:</span> <span className="text-white/60">v2.8_NEURAL</span></p>
                </div>
                <div className="h-px bg-white/5 my-2" />
                {pet.energy < 30 && (
                  <p className="text-danger font-black animate-flicker">
                    &gt;&gt;&gt; WARNING: CRITICAL_ENERGY_DEPLEATED
                  </p>
                )}
                <p className="text-[9px] leading-relaxed italic opacity-40">
                  Ready for neural input. Maintain optimal stability for stage advancement...
                </p>
              </div>
            </div>

            <div className="pt-6 border-t border-white/5 flex flex-col gap-5 relative z-10">
              <div className="flex justify-between items-center text-[9px] uppercase tracking-[0.3em] text-white/20 font-black">
                <span>Next_Credit_Cycle:</span>
                <span className={rechargeTime ? "text-white/40" : "text-glow"}>{rechargeTime || "READY_FOR_COLLECTION"}</span>
              </div>
              <button 
                onClick={handleClaim} 
                disabled={!!rechargeTime}
                className="btn-premium w-full py-5 text-[11px]"
              >
                {rechargeTime ? 'RECHARGING_BUFFER...' : 'COLLECT_OPACOINS'}
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
