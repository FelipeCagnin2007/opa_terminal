import { Button } from '../atoms/Button';
import { Pizza, Gamepad2, Wrench, Moon, Zap } from 'lucide-react';

export function PetControls({ pet, onAction }) {
  const isSleeping = pet.isSleeping;
  const isEgg = pet.stage === 'EGG';

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      <Button 
        variant="accent" 
        onClick={() => onAction('feed')}
        disabled={isSleeping || isEgg}
        className="flex flex-col gap-2 items-center py-6 rounded-2xl bg-surface-200/50 border-border hover:bg-surface-300 transition-all duration-500"
      >
        <Pizza className="w-5 h-5 text-accent/50" />
        <span className="text-[9px] font-black uppercase tracking-widest">ALIMENTAR_ENTIDADE</span>
      </Button>
      
      <Button 
        variant="accent" 
        onClick={() => onAction('play')}
        disabled={isSleeping}
        className="flex flex-col gap-2 items-center py-6 rounded-2xl bg-surface-200/50 border-border hover:bg-surface-300 transition-all duration-500"
      >
        <Gamepad2 className="w-5 h-5 text-accent/50" />
        <span className="text-[9px] font-black uppercase tracking-widest">OTIMIZAR_OPS</span>
      </Button>

      <Button 
        variant="accent" 
        onClick={() => onAction('patch')}
        disabled={isSleeping}
        className="flex flex-col gap-2 items-center py-6 rounded-2xl bg-surface-200/50 border-border hover:bg-surface-300 transition-all duration-500"
      >
        <Wrench className="w-5 h-5 text-accent/50" />
        <span className="text-[9px] font-black uppercase tracking-widest">APLICAR_PATCH</span>
      </Button>

      <Button 
        variant="accent" 
        onClick={() => onAction('dino')}
        disabled={isSleeping || isEgg}
        className="flex flex-col gap-2 items-center py-6 rounded-2xl bg-surface-200/50 border-border hover:bg-surface-300 transition-all duration-500"
      >
        <Zap className="w-5 h-5 text-accent/50" />
        <span className="text-[9px] font-black uppercase tracking-widest">EXECUTAR_SINCRONIA</span>
      </Button>

      <Button 
        variant={isSleeping ? "primary" : "accent"} 
        onClick={() => onAction('sleep')}
        className="flex flex-col gap-2 items-center py-6 rounded-2xl col-span-2 md:col-span-1 border-border transition-all duration-500"
      >
        <Moon className={`w-5 h-5 ${isSleeping ? 'text-text-inverse' : 'text-text-muted/40'}`} />
        <span className="text-[9px] font-black uppercase tracking-widest">{isSleeping ? "DESPERTAR_ID" : "MODO_SONO"}</span>
      </Button>
    </div>
  );
}
