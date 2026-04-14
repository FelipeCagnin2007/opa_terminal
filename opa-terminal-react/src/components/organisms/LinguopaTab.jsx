import { useState } from 'react';
import { useLinguopa } from '../../hooks/useLinguopa';
import { usePet } from '../../context/PetContext';
import { Button } from '../atoms/Button';
import { motion, AnimatePresence } from 'framer-motion';

export function LinguopaTab() {
  const { pet, updatePet } = usePet();
  const {
    isActive, score, opaWord, status, feedback,
    start, stop, check
  } = useLinguopa(pet, updatePet);

  const [input, setInput] = useState("");

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    check(input);
    setInput("");
  };

  return (
    <div className="flex flex-col gap-8 py-4 h-full">
      <div className="flex justify-between items-center gap-4 bg-surface/30 p-4 border border-border rounded-xl">
        <div className="flex flex-col">
          <h3 className="text-sm font-black text-glow">LINGUOPA QUIZ</h3>
          <span className="text-[10px] text-accent uppercase tracking-widest">Saldo: ⟡ {Math.floor(pet.coins)} OPACOINS</span>
        </div>
        <div className="text-energy font-bold text-lg">PONTOS: {score}</div>
      </div>

      <div className="flex-grow flex flex-col justify-center items-center gap-12 text-center py-6">
        <div className="flex flex-col gap-4 w-full cursor-default">
          <label className="text-[10px] text-accent font-black tracking-widest uppercase">Palavra OPA</label>
          <motion.div 
            key={opaWord}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`text-2xl sm:text-3xl md:text-5xl font-mono tracking-[4px] md:tracking-[10px] min-h-[80px] flex items-center justify-center break-all ${
              !isActive ? 'text-accent/20' : 'text-glow drop-shadow-[0_0_20px_var(--color-glow)]'
            }`}
          >
            {isActive ? opaWord : "INICIE PROTOCOLO"}
          </motion.div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6 w-full md:max-w-2xl">
          <div className="flex flex-col gap-2">
            <input 
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={!isActive}
              placeholder="Traduzir para Humano"
              className={`w-full text-center text-xl font-bold border-2 transition-all ${
                feedback === 'correct' ? 'border-glow bg-glow/10' :
                feedback === 'error' ? 'border-danger bg-danger/10' :
                'border-border/60 focus:border-glow'
              }`}
              autoFocus
            />
            <motion.div 
              key={status}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`text-[10px] font-black tracking-widest uppercase py-2 ${
                feedback === 'correct' ? 'text-glow' :
                feedback === 'error' ? 'text-danger' :
                'text-energy'
              }`}
            >
              {status}
            </motion.div>
          </div>
          
          <Button type="submit" disabled={!isActive || !input.trim()} className="py-4 w-full">
            CHECK (Sincronizar)
          </Button>
        </form>
      </div>

      <div className="flex justify-center border-t border-border pt-6">
        {!isActive ? (
          <Button variant="large" onClick={start} className="max-w-xs">Iniciar Desafio de Tradução</Button>
        ) : (
          <Button variant="danger" onClick={stop} className="max-w-xs w-full">Encerrar Protocolo</Button>
        )}
      </div>
    </div>
  );
}
