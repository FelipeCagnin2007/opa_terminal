import { useState } from 'react';
import { Button } from '../atoms/Button';
import { decodificar } from '../../utils/opaCore';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Play, RotateCcw } from 'lucide-react';

export function ExecutorTab() {
  const [code, setCode] = useState("");
  const [output, setOutput] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);

  const handleExecute = () => {
    if (!code.trim()) return;
    setIsExecuting(true);
    setOutput("");
    
    // Simulate compilation/execution
    setTimeout(() => {
      const decoded = decodificar(code);
      setOutput("\n[SUCESSO] Código decodificado.\nIniciando hipervisor do Sistema Ciberespaço...\nEmulando resultado em janela externa...");
      
      const newWin = window.open('', '_blank');
      if (newWin) {
        newWin.document.open();
        newWin.document.write(decoded);
        newWin.document.close();
      } else {
        setOutput("\n[ERRO] Pop-up bloqueado pelo protocolo de segurança. Permita pop-ups para emular a página.");
      }
      setIsExecuting(false);
    }, 1500);
  };

  return (
    <div className="flex flex-col gap-10 py-6 h-full">
      <div className="flex flex-col gap-4">
        <label className="text-[10px] font-black uppercase text-text-muted tracking-[0.4em] flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5" />
          FLUXO_DE_ENTRADA_PROTOCOLO
        </label>
        
        <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-b from-white/5 to-transparent rounded-3xl opacity-50 group-focus-within:opacity-100 transition-opacity" />
            <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Aguardando fragmento OPA para reversão..."
                className="relative h-[250px] w-full bg-surface-200 border border-border p-8 rounded-3xl focus:border-primary/40 focus:bg-surface-300 transition-all font-mono custom-scrollbar resize-none text-sm leading-relaxed"
            />
            <div className="absolute bottom-6 right-6 text-text-muted/20 group-focus-within:text-text-muted transition-colors">
                <Play className="w-6 h-6" />
            </div>
        </div>

        <button 
          onClick={handleExecute} 
          disabled={isExecuting || !code.trim()}
          className="btn-premium w-full md:w-auto self-end flex items-center justify-center gap-3"
        >
          {isExecuting ? (
            <>
                <div className="w-3 h-3 border-2 border-bg/30 border-t-bg rounded-full animate-spin" />
                <span>PROCESSANDO_FRAGMENTOS...</span>
            </>
          ) : (
            <>
                <Play className="w-3.5 h-3.5" />
                <span>INICIAR_EXECUÇÃO</span>
            </>
          )}
        </button>
      </div>

      <div className="flex flex-col gap-4 flex-grow">
        <div className="flex justify-between items-center px-1">
          <label className="text-[10px] font-black uppercase text-primary/40 tracking-[0.4em] flex items-center gap-2">
            <RotateCcw className="w-3.5 h-3.5" /> 
            SAÍDA_DO_CONSOLE_NUCLEO
          </label>
          <button 
            onClick={() => setOutput("")} 
            className="text-[9px] text-text-muted hover:text-text-main transition-colors font-black uppercase tracking-[0.2em] border-b border-border"
          >
            LIMPAR_CACHE
          </button>
        </div>
        
        <div className="bg-surface-100/40 backdrop-blur-md border border-border p-8 rounded-[2rem] flex-grow font-mono text-sm relative overflow-hidden min-h-[200px] shadow-main">
          <AnimatePresence>
            {isExecuting && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-surface-300/80 flex items-center justify-center z-10 backdrop-blur-lg"
              >
                <div className="flex flex-col items-center gap-6">
                  <div className="w-16 h-16 border-2 border-primary/10 border-t-primary rounded-3xl animate-[spin_3s_linear_infinite]" />
                  <span className="text-[9px] text-primary font-black animate-pulse uppercase tracking-[0.5em]">descriptografando_buffer_neural...</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {output ? (
            <motion.pre 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-primary whitespace-pre-wrap leading-relaxed relative z-0"
            >
              <div className="flex items-center gap-2 mb-4 text-text-muted/20">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shadow-pop" />
                <span className="text-[9px] font-black tracking-widest uppercase">Resultado encontrado:</span>
              </div>
              {output}
            </motion.pre>
          ) : (
            <div className="flex flex-col gap-2 opacity-20">
              <span className="text-[10px] uppercase font-black tracking-widest">Aguardando_instruções...</span>
              <div className="h-0.5 w-12 bg-white" />
            </div>
          )}

          {/* Scanline effect for console */}
          <div className="absolute inset-0 pointer-events-none opacity-20 bg-gradient-to-b from-transparent via-primary/[0.05] to-transparent h-4 animate-scanline" />
        </div>
      </div>
    </div>
  );
}
