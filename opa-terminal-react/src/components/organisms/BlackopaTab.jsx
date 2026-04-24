import { useBlackopa } from '../../hooks/useBlackopa';
import { usePet } from '../../context/PetContext';
import { Button } from '../atoms/Button';
import { motion, AnimatePresence } from 'framer-motion';

const CardUI = ({ card, hidden }) => (
  <motion.div 
    initial={{ opacity: 0, y: -20, rotateY: 90 }}
    animate={{ opacity: 1, y: 0, rotateY: 0 }}
    transition={{ duration: 0.5, type: 'spring' }}
    className={`w-16 h-24 md:w-20 md:h-32 rounded-xl flex flex-col items-center justify-center font-black text-2xl shadow-xl transition-all duration-300 relative overflow-hidden ${
      hidden 
        ? 'bg-surface border border-white/10 text-transparent' 
        : 'bg-white border-2 border-white text-bg'
    }`}
    style={{ color: !hidden && (card.suit === '♥' || card.suit === '♦') ? 'var(--color-danger)' : undefined }}
  >
    {hidden ? (
      <>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjMDAwIiBmaWxsLW9wYWNpdHk9IjAiPjwvcmVjdD4KPHBhdGggZD0iTTAgMEw4IDhaTTAgOEw4IDBaIiBzdHJva2U9IiMyMjIiIHN0cm9rZS13aWR0aD0iMSI+PC9wYXRoPgo8L3N2Zz4=')] opacity-20" />
        <span className="text-white/20 text-4xl">?</span>
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
      <div className="flex flex-col sm:flex-row justify-between items-center gap-6 bg-surface/40 backdrop-blur-md p-6 border border-white/5 rounded-3xl shadow-xl z-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
          <div className="w-32 h-32 border-4 border-glow rounded-full" />
        </div>
        
        <div className="flex flex-col text-center sm:text-left relative z-10">
          <h3 className="text-xl font-black text-glow tracking-[0.3em] uppercase mb-1">BLACKOPA_PROTOCOL_v21</h3>
          <span className="text-[10px] text-white/40 uppercase tracking-[0.4em] font-bold">Terminal_Balance: <span className="text-glow">{Math.floor(pet.coins)} OPACOINS</span></span>
        </div>
        
        <div className="flex items-center gap-4 relative z-10 bg-white/[0.02] p-2 rounded-2xl border border-white/5">
          <label className="text-[9px] text-white/60 font-black uppercase tracking-[0.3em] ml-2">WAGER:</label>
          <input 
            type="number" 
            value={bet} 
            onChange={(e) => setBet(Math.max(10, parseInt(e.target.value) || 0))}
            disabled={isActive}
            className="w-24 text-center py-2 bg-surface/80 border border-white/10 text-glow font-mono font-black rounded-xl text-sm focus:border-glow/40 transition-colors"
          />
        </div>
      </div>

      <div className="flex-grow flex flex-col justify-between gap-8 py-4 items-center z-10">
        
        {/* Dealer Zone */}
        <div className="flex flex-col items-center gap-4 w-full">
          <div className="flex items-center gap-4 border-b border-danger/30 pb-2 px-8">
            <span className="w-2 h-2 bg-danger rounded-full animate-pulse" />
            <label className="text-[10px] text-white/40 uppercase font-black tracking-[0.5em]">SYSTEM_DEALER</label>
            <span className="text-xs font-mono font-black text-danger bg-danger/10 px-2 py-0.5 rounded ml-2">{showDealer ? calculateScore(dealerHand) : '??'}</span>
          </div>
          <div className="flex flex-wrap justify-center gap-3 min-h-[100px] md:min-h-[140px] items-center perspective-1000">
            {dealerHand.map((card, idx) => (
              <CardUI key={idx} card={card} hidden={idx === 1 && !showDealer} />
            ))}
          </div>
        </div>

        {/* Status Message */}
        <motion.div 
          key={status}
          initial={{ scale: 0.9, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          className="text-glow font-black tracking-[0.5em] text-center uppercase text-sm md:text-xl border-y border-glow/20 py-6 w-full bg-glow/5 backdrop-blur-sm"
        >
          {status || 'AWAITING_INITIALIZATION'}
        </motion.div>

        {/* Player Zone */}
        <div className="flex flex-col items-center gap-4 w-full">
          <div className="flex flex-wrap justify-center gap-3 min-h-[100px] md:min-h-[140px] items-center perspective-1000">
            {playerHand.map((card, idx) => (
              <CardUI key={idx} card={card} />
            ))}
          </div>
          <div className="flex items-center gap-4 border-t border-cyber-blue/30 pt-2 px-8">
            <span className="w-2 h-2 bg-cyber-blue rounded-full animate-pulse" />
            <label className="text-[10px] text-white/40 uppercase font-black tracking-[0.5em]">LOCAL_PROTOCOL</label>
            <span className="text-xs font-mono font-black text-cyber-blue bg-cyber-blue/10 px-2 py-0.5 rounded ml-2">{calculateScore(playerHand)}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-center gap-4 z-10 w-full mt-auto">
        {!isActive ? (
          <button onClick={startDeal} className="btn-premium w-full max-w-lg py-5 text-sm">INITIATE_DEAL_SEQUENCE</button>
        ) : (
          <div className="flex gap-4 w-full md:max-w-2xl">
            <button onClick={hit} className="flex-1 bg-surface/60 border border-cyber-blue/30 text-cyber-blue hover:bg-cyber-blue/10 hover:border-cyber-blue px-8 py-5 rounded-2xl font-black uppercase tracking-[0.3em] transition-all duration-300">REQUEST_DATA (HIT)</button>
            <button onClick={stand} className="flex-1 bg-surface/60 border border-danger/30 text-danger hover:bg-danger/10 hover:border-danger px-8 py-5 rounded-2xl font-black uppercase tracking-[0.3em] transition-all duration-300">HALT_PROTOCOL (STAND)</button>
          </div>
        )}
      </div>
    </div>
  );
}
