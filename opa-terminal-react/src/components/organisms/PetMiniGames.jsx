import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../atoms/Button';
import { codificar } from '../../utils/opaCore';
import { X, Zap, Activity, Terminal } from 'lucide-react';

// --- SHARED OVERLAY ---
const GameOverlay = ({ title, children, onClose, score, scoreLabel }) => (
  <motion.div 
    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    className="fixed inset-0 z-[100] bg-bg/98 flex flex-col items-center justify-center p-4 backdrop-blur-xl overflow-y-auto"
  >
    <div className="w-full max-w-2xl flex flex-col items-center gap-8">
      <div className="flex flex-col items-center gap-2">
        <h2 className="text-2xl font-black text-primary tracking-[4px]">{title}</h2>
        <div className="text-accent font-bold uppercase tracking-widest text-[10px]">
          {scoreLabel}: {score}
        </div>
      </div>

      <div className="w-full bg-surface-100/20 border-2 border-border/50 rounded-2xl p-6 min-h-[300px] flex items-center justify-center overflow-hidden relative">
        {children}
      </div>

      <div className="flex gap-4 w-full max-w-md">
        <Button variant="danger" onClick={onClose} className="flex-1">Encerrar Sessão</Button>
      </div>
    </div>
  </motion.div>
);

// --- 1. PROTOCOL OPTIMIZER (Whack-a-bit) ---
export function OptimizerGame({ onFinish }) {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [activeBit, setActiveBit] = useState(null);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          setIsActive(false);
          onFinish({ score });
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isActive, score, onFinish]);

  useEffect(() => {
    if (!isActive) return;
    const spawn = () => {
      setActiveBit(Math.floor(Math.random() * 9));
      setTimeout(spawn, Math.max(400, 800 - score * 20));
    };
    spawn();
  }, [isActive, score]);

  return (
    <GameOverlay title="OPTIMIZER.BIT" score={score} scoreLabel="Bits Otimizados" onClose={() => onFinish({ score: 0 })}>
       {!isActive ? (
         <Button variant="large" onClick={() => setIsActive(true)}>Começar Otimização</Button>
       ) : (
         <div className="flex flex-col items-center gap-8">
           <div className="grid grid-cols-3 gap-4">
             {[...Array(9)].map((_, i) => (
               <button
                 key={i}
                 onClick={() => {
                   if (i === activeBit) {
                     setScore(s => s + 1);
                     setTimeLeft(t => t + 0.5); 
                     setActiveBit(null);
                   }
                 }}
                 className={`w-16 h-16 md:w-20 md:h-20 border-2 transition-all flex items-center justify-center text-xl font-bold ${
                   activeBit === i 
                   ? 'bg-danger/20 border-danger text-white scale-110 shadow-pop' 
                   : 'bg-surface-200 border-border text-accent/20'
                 }`}
               >
                 {activeBit === i ? '!' : (Math.random() > 0.5 ? '0' : '1')}
               </button>
             ))}
           </div>
           <div className="text-primary font-mono uppercase tracking-widest text-sm">Tempo Restante: {timeLeft}s</div>
         </div>
       )}
    </GameOverlay>
  );
}

// --- 2. RUNNER.BIT (Dino Runner) ---
export function RunnerGame({ onFinish }) {
  const [score, setScore] = useState(0);
  const [isJumping, setIsJumping] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [obstacles, setObstacles] = useState([]);

  const handleJump = useCallback(() => {
    if (isJumping || !isActive) return;
    setIsJumping(true);
    setTimeout(() => setIsJumping(false), 600);
  }, [isJumping, isActive]);

  useEffect(() => {
    const handler = (e) => { if (e.code === 'Space') { e.preventDefault(); handleJump(); } };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleJump]);

  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => {
      setObstacles(obs => {
        const next = obs.map(o => ({ ...o, x: o.x - 5 })).filter(o => o.x > -10);
        
        const collision = next.find(o => o.x > 12 && o.x < 22 && !isJumping);
        if (collision) {
          setIsActive(false);
          onFinish({ score: Math.floor(score) });
          return [];
        }

        if (next.length === 0 || (next[next.length-1].x < 60 && Math.random() < 0.1)) {
          next.push({ x: 100, type: Math.random() > 0.5 ? '^' : '^^' });
        }
        
        setScore(s => s + 0.1);
        return next;
      });
    }, 50);
    return () => clearInterval(interval);
  }, [isActive, isJumping, onFinish, score]);

  return (
    <GameOverlay title="RUNNER.BIT" score={Math.floor(score)} scoreLabel="Distância" onClose={() => onFinish({ score: 0 })}>
      {!isActive ? (
        <Button variant="large" onClick={() => setIsActive(true)}>Iniciar Ciclo de Corrida</Button>
      ) : (
        <div className="w-full h-40 border-b-2 border-accent relative flex items-end overflow-hidden" onClick={handleJump}>
          <motion.div 
            animate={{ y: isJumping ? -60 : 0 }}
            className="absolute left-[15%] bottom-0 text-primary font-bold text-xl h-10 flex items-center"
          >
            (o)
          </motion.div>
          {obstacles.map((o, i) => (
            <div key={i} className="absolute bottom-0 text-danger font-black" style={{ left: `${o.x}%` }}>
              {o.type === '^' ? '▲' : '▲▲'}
            </div>
          ))}
        </div>
      )}
    </GameOverlay>
  );
}

// --- 3. FIXADOR.BIT (Astro Fixer) ---
export function FixadorGame({ onFinish }) {
  const [score, setScore] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [targetChar, setTargetChar] = useState("");

  const nextTask = useCallback(() => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const char = chars[Math.floor(Math.random() * chars.length)];
    setTargetChar(char);
  }, []);

  useEffect(() => {
    if (isActive && !targetChar) nextTask();
  }, [isActive, targetChar, nextTask]);

  const handleKey = (e) => {
    if (!isActive) return;
    const key = e.key.toUpperCase();
    if (key === targetChar) {
      setScore(s => s + 1);
      nextTask();
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isActive, targetChar]);

  return (
    <GameOverlay title="FIXADOR.BIT" score={score} scoreLabel="Reparos" onClose={() => onFinish({ score: 0 })}>
       {!isActive ? (
         <Button variant="large" onClick={() => setIsActive(true)}>Iniciar Manutenção</Button>
       ) : (
         <div className="flex flex-col items-center gap-12">
            <div className="flex flex-col items-center gap-4">
              <span className="text-[10px] text-accent uppercase tracking-widest font-bold">Reparar Segmento:</span>
              <motion.div 
                key={targetChar}
                initial={{ 
                  x: Math.random() * 100 - 50, 
                  y: -100,
                  scale: 0.5, 
                  rotate: -20, 
                  opacity: 0 
                }}
                animate={{ x: 0, y: 0, scale: 1, rotate: 0, opacity: 1 }}
                className="text-6xl font-black text-danger border-4 border-danger/20 p-8 rounded-full shadow-pop"
              >
                {codificar(targetChar.toLowerCase())}
              </motion.div>
            </div>
            <div className="text-primary animate-pulse font-bold text-[10px] uppercase tracking-widest">Pressione a Letra Correspondente</div>
         </div>
       )}
    </GameOverlay>
  );
}
