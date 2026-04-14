import { CONSTANTS, codificar } from '../../utils/opaCore';
import { motion } from 'framer-motion';
import { Book, Code, Zap, Hash, Type, Terminal } from 'lucide-react';

export function ReferenceTab() {
  const sections = [
    { title: 'Alfabeto Base (Minúsculas)', icon: <Type className="w-4 h-4" />, items: CONSTANTS.ALF_LOWER.split('').map(l => [l, l]) },
    { title: 'Alfabeto Base (Maiúsculas)', icon: <Type className="w-4 h-4" />, items: CONSTANTS.ALF_LOWER.split('').map(l => [l.toUpperCase(), l.toUpperCase()]) },
    { title: 'Numerais (Modo FSM)', icon: <Hash className="w-4 h-4" />, items: "0123456789".split('').map(n => [n, n]) },
    { title: 'Símbolos Code', icon: <Code className="w-4 h-4" />, items: CONSTANTS.ALF_SIMB.split('').map(s => [s === '\t' ? 'TAB' : s, s]) },
    { title: 'Acentuação & Especiais', icon: <Zap className="w-4 h-4" />, items: Object.keys(CONSTANTS.mapaAcentos).map(a => [a, a]) },
    { title: 'Tokens de Controle', icon: <Terminal className="w-4 h-4" />, items: [['Toggle Num', 'opa'], ['Espaço', ' '], ['Quebra Linha', '\n']] }
  ];

  return (
    <div className="flex flex-col gap-10 py-4 max-h-[70vh] overflow-y-auto pr-6 custom-scrollbar">
      {sections.map((section, sIdx) => (
        <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: sIdx * 0.1 }}
            key={sIdx} 
            className="flex flex-col gap-5"
        >
          <div className="flex items-center gap-4 group">
            <div className="p-2 rounded-lg bg-white/5 border border-white/10 text-white/40 group-hover:text-glow group-hover:border-glow/20 transition-all">
                {section.icon}
            </div>
            <h3 className="text-[10px] font-black uppercase text-white/60 tracking-[0.3em] whitespace-nowrap">
                {section.title}
            </h3>
            <div className="h-[1px] bg-white/5 w-full" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
            {section.items.map(([label, value], iIdx) => (
              <motion.div 
                whileHover={{ scale: 1.05, y: -2 }}
                key={iIdx} 
                className="bg-surface/40 border-2 border-white/5 p-4 rounded-2xl flex flex-col gap-2 hover:border-glow/40 transition-all group cursor-default shadow-lg"
              >
                <span className="text-white/40 text-[9px] font-black uppercase tracking-widest">{label}</span>
                <span className="text-glow text-lg font-mono break-all leading-none">
                  {codificar(value)}
                </span>
                <div className="w-4 h-0.5 bg-white/5 group-hover:bg-glow/40 transition-colors" />
              </motion.div>
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
