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
            <label className="text-[10px] font-black uppercase text-text-muted tracking-[0.4em] flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5" />
              ENTRADA_HUMANA
            </label>
            <span className="text-[8px] text-text-muted/20 font-mono font-bold">{normalText.length} CARACTERES</span>
          </div>
          
          <div className="relative group flex-grow">
            <div className="absolute -inset-0.5 bg-gradient-to-br from-border via-primary/20 to-border rounded-[2rem] opacity-30 group-focus-within:opacity-100 blur-sm transition-all duration-700" />
            <textarea
              value={normalText}
              onChange={(e) => handleNormalChange(e.target.value)}
              placeholder="Aguardando entrada para transcodificação..."
              className="relative h-[300px] md:h-[450px] w-full bg-surface-100 border border-border p-8 rounded-[2rem] focus:border-primary/40 focus:bg-surface-200 transition-all font-mono custom-scrollbar resize-none text-sm md:text-base leading-relaxed text-text-main placeholder:text-text-muted/30 shadow-inner"
            />
            <div className="absolute bottom-6 right-6 flex items-center gap-3">
               {normalText && (
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: 40 }}
                    className="h-1 bg-primary/40 rounded-full overflow-hidden"
                  >
                    <motion.div 
                      animate={{ x: [-40, 40] }}
                      transition={{ repeat: Infinity, duration: 1 }}
                      className="w-full h-full bg-primary"
                    />
                  </motion.div>
               )}
               <Languages className="w-6 h-6 text-text-muted/10 group-focus-within:text-primary/40 transition-colors" />
            </div>
          </div>

          <div className="flex justify-end">
            <Button 
                variant="danger" 
                onClick={clear} 
                className="px-8 py-3 flex items-center gap-2 group btn-premium-outline opacity-60 hover:opacity-100 transition-opacity"
            >
                <Trash2 className="w-3.5 h-3.5 group-hover:animate-shake" />
                LIMPAR_BUFFER
            </Button>
          </div>
        </div>

        {/* Transmission Bridge */}
        <div className="flex lg:flex-col items-center justify-center gap-6 py-8">
            <div className="w-px h-16 lg:h-32 bg-gradient-to-b from-transparent via-primary/40 to-transparent relative">
               {normalText && <motion.div animate={{ y: [0, 100] }} transition={{ repeat: Infinity, duration: 1.5 }} className="absolute top-0 left-[-1px] w-[3px] h-8 bg-primary blur-[2px]" />}
            </div>
            <div className="relative group">
                <div className="absolute inset-0 bg-primary/20 blur-xl animate-pulse group-hover:bg-primary/40 transition-colors" />
                <div className="relative w-12 h-12 rounded-full bg-surface-200 border border-primary/20 flex items-center justify-center shadow-pop">
                  <Zap className={`w-6 h-6 ${normalText ? 'text-primary animate-flicker' : 'text-text-muted/20'}`} />
                </div>
            </div>
            <div className="w-px h-16 lg:h-32 bg-gradient-to-b from-transparent via-primary/40 to-transparent relative">
               {normalText && <motion.div animate={{ y: [0, 100] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.5 }} className="absolute top-0 left-[-1px] w-[3px] h-8 bg-primary blur-[2px]" />}
            </div>
        </div>

        {/* OPA Output */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between px-2">
            <label className="text-[10px] font-black uppercase text-primary/40 tracking-[0.4em] flex items-center gap-2">
              <Brain className="w-3.5 h-3.5" />
              SAÍDA_SINTAXE_OPA
            </label>
            <div className="flex gap-1.5">
                {[1, 2, 3].map(i => (
                    <div key={i} className={`w-1 h-3 rounded-full transition-all duration-500 ${opaText ? 'bg-primary shadow-pop' : 'bg-border'} ${i === 3 && opaText ? 'animate-pulse' : ''}`} />
                ))}
            </div>
          </div>

          <div className="relative group flex-grow">
            <div className="absolute -inset-0.5 bg-gradient-to-br from-primary/20 via-transparent to-primary/20 rounded-[2rem] opacity-30 group-focus-within:opacity-100 blur-sm transition-all duration-700" />
            <textarea
              value={opaText}
              onChange={(e) => handleOpaChange(e.target.value)}
              placeholder="Fragmento do protocolo OPA detectado..."
              className="relative h-[300px] md:h-[450px] w-full bg-primary/5 border border-primary/10 p-8 rounded-[2rem] text-primary focus:border-primary/40 focus:bg-primary/10 transition-all font-mono custom-scrollbar resize-none text-sm md:text-base leading-relaxed shadow-inner"
            />
            <div className="absolute bottom-6 right-6 flex items-center gap-4">
                {opaText && (
                   <motion.div 
                     animate={{ opacity: [0.2, 1, 0.2] }}
                     transition={{ repeat: Infinity, duration: 2 }}
                     className="text-[10px] font-black text-primary tracking-[0.2em] bg-primary/10 px-3 py-1 rounded-full border border-primary/20"
                   >
                     CRIPTOGRAFADO
                   </motion.div>
                )}
                <Brain className={`w-6 h-6 ${opaText ? 'text-primary' : 'text-text-muted/10'} group-focus-within:text-primary/40 transition-colors`} />
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
                COPIAR_TRADUÇÃO
            </Button>
          </div>
        </div>

      </div>

      {/* Usage Tip */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-surface-100/30 backdrop-blur-md border border-border p-8 rounded-[2.5rem] flex items-center gap-6 shadow-main"
      >
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 group">
            <Zap className="w-6 h-6 text-primary group-hover:scale-125 transition-transform" />
          </div>
          <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-black uppercase text-text-muted tracking-[0.3em]">AVISO_DO_SISTEMA</span>
              <p className="text-xs text-text-muted/60 leading-relaxed uppercase max-w-2xl font-bold">
                Cada transcodificação de fragmento contribui para o desenvolvimento neural da sua entidade. Complete 10 sequências para acionar um evento de recompensa em massa.
              </p>
          </div>
      </motion.div>
    </motion.div>
  );
}
