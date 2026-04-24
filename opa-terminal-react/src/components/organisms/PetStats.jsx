import { ProgressBar } from '../atoms/ProgressBar';
import { Coins } from 'lucide-react';

export function PetStats({ pet, onClaimCoins }) {
  const nextClaim = (pet.lastCoinClaim || 0) + (24 * 60 * 60 * 1000);
  const now = Date.now();
  const isClaimAvailable = now >= nextClaim;

  return (
    <div className="flex flex-col gap-8 bg-surface/40 backdrop-blur-md p-8 border border-white/5 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
      <div className="noise-bg absolute inset-0 opacity-5 pointer-events-none" />
      
      {/* Header Info */}
      <div className="flex justify-between items-end relative z-10">
        <div className="flex flex-col gap-1">
          <span className="text-[8px] text-white/20 uppercase tracking-[0.4em] font-black">Identity_Registry</span>
          <h2 className="text-xl text-white font-black tracking-[0.2em] uppercase">{pet.name || "UNNAMED_ENTITY"}</h2>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-[8px] text-white/20 uppercase tracking-[0.4em] font-black">Currency_Buffer</span>
          <div className="flex items-center gap-2 px-4 py-1.5 bg-glow/10 border border-glow/20 rounded-xl">
            <Coins className="w-3.5 h-3.5 text-glow" />
            <span className="text-sm font-mono font-black text-glow tracking-tighter">{(pet.coins || 0).toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="h-px bg-gradient-to-r from-white/10 via-white/5 to-transparent relative z-10" />

      {/* Vital Bars */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-10 gap-y-6 relative z-10">
        <ProgressBar 
          label="Neural_Energy" 
          value={pet.energy} 
          variant="energy" 
        />
        <ProgressBar 
          label="Emotional_Sync" 
          value={pet.mood} 
          variant="mood" 
        />
        <ProgressBar 
          label="Memory_Buffer" 
          value={pet.stability} 
          variant="stability" 
        />
        <ProgressBar 
          label="Reaction_Clock" 
          value={pet.agility} 
          variant="agility" 
        />
      </div>

      {/* Secondary Stats */}
      <div className="flex flex-wrap gap-8 text-[9px] text-white/20 font-black uppercase tracking-[0.3em] pt-4 relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
          <span>Stage: <span className="text-white/60">{pet.stage}</span></span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
          <span>Cycles: <span className="text-white/60">{Math.floor(pet.age / 10)}</span></span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
          <span>Comm_Logs: <span className="text-white/60">{pet.interactions || 0}</span></span>
        </div>
      </div>
    </div>
  );
}
