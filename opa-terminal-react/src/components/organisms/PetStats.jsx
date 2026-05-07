import { ProgressBar } from '../atoms/ProgressBar';
import { Coins } from 'lucide-react';

export function PetStats({ pet, onClaimCoins }) {
  const nextClaim = (pet.lastCoinClaim || 0) + (24 * 60 * 60 * 1000);
  const now = Date.now();
  const isClaimAvailable = now >= nextClaim;

  return (
    <div className="flex flex-col gap-6 md:gap-8 bg-surface-100/40 backdrop-blur-md p-6 md:p-8 border border-border rounded-[1.5rem] md:rounded-[2.5rem] shadow-main relative overflow-hidden">
      <div className="noise-bg absolute inset-0 opacity-5 pointer-events-none" />
      
      {/* Header Info */}
      <div className="flex justify-between items-end relative z-10">
        <div className="flex flex-col gap-1">
          <span className="text-[7px] md:text-[8px] text-text-muted uppercase tracking-[0.2em] md:tracking-[0.4em] font-black">Registro_de_Identidade</span>
          <h2 className="text-lg md:text-xl text-text-main font-black tracking-[0.1em] md:tracking-[0.2em] uppercase truncate max-w-[150px] md:max-w-none">{pet.name || "ENTIDADE_SEM_NOME"}</h2>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-[7px] md:text-[8px] text-text-muted uppercase tracking-[0.2em] md:tracking-[0.4em] font-black">Buffer_de_Moedas</span>
          <div className="flex items-center gap-2 px-3 md:px-4 py-1 md:py-1.5 bg-primary/10 border border-primary/20 rounded-lg md:rounded-xl">
            <Coins className="w-3 h-3 md:w-3.5 md:h-3.5 text-primary" />
            <span className="text-xs md:text-sm font-mono font-black text-primary tracking-tighter">{(pet.coins || 0).toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="h-px bg-gradient-to-r from-border via-border/5 to-transparent relative z-10" />

      {/* Vital Bars */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 md:gap-x-10 gap-y-4 md:gap-y-6 relative z-10">
        <ProgressBar 
          label="Energia_Neural" 
          value={pet.energy} 
          variant="energy" 
        />
        <ProgressBar 
          label="Sincronia_Emocional" 
          value={pet.mood} 
          variant="mood" 
        />
        <ProgressBar 
          label="Buffer_de_Memória" 
          value={pet.stability} 
          variant="stability" 
        />
        <ProgressBar 
          label="Relógio_de_Reação" 
          value={pet.agility} 
          variant="agility" 
        />
      </div>

      {/* Secondary Stats */}
      <div className="flex flex-wrap gap-x-6 gap-y-3 text-[8px] md:text-[9px] text-text-muted font-black uppercase tracking-[0.2em] md:tracking-[0.3em] pt-2 md:pt-4 relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-border" />
          <span>Estágio: <span className="text-text-main/60">{pet.stage}</span></span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-border" />
          <span>Ciclos: <span className="text-text-main/60">{Math.floor(pet.age / 10)}</span></span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-border" />
          <span>Logs_de_Comunicação: <span className="text-text-main/60">{pet.interactions || 0}</span></span>
        </div>
      </div>
    </div>
  );
}
