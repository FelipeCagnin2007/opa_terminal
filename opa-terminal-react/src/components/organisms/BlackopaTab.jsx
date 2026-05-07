import { useBlackopa } from '../../hooks/useBlackopa';
import { usePet } from '../../context/PetContext';
import { Button } from '../atoms/Button';
import { motion, AnimatePresence } from 'framer-motion';

const CardUI = ({ card, hidden }) => (
  <motion.div 
    initial={{ opacity: 0, y: -20, rotateY: 90 }}
    animate={{ opacity: 1, y: 0, rotateY: 0 }}
    transition={{ duration: 0.5, type: 'spring' }}
    className={`w-12 h-20 md:w-20 md:h-32 rounded-lg md:rounded-xl flex flex-col items-center justify-center font-black text-lg md:text-2xl shadow-main transition-all duration-300 relative overflow-hidden ${
      hidden 
        ? 'bg-surface-100 border border-border text-transparent' 
        : 'bg-white border-2 border-primary/20 text-black'
    }`}
    style={{ color: !hidden && (card.suit === '♥' || card.suit === '♦') ? 'var(--color-danger)' : undefined }}
  >
    {hidden ? (
      <>
        <div className="absolute inset-0 bg-surface-300/20 opacity-20" />
        <span className="text-text-muted/20 text-4xl">?</span>
      </>
    ) : (
      <>
        <span className="z-10">{card.val}</span>
        <span className="text-xl z-10">{card.suit}</span>
      </>
    )}
  </motion.div>
);

export function BlackopaTab() {
  const { pet, updatePet } = usePet();
  const {
    playerHand, dealerHand, isActive, status, showDealer,
    bet, setBet, startDeal, hit, stand, calculateScore
  } = useBlackopa(pet, updatePet);

  return (
    <div className="flex flex-col gap-6 md:gap-10 h-full relative">
      <div className="noise-bg absolute inset-0 opacity-5 pointer-events-none" />

      {/* Header Info */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 md:gap-6 bg-surface-100/40 backdrop-blur-md p-4 md:p-6 border border-border rounded-2xl md:rounded-3xl shadow-main z-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
          <div className="w-32 h-32 border-4 border-primary rounded-full" />
        </div>
        
        <div className="flex flex-col text-center sm:text-left relative z-10">
          <h3 className="text-sm md:text-xl font-black text-primary tracking-[0.2em] md:tracking-[0.3em] uppercase mb-1">BLACKOPA_PROTOCOLO_v21</h3>
          <span className="text-[9px] md:text-[10px] text-text-muted uppercase tracking-[0.2em] md:tracking-[0.4em] font-bold">Saldo_Terminal: <span className="text-primary">{Math.floor(pet.coins)} OPACOINS</span></span>
        </div>
        
        <div className="flex items-center gap-4 relative z-10 bg-surface-200/50 p-2 rounded-2xl border border-border">
          <label className="text-[9px] text-text-muted font-black uppercase tracking-[0.3em] ml-2">APOSTA:</label>
          <input 
            type="number" 
            value={bet} 
            onChange={(e) => setBet(Math.max(10, parseInt(e.target.value) || 0))}
            disabled={isActive}
            className="w-24 text-center py-2 bg-surface-100/80 border border-border text-primary font-mono font-black rounded-xl text-sm focus:border-primary/40 transition-colors"
          />
          <span className="text-[10px] font-black text-text-main animate-pulse">SISTEMA_ESTÁVEL</span>
        </div>
      </div>

      <div className="flex-grow flex flex-col justify-between gap-8 py-4 items-center z-10">
        
        {/* Dealer Zone */}
        <div className="flex flex-col items-center gap-3 md:gap-4 w-full">
          <div className="flex items-center gap-3 md:gap-4 border-b border-danger/30 pb-2 px-6 md:px-8">
            <span className="w-1.5 h-1.5 md:w-2 md:h-2 bg-danger rounded-full animate-pulse" />
            <label className="text-[8px] md:text-[10px] text-text-muted uppercase font-black tracking-[0.3em] md:tracking-[0.5em]">DEALER_SISTEMA</label>
            <span className="text-[10px] md:text-xs font-mono font-black text-danger bg-danger/10 px-2 py-0.5 rounded ml-2">{showDealer ? calculateScore(dealerHand) : '??'}</span>
          </div>
          <div className="flex flex-wrap justify-center gap-3 min-h-[100px] md:min-h-[140px] items-center perspective-1000">
            {dealerHand.map((card, idx) => (
              <CardUI key={idx} card={card} hidden={idx === 1 && !showDealer} />
            ))}
          </div>
        </div>

        <motion.div 
          key={status}
          initial={{ scale: 0.9, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          className="text-primary font-black tracking-[0.3em] md:tracking-[0.5em] text-center uppercase text-xs md:text-xl border-y border-primary/20 py-4 md:py-6 w-full bg-primary/5 backdrop-blur-sm"
        >
          {status || 'AGUARDANDO_INICIALIZAÇÃO'}
        </motion.div>

        {/* Player Zone */}
        <div className="flex flex-col items-center gap-4 w-full">
          <div className="flex flex-wrap justify-center gap-3 min-h-[100px] md:min-h-[140px] items-center perspective-1000">
            {playerHand.map((card, idx) => (
              <CardUI key={idx} card={card} />
            ))}
          </div>
          <div className="flex items-center gap-3 md:gap-4 border-t border-accent/30 pt-2 px-6 md:px-8">
            <span className="w-1.5 h-1.5 md:w-2 md:h-2 bg-accent rounded-full animate-pulse" />
            <label className="text-[8px] md:text-[10px] text-text-muted uppercase font-black tracking-[0.3em] md:tracking-[0.5em]">PROTOCOLO_LOCAL</label>
            <span className="text-[10px] md:text-xs font-mono font-black text-accent bg-accent/10 px-2 py-0.5 rounded ml-2">{calculateScore(playerHand)}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-center gap-4 z-10 w-full mt-auto">
        {!isActive ? (
          <Button onClick={startDeal} variant="primary" className="w-full max-w-lg py-5 text-sm">INICIAR_PARTIDA</Button>
        ) : (
          <div className="flex gap-4 w-full md:max-w-2xl">
            <Button onClick={hit} variant="accent" className="flex-1 py-5">PEDIR_CARTA (HIT)</Button>
            <Button onClick={stand} variant="danger" className="flex-1 py-5">PARAR (STAND)</Button>
          </div>
        )}
      </div>
    </div>
  );
}
