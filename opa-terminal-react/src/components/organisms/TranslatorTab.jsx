import { useTranslator } from '../../hooks/useTranslator';
import { usePet } from '../../context/PetContext';
import { Button } from '../atoms/Button';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Trash2, Zap, Languages, Brain, Terminal } from 'lucide-react';

export function TranslatorTab() {
  const { normalText, opaText, handleNormalChange, handleOpaChange, clear } = useTranslator();
  const { registerTranslation } = usePet();

  const handleCopy = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    registerTranslation();
  };

  return (
    <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col gap-10"
    >
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-6 items-stretch">
        
        {/* Human Input */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between px-2">
            <label className="text-[10px] font-black uppercase text-white/30 tracking-[0.4em] flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5" />
              HUMAN_BUFFER
            </label>
            <span className="text-[8px] text-white/10 font-mono font-bold">{normalText.length} CHARS</span>
          </div>
          
          <div className="relative group flex-grow">
            <div className="absolute -inset-0.5 bg-gradient-to-b from-white/5 to-transparent rounded-[2rem] opacity-50 group-focus-within:opacity-100 transition-opacity" />
            <textarea
              value={normalText}
              onChange={(e) => handleNormalChange(e.target.value)}
              placeholder="Awaiting input for transcodification..."
              className="relative h-[300px] md:h-[450px] w-full bg-surface/60 border border-white/5 p-8 rounded-[2rem] focus:border-white/20 focus:bg-surface/80 transition-all font-mono custom-scrollbar resize-none text-sm leading-relaxed"
            />
            <Languages className="absolute bottom-6 right-6 w-6 h-6 text-white/5 group-focus-within:text-white/20 transition-colors" />
          </div>

          <div className="flex justify-end">
            <Button 
                variant="danger" 
                onClick={clear} 
                className="px-8 py-3 flex items-center gap-2 group btn-premium-outline opacity-60 hover:opacity-100 transition-opacity"
            >
                <Trash2 className="w-3.5 h-3.5 group-hover:animate-shake" />
                PURGE_BUFFER
            </Button>
          </div>
        </div>

        {/* Transmission Bridge */}
        <div className="flex lg:flex-col items-center justify-center gap-6 py-8">
            <div className="w-px h-16 lg:h-32 bg-gradient-to-b from-transparent via-white/5 to-transparent" />
            <div className="relative">
                <div className="absolute inset-0 bg-glow/20 blur-lg animate-pulse" />
                <Zap className="relative w-6 h-6 text-glow" />
            </div>
            <div className="w-px h-16 lg:h-32 bg-gradient-to-b from-transparent via-white/5 to-transparent" />
        </div>

        {/* OPA Output */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between px-2">
            <label className="text-[10px] font-black uppercase text-glow/40 tracking-[0.4em] flex items-center gap-2">
              <Brain className="w-3.5 h-3.5" />
              OPA_SYNTAX_OUTPUT
            </label>
            <div className="flex gap-1.5">
                {[1, 2, 3].map(i => (
                    <div key={i} className={`w-1 h-3 rounded-full transition-all duration-500 ${opaText ? 'bg-glow box-glow' : 'bg-white/5'} ${i === 3 && opaText ? 'animate-pulse' : ''}`} />
                ))}
            </div>
          </div>

          <div className="relative group flex-grow">
            <div className="absolute -inset-0.5 bg-gradient-to-b from-glow/10 to-transparent rounded-[2rem] opacity-50 group-focus-within:opacity-100 transition-opacity" />
            <textarea
              value={opaText}
              onChange={(e) => handleOpaChange(e.target.value)}
              placeholder="OPA Protocol fragment detected..."
              className="relative h-[300px] md:h-[450px] w-full bg-glow/[0.03] border border-glow/10 p-8 rounded-[2rem] text-glow focus:border-glow/40 focus:bg-glow/[0.06] transition-all font-mono custom-scrollbar resize-none text-sm leading-relaxed"
            />
            <div className="absolute bottom-6 right-6 text-glow/10 group-focus-within:text-glow/30 transition-colors">
                <Zap className="w-6 h-6" />
            </div>
          </div>

          <div className="flex justify-end">
            <Button 
                variant="glow" 
                onClick={() => handleCopy(opaText)} 
                disabled={!opaText}
                className="w-full md:w-auto px-12 py-4 flex items-center justify-center gap-3 relative overflow-hidden group btn-premium"
            >
                <Copy className="w-4 h-4 transition-transform group-hover:scale-110" />
                EXECUTE_COPY_PROTOCOL
            </Button>
          </div>
        </div>

      </div>

      {/* Usage Tip */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-surface/30 backdrop-blur-md border border-white/5 p-8 rounded-[2.5rem] flex items-center gap-6 shadow-xl"
      >
          <div className="w-14 h-14 rounded-2xl bg-glow/5 flex items-center justify-center border border-glow/10 group">
            <Zap className="w-6 h-6 text-glow group-hover:scale-125 transition-transform" />
          </div>
          <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-black uppercase text-white/50 tracking-[0.3em]">SYSTEM_ADVISORY</span>
              <p className="text-xs text-white/30 leading-relaxed uppercase max-w-2xl font-bold">
                Each fragment transcodification contributes to your entity's neural development. Complete 10 sequences to trigger a mass reward event.
              </p>
          </div>
      </motion.div>
    </motion.div>
  );
}
