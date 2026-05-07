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
    <div className="flex flex-col gap-10 py-6 h-full relative">
      <div className="noise-bg absolute inset-0 opacity-5 pointer-events-none" />

      {/* Header Info */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 md:gap-6 bg-surface-100/40 backdrop-blur-md p-4 md:p-8 border border-border rounded-2xl md:rounded-3xl shadow-main z-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
          <div className="w-40 h-40 border-4 border-primary rounded-full mix-blend-screen" />
        </div>
        
        <div className="flex flex-col text-center sm:text-left relative z-10">
          <h3 className="text-xl md:text-2xl font-black text-text-main tracking-[0.1em] md:tracking-[0.3em] uppercase mb-1">
            LINGUOPA_PROTOCOL
          </h3>
          <span className="text-[9px] md:text-[10px] text-text-muted uppercase tracking-[0.2em] md:tracking-[0.4em] font-bold">
            Terminal_Balance: <span className="text-primary">{Math.floor(pet.coins)} OPACOINS</span>
          </span>
        </div>
        
        <div className="flex items-center gap-3 md:gap-4 relative z-10 bg-surface-200/50 px-4 md:px-6 py-2 md:py-3 rounded-xl md:rounded-2xl border border-border">
          <label className="text-[9px] md:text-[10px] text-text-muted font-black uppercase tracking-[0.2em] md:tracking-[0.3em]">SYNCH_SCORE:</label>
          <span className="text-2xl md:text-3xl font-mono font-black text-primary">{score}</span>
        </div>
      </div>

      <div className="flex-grow flex flex-col justify-center items-center gap-16 text-center py-8 z-10">
        
        {/* Word Display */}
        <div className="flex flex-col gap-6 w-full cursor-default relative">
          <div className="absolute inset-0 bg-primary/5 blur-3xl rounded-full" />
          <label className="text-[10px] text-text-muted font-black tracking-[0.5em] uppercase relative z-10">
            TRANSLATE_SEQUENCE
          </label>
          <motion.div 
            key={opaWord}
            initial={{ scale: 0.9, opacity: 0, filter: 'blur(10px)' }}
            animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
            className={`text-2xl sm:text-5xl md:text-7xl font-mono font-black tracking-[4px] md:tracking-[20px] min-h-[80px] md:min-h-[100px] flex items-center justify-center break-all relative z-10 transition-colors duration-500 ${
              !isActive ? 'text-text-muted/10' : 'text-primary shadow-pop'
            }`}
          >
            {isActive ? opaWord : "AGUARDANDO"}
          </motion.div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-8 w-full md:max-w-3xl relative z-10">
          <div className="flex flex-col gap-4">
            <div className="relative group">
              <div className={`absolute -inset-1 rounded-2xl opacity-50 transition-all duration-500 blur-md ${
                feedback === 'correct' ? 'bg-primary' :
                feedback === 'error' ? 'bg-danger' :
                'bg-border/5 group-focus-within:bg-border/20'
              }`} />
              <input 
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={!isActive}
                placeholder="ENTRADA_FORMATO_HUMANO"
                className={`relative w-full text-center text-lg md:text-2xl font-black tracking-[0.1em] md:tracking-[0.5em] py-4 md:py-6 px-4 md:px-8 rounded-xl md:rounded-2xl transition-all duration-300 outline-none backdrop-blur-md ${
                  feedback === 'correct' ? 'border-primary bg-primary/10 text-primary' :
                  feedback === 'error' ? 'border-danger bg-danger/10 text-danger' :
                  'border-border bg-surface-200 text-text-main focus:border-primary/30 focus:bg-surface-100'
                }`}
                autoFocus
              />
            </div>
            
            <motion.div 
              key={status}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`text-[12px] font-black tracking-[0.5em] uppercase py-2 text-center h-6 ${
                feedback === 'correct' ? 'text-primary' :
                feedback === 'error' ? 'text-danger flex items-center justify-center gap-2' :
                'text-accent'
              }`}
            >
              {feedback === 'error' && <span className="w-2 h-2 bg-danger rounded-full animate-ping" />}
              {status}
            </motion.div>
          </div>
          
          <Button 
            type="submit" 
            disabled={!isActive || !input.trim()} 
            className="w-full py-6 text-sm"
          >
            VALIDAR_SEQUENCIA
          </Button>
        </form>
      </div>

      <div className="flex justify-center border-t border-border pt-8 z-10 mt-auto">
        {!isActive ? (
          <Button onClick={start} variant="primary" className="px-12 py-5 text-xs w-full max-w-lg">
            INICIALIZAR_NUCLEO_TRADUCAO
          </Button>
        ) : (
          <Button onClick={stop} variant="danger" className="px-12 py-5 text-xs w-full max-w-lg">
            TERMINATE_PROTOCOL
          </Button>
        )}
      </div>
    </div>
  );
}
