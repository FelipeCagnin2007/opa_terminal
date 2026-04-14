import { useState, useEffect } from 'react';
import { usePet } from '../../context/PetContext';
import { useAuthContext } from '../../context/AuthContext';
import { PetStats } from './PetStats';
import { PetControls } from './PetControls';
import { AsciiEntity } from '../atoms/AsciiEntity';
import { PET_ASCII } from '../../utils/petConstants';
import { Button } from '../atoms/Button';
import { motion, AnimatePresence } from 'framer-motion';
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
    <div className="flex flex-col gap-8 py-4 relative h-full">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] bg-glow text-bg px-6 py-3 rounded-full font-black text-[10px] uppercase tracking-widest shadow-[0_0_30px_var(--color-glow)]"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Naming Overlay */}
      <AnimatePresence>
        {!pet.name && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-50 bg-bg/95 flex items-center justify-center rounded-2xl border-2 border-glow shadow-[0_0_50px_rgba(0,255,65,0.2)]"
          >
            <div className="flex flex-col items-center gap-6 p-8 max-w-sm text-center">
              <h3 className="text-xl">Registro de Entidade</h3>
              <p className="text-xs text-accent uppercase tracking-widest">Insira um identificador para o protocolo:</p>
              <input 
                type="text" 
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="NOME_DA_ENTIDADE" 
                maxLength={15}
                className="w-full text-center text-glow uppercase"
              />
              <Button onClick={confirmName} disabled={!nameInput.trim()} className="w-full">
                Confirmar Registro
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-8">
        <div className="flex flex-col gap-6">
          <PetStats pet={pet} />
          
          <div className="flex-grow flex flex-col items-center justify-center min-h-[350px] border-2 border-white/5 rounded-3xl bg-white/5 relative overflow-hidden">
             <AnimatePresence>
               {pet.thoughts && (
                 <motion.div 
                   initial={{ opacity: 0, scale: 0.8, y: 10 }}
                   animate={{ opacity: 1, scale: 1, y: 0 }}
                   exit={{ opacity: 0, scale: 0.8 }}
                   className="absolute top-10 px-6 py-3 bg-white text-bg text-[10px] font-black uppercase tracking-widest max-w-[80%] rounded-2xl shadow-xl z-10"
                 >
                   {pet.thoughts}
                 </motion.div>
               )}
             </AnimatePresence>

            <AsciiEntity content={PET_ASCII[pet.stage]} isSleeping={pet.isSleeping} />
          </div>

          <PetControls pet={pet} onAction={handleAction} />
        </div>

        <div className="bg-white/5 border-2 border-white/5 p-6 rounded-3xl flex flex-col gap-8">
          <div className="flex flex-col gap-4">
            <h3 className="text-[11px] text-white font-black uppercase tracking-[0.3em] flex items-center gap-2 border-b-2 border-white/5 pb-3">
              <span className="w-2 h-2 bg-glow rounded-full" />
              SISTEMA_LOGS
            </h3>
            <div className="flex flex-col gap-2 font-mono text-[11px] text-white/50 h-[120px] lg:h-[400px] overflow-y-auto custom-scrollbar">
              <p>&gt; Entidade: <span className="text-white">{pet.name || "UNNAMED"}</span></p>
              <p>&gt; Status: <span className="text-glow">{pet.isSleeping ? "HIBERNAÇÃO" : "MODO_ATIVO"}</span></p>
              <p>&gt; Idade: {Math.floor(pet.age / 10)} unidades.</p>
              <p>&gt; Protocolo: v2.8x_STABLE</p>
              {pet.energy < 30 && <p className="text-danger font-black">&gt; ALERTA_ENERGIA: NÍVEL CRÍTICO</p>}
            </div>
          </div>

          <div className="mt-auto pt-4 flex flex-col gap-4">
            <div className="flex justify-between items-center text-[10px] uppercase tracking-widest text-white/40 font-black">
              <span>Recarga Diária</span>
              <span className="text-white">{rechargeTime || "DISPONÍVEL"}</span>
            </div>
            <Button 
               onClick={handleClaim} 
               disabled={!!rechargeTime}
               variant="glow"
               className="w-full py-6"
            >
               {rechargeTime ? 'EM RECARGA...' : 'COLETAR_CRÉDITOS'}
            </Button>
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
