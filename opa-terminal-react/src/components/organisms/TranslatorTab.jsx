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
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-8"
    >
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-4 items-center">
        
        {/* Human Input */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between px-1">
            <label className="text-[10px] font-black uppercase text-white/40 tracking-[0.3em] flex items-center gap-2">
              <Terminal className="w-3 h-3" />
              INPUT_HUMANO
            </label>
            <span className="text-[8px] text-white/20 font-mono">CHAR_COUNT: {normalText.length}</span>
          </div>
          <div className="relative group">
            <textarea
              value={normalText}
              onChange={(e) => handleNormalChange(e.target.value)}
              placeholder="Insira texto ou código aqui para transcodificação..."
              className="h-[250px] md:h-[400px] w-full bg-surface/40 border-2 border-white/5 p-6 rounded-3xl focus:border-glow/30 transition-all font-mono custom-scrollbar resize-none"
            />
            <div className="absolute top-4 right-4 opacity-10 group-focus-within:opacity-30 transition-opacity">
                <Languages className="w-8 h-8" />
            </div>
          </div>
          <div className="flex justify-end">
            <Button 
                variant="danger" 
                onClick={clear} 
                className="px-8 flex items-center gap-2 group"
            >
                <Trash2 className="w-3 h-3 group-hover:animate-shake" />
                LIMPAR_BUFFER
            </Button>
          </div>
        </div>

        {/* Transmission Bridge */}
        <div className="flex lg:flex-col items-center justify-center gap-4 py-4 opacity-20">
            <div className="w-px h-8 lg:w-8 lg:h-px bg-glow" />
            <Zap className="w-5 h-5 text-glow animate-pulse" />
            <div className="w-px h-8 lg:w-8 lg:h-px bg-glow" />
        </div>

        {/* OPA Output */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between px-1">
            <label className="text-[10px] font-black uppercase text-glow/60 tracking-[0.3em] flex items-center gap-2">
              <Brain className="w-3 h-3" />
              SINTAXE_OPA_CORE
            </label>
            <div className="flex gap-1">
                <div className={`w-1 h-3 rounded-full ${opaText ? 'bg-glow' : 'bg-white/5'}`} />
                <div className={`w-1 h-3 rounded-full ${opaText ? 'bg-glow' : 'bg-white/5'}`} />
                <div className={`w-1 h-3 rounded-full ${opaText ? 'bg-glow animate-pulse' : 'bg-white/5'}`} />
            </div>
          </div>
          <div className="relative group">
            <textarea
              value={opaText}
              onChange={(e) => handleOpaChange(e.target.value)}
              placeholder="Cole código OPA aqui para decodificação reversa..."
              className="h-[250px] md:h-[400px] w-full bg-glow/5 border-2 border-glow/10 p-6 rounded-3xl text-glow focus:border-glow/40 transition-all font-mono custom-scrollbar resize-none"
            />
            <div className="absolute top-4 right-4 text-glow/20">
                <Zap className="w-8 h-8" />
            </div>
          </div>
          <div className="flex justify-end">
            <Button 
                variant="glow" 
                onClick={() => handleCopy(opaText)} 
                disabled={!opaText}
                className="w-full md:w-auto px-10 flex items-center justify-center gap-3 relative overflow-hidden group"
            >
                <Copy className="w-4 h-4 transition-transform group-hover:scale-110" />
                COPIAR_OPA_PROTOCOL
                {opaText && <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />}
            </Button>
          </div>
        </div>

      </div>

      {/* Usage Tip */}
      <div className="bg-white/5 border border-white/10 p-6 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-glow/10 flex items-center justify-center border border-glow/20">
            <Zap className="w-5 h-5 text-glow" />
          </div>
          <div className="flex flex-col gap-1">
              <span className="text-[10px] font-black uppercase text-white/80 tracking-widest">DICA_DE_SISTEMA</span>
              <p className="text-[11px] text-white/40 leading-relaxed uppercase">
                Cada cópia de protocolo gera recompensas para sua entidade. Atinja metas de 10 traduções para bônus massivos.
              </p>
          </div>
      </div>
    </motion.div>
  );
}
