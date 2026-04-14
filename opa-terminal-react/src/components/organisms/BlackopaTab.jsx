import { useBlackopa } from '../../hooks/useBlackopa';
import { usePet } from '../../context/PetContext';
import { Button } from '../atoms/Button';
import { motion, AnimatePresence } from 'framer-motion';

const CardUI = ({ card, hidden }) => (
  <motion.div 
    initial={{ opacity: 0, y: -20 }}
    animate={{ opacity: 1, y: 0 }}
    className={`w-14 h-20 md:w-16 md:h-24 rounded-lg border-2 flex flex-col items-center justify-center font-bold text-lg shadow-lg ${
      hidden ? 'bg-border/40 border-accent/20 text-transparent' : 'bg-surface border-glow text-glow'
    }`}
    style={{ color: !hidden && (card.suit === '♥' || card.suit === '♦') ? 'var(--color-danger)' : undefined }}
  >
    {hidden ? '?' : (
      <>
        <span>{card.val}</span>
        <span className="text-sm">{card.suit}</span>
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
    <div className="flex flex-col gap-4 md:gap-8 py-4 h-full">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-surface/30 p-4 border border-border rounded-xl">
        <div className="flex flex-col text-center sm:text-left">
          <h3 className="text-xs md:text-sm font-black text-glow">BLACKOPA PROTOCOL v21</h3>
          <span className="text-[9px] md:text-[10px] text-accent uppercase tracking-widest">Saldo: ⟡ {Math.floor(pet.coins)} OPACOINS</span>
        </div>
        
        <div className="flex items-center gap-3">
          <label className="text-[10px] text-accent font-bold uppercase tracking-[1px]">Aposta:</label>
          <input 
            type="number" 
            value={bet} 
            onChange={(e) => setBet(Math.max(10, parseInt(e.target.value) || 0))}
            disabled={isActive}
            className="w-16 md:w-20 text-center py-1 bg-black border-glow/30 text-glow font-bold rounded text-xs"
          />
        </div>
      </div>

      <div className="flex-grow flex flex-col justify-around gap-6 py-4 items-center overflow-hidden">
        {/* Dealer Zone */}
        <div className="flex flex-col items-center gap-2 w-full">
          <label className="text-[10px] text-accent uppercase font-black tracking-widest leading-none">Dealer: {showDealer ? calculateScore(dealerHand) : '?'}</label>
          <div className="flex flex-wrap justify-center gap-1 md:gap-2 min-h-[80px] md:min-h-[100px] items-center">
            {dealerHand.map((card, idx) => (
              <CardUI key={idx} card={card} hidden={idx === 1 && !showDealer} />
            ))}
          </div>
        </div>

        {/* Status Message */}
        <motion.div 
          key={status}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-energy font-black tracking-[4px] text-center uppercase text-sm md:text-base border-y border-energy/20 py-4 w-full"
        >
          {status}
        </motion.div>

        {/* Player Zone */}
        <div className="flex flex-col items-center gap-2 w-full">
          <div className="flex flex-wrap justify-center gap-1 md:gap-2 min-h-[80px] md:min-h-[100px] items-center">
            {playerHand.map((card, idx) => (
              <CardUI key={idx} card={card} />
            ))}
          </div>
          <label className="text-[10px] text-glow uppercase font-black tracking-widest leading-none">Vossa Mão: {calculateScore(playerHand)}</label>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-center gap-4 border-t border-border pt-6">
        {!isActive ? (
          <Button variant="large" onClick={startDeal} className="w-full max-w-lg">Iniciar Protocolo (Deal)</Button>
        ) : (
          <div className="flex gap-4 w-full md:max-w-2xl">
            <Button onClick={hit} className="flex-1 py-4">Hit (Pedir)</Button>
            <Button variant="danger" onClick={stand} className="flex-1 py-4">Stand (Parar)</Button>
          </div>
        )}
      </div>
    </div>
  );
}
