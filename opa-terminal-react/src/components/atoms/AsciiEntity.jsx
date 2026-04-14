import { motion } from "framer-motion";

export function AsciiEntity({ content, isSleeping = false, className }) {
  return (
    <div className="relative flex flex-col items-center justify-center min-h-[160px]">
      <motion.pre
        key={content}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ 
          opacity: 1, 
          scale: 1,
          filter: ["drop-shadow(0 0 2px var(--color-glow))", "drop-shadow(0 0 8px var(--color-glow))", "drop-shadow(0 0 2px var(--color-glow))"]
        }}
        transition={{ 
          filter: { repeat: Infinity, duration: 2, ease: "easeInOut" },
          scale: { type: "spring", stiffness: 300 }
        }}
        className="text-glow text-lg md:text-xl font-mono leading-tight whitespace-pre text-center"
      >
        {content}
      </motion.pre>
      
      {isSleeping && (
        <motion.div
          initial={{ opacity: 0, y: 0 }}
          animate={{ opacity: [0, 1, 0], y: -20, x: [0, 5, -5] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute top-0 right-1/4 text-energy font-bold text-sm"
        >
          Zzz...
        </motion.div>
      )}

      {/* Subtle CRT flicker overlay just for the entity */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-glow/5 to-transparent h-4 animate-[vpulse_4s_infinite]" />
    </div>
  );
}
