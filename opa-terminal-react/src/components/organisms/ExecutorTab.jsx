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
      setOutput(decoded);
      setIsExecuting(false);
    }, 1500);
  };

  return (
    <div className="flex flex-col gap-6 py-4 h-full">
      <div className="flex flex-col gap-3">
        <label className="text-[10px] font-black uppercase text-accent tracking-widest">
          Terminal de Operações OPA
        </label>
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Cole o código OPA aqui para execução..."
          className="h-[250px] font-mono text-sm border-accent/30 focus:border-accent"
        />
        <Button 
          variant="large" 
          onClick={handleExecute} 
          disabled={isExecuting || !code.trim()}
          className="bg-accent/10 border-accent text-accent hover:bg-accent/20"
        >
          {isExecuting ? 'PROCESSANDO PROTOCOLO...' : 'EXECUTAR PROTOCOLO'}
        </Button>
      </div>

      <div className="flex flex-col gap-3 flex-grow">
        <div className="flex justify-between items-center">
          <label className="text-[10px] font-black uppercase text-glow/60 tracking-widest flex items-center gap-2">
            <Terminal className="w-3 h-3" /> Console de Saída
          </label>
          <button onClick={() => setOutput("")} className="text-[10px] text-accent hover:text-glow transition-colors font-bold uppercase tracking-widest">
            Limpar Console
          </button>
        </div>
        
        <div className="bg-black/40 border border-border p-6 rounded-xl flex-grow font-mono text-sm relative overflow-hidden min-h-[150px]">
          <AnimatePresence>
            {isExecuting && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 flex items-center justify-center z-10 backdrop-blur-sm"
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 border-4 border-glow/20 border-t-glow rounded-full animate-spin" />
                  <span className="text-[10px] text-glow font-black animate-pulse uppercase tracking-[2px]">Decriptando Buffer...</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {output ? (
            <motion.pre 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-glow whitespace-pre-wrap"
            >
              {`> RESULTADO ENCONTRADO:\n\n${output}`}
            </motion.pre>
          ) : (
            <span className="text-accent/30 italic">Aguardando execução de protocolo...</span>
          )}

          {/* Scanline effect for console */}
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-glow/[0.02] to-transparent h-2 animate-[vpulse_2s_infinite]" />
        </div>
      </div>
    </div>
  );
}
