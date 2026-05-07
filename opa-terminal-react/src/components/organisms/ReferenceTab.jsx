import { CONSTANTS, codificar } from '../../utils/opaCore';
import { motion } from 'framer-motion';
import { Book, Code, Zap, Hash, Type, Terminal } from 'lucide-react';

export function ReferenceTab() {
  const sections = [
    { title: 'Alfabeto Base (Minúsculas)', icon: <Type className="w-4 h-4" />, items: CONSTANTS.ALF_LOWER.split('').map(l => [l, l]) },
    { title: 'Alfabeto Base (Maiúsculas)', icon: <Type className="w-4 h-4" />, items: CONSTANTS.ALF_LOWER.split('').map(l => [l.toUpperCase(), l.toUpperCase()]) },
    { title: 'Numerais (Modo FSM)', icon: <Hash className="w-4 h-4" />, items: "0123456789".split('').map(n => [n, n]) },
    { title: 'Símbolos de Código', icon: <Code className="w-4 h-4" />, items: CONSTANTS.ALF_SIMB.split('').map(s => [s === '\t' ? 'TAB' : s, s]) },
    { title: 'Acentuação & Especiais', icon: <Zap className="w-4 h-4" />, items: Object.keys(CONSTANTS.mapaAcentos).map(a => [a, a]) },
    { title: 'Tokens de Controle', icon: <Terminal className="w-4 h-4" />, items: [['Alternar Num', 'opa'], ['Espaço', ' '], ['Quebra de Linha', '\n']] }
  ];

  return (
    <div className="flex flex-col gap-8 md:gap-16 py-4 md:py-8 h-full text-text-main overflow-x-hidden">
      {sections.map((section, sIdx) => (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: sIdx * 0.1, duration: 0.5 }}
            key={sIdx} 
            className="flex flex-col gap-8"
        >
          <div className="flex items-center gap-4 md:gap-6 group">
            <div className="p-2 md:p-3 rounded-xl md:rounded-2xl bg-surface-200 border border-border text-text-muted group-hover:text-primary group-hover:border-primary/20 group-hover:bg-primary/5 transition-all duration-500">
                {section.icon}
            </div>
            <h3 className="text-[10px] md:text-xs font-black uppercase text-text-muted tracking-[0.2em] md:tracking-[0.5em] truncate">
                {section.title}
            </h3>
            <div className="h-px bg-border flex-grow" />
          </div>

          <div className="grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-4">
            {section.items.map(([label, value], iIdx) => (
              <motion.div 
                whileHover={{ y: -5 }}
                key={iIdx} 
                className="bg-surface-100 border border-border p-4 rounded-2xl flex flex-col items-center justify-center gap-3 hover:border-primary/50 hover:bg-surface-200 transition-all duration-300 group cursor-default shadow-sm relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-b from-surface-300/20 to-transparent pointer-events-none" />
                <span className="text-text-muted text-[9px] font-black uppercase tracking-[0.2em] text-center w-full truncate relative z-10" title={label}>{label}</span>
                <span className="text-primary text-lg md:text-xl font-mono font-bold break-all text-center leading-tight relative z-10 w-full px-1">
                  {codificar(value)}
                </span>
                <div className="w-8 h-[2px] bg-border group-hover:bg-primary transition-colors rounded-full" />
              </motion.div>
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
