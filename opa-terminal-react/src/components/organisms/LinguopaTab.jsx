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
      <div className="flex flex-col sm:flex-row justify-between items-center gap-6 bg-surface/40 backdrop-blur-md p-8 border border-white/5 rounded-3xl shadow-xl z-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
          <div className="w-40 h-40 border-4 border-orange-500 rounded-full mix-blend-screen" />
        </div>
        
        <div className="flex flex-col text-center sm:text-left relative z-10">
          <h3 className="text-2xl font-black text-white tracking-[0.3em] uppercase mb-1">
            LINGUOPA_PROTOCOL
          </h3>
          <span className="text-[10px] text-white/40 uppercase tracking-[0.4em] font-bold">
            Terminal_Balance: <span className="text-glow">{Math.floor(pet.coins)} OPACOINS</span>
          </span>
        </div>
        
        <div className="flex items-center gap-4 relative z-10 bg-white/[0.02] px-6 py-3 rounded-2xl border border-white/5">
          <label className="text-[10px] text-white/60 font-black uppercase tracking-[0.3em]">SYNCH_SCORE:</label>
          <span className="text-3xl font-mono font-black text-orange-500">{score}</span>
        </div>
      </div>

      <div className="flex-grow flex flex-col justify-center items-center gap-16 text-center py-8 z-10">
        
        {/* Word Display */}
        <div className="flex flex-col gap-6 w-full cursor-default relative">
          <div className="absolute inset-0 bg-glow/5 blur-3xl rounded-full" />
          <label className="text-[10px] text-white/40 font-black tracking-[0.5em] uppercase relative z-10">
            TRANSLATE_SEQUENCE
          </label>
          <motion.div 
            key={opaWord}
            initial={{ scale: 0.9, opacity: 0, filter: 'blur(10px)' }}
            animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
            className={`text-4xl sm:text-5xl md:text-7xl font-mono font-black tracking-[10px] md:tracking-[20px] min-h-[100px] flex items-center justify-center break-all relative z-10 transition-colors duration-500 ${
              !isActive ? 'text-white/10' : 'text-glow drop-shadow-[0_0_30px_rgba(0,255,65,0.4)]'
            }`}
          >
            {isActive ? opaWord : "STANDBY"}
          </motion.div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-8 w-full md:max-w-3xl relative z-10">
          <div className="flex flex-col gap-4">
            <div className="relative group">
              <div className={`absolute -inset-1 rounded-2xl opacity-50 transition-all duration-500 blur-md ${
                feedback === 'correct' ? 'bg-glow' :
                feedback === 'error' ? 'bg-danger' :
                'bg-white/5 group-focus-within:bg-white/20'
              }`} />
              <input 
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={!isActive}
                placeholder="INPUT_HUMAN_FORMAT"
                className={`relative w-full text-center text-2xl font-black uppercase tracking-[0.5em] py-6 px-8 rounded-2xl transition-all duration-300 outline-none backdrop-blur-md ${
                  feedback === 'correct' ? 'border-glow bg-glow/10 text-glow' :
                  feedback === 'error' ? 'border-danger bg-danger/10 text-danger' :
                  'border-white/10 bg-surface/80 text-white focus:border-white/30 focus:bg-surface'
                }`}
                autoFocus
              />
            </div>
            
            <motion.div 
              key={status}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`text-[12px] font-black tracking-[0.5em] uppercase py-2 text-center h-6 ${
                feedback === 'correct' ? 'text-glow' :
                feedback === 'error' ? 'text-danger flex items-center justify-center gap-2' :
                'text-orange-500'
              }`}
            >
              {feedback === 'error' && <span className="w-2 h-2 bg-danger rounded-full animate-ping" />}
              {status}
            </motion.div>
          </div>
          
          <button 
            type="submit" 
            disabled={!isActive || !input.trim()} 
            className="btn-premium w-full py-6 text-sm flex items-center justify-center gap-4"
          >
            VALIDATE_SEQUENCE
          </button>
        </form>
      </div>

      <div className="flex justify-center border-t border-white/5 pt-8 z-10 mt-auto">
        {!isActive ? (
          <button onClick={start} className="bg-surface/60 border border-white/20 hover:bg-white/[0.05] hover:border-white/40 text-white font-black uppercase tracking-[0.4em] px-12 py-5 rounded-2xl transition-all duration-300 text-xs w-full max-w-lg">
            INITIALIZE_TRANSLATION_CORE
          </button>
        ) : (
          <button onClick={stop} className="bg-surface/60 border border-danger/30 hover:bg-danger/10 hover:border-danger text-danger font-black uppercase tracking-[0.4em] px-12 py-5 rounded-2xl transition-all duration-300 text-xs w-full max-w-lg">
            TERMINATE_PROTOCOL
          </button>
        )}
      </div>
    </div>
  );
}
