import { ProgressBar } from '../atoms/ProgressBar';
import { Coins } from 'lucide-react';

export function PetStats({ pet, onClaimCoins }) {
  const nextClaim = (pet.lastCoinClaim || 0) + (24 * 60 * 60 * 1000);
  const now = Date.now();
  const isClaimAvailable = now >= nextClaim;

  return (
    <div className="flex flex-col gap-6 bg-surface/30 p-4 border border-border rounded-xl">
      {/* Header Info */}
      <div className="flex justify-between items-center border-b border-border/50 pb-3">
        <div className="flex flex-col">
          <span className="text-[10px] text-white/90 uppercase tracking-widest font-bold">Identificador</span>
          <span className="text-white/90 font-black tracking-widest">{pet.name || "ENTIDADE_ANONIMA"}</span>
        </div>
        <div className="flex items-center gap-2 text-white/90">
          <Coins className="w-4 h-4" />
          <span className="font-bold">{Math.floor(pet.coins || 0)}</span>
        </div>
      </div>

      {/* Vital Bars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ProgressBar 
          label="Energia de Dados" 
          value={pet.energy} 
          variant="energy" 
        />
        <ProgressBar 
          label="Eficiência de Humor" 
          value={pet.mood} 
          variant="mood" 
        />
        <ProgressBar 
          label="Integridade do Buffer" 
          value={pet.stability} 
          variant="stability" 
        />
        <ProgressBar 
          label="Agilidade de Sistema" 
          value={pet.agility} 
          variant="agility" 
        />
      </div>

      {/* Secondary Stats */}
      <div className="flex justify-between text-[10px] text-accent/60 font-mono uppercase tracking-widest pt-2 border-t border-border/30">
        <span>Estágio: <b className="text-glow">{pet.stage}</b></span>
        <span>Idade: <b className="text-glow">{Math.floor(pet.age / 10)}</b> ciclos</span>
        <span>Interações: <b className="text-glow">{pet.interactions || 0}</b></span>
      </div>
    </div>
  );
}
