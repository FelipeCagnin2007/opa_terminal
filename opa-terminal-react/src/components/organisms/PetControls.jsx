import { Button } from '../atoms/Button';
import { Pizza, Gamepad2, Wrench, Moon, Zap } from 'lucide-react';

export function PetControls({ pet, onAction }) {
  const isSleeping = pet.isSleeping;
  const isEgg = pet.stage === 'EGG';

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      <Button 
        variant="accent" 
        onClick={() => onAction('feed')}
        disabled={isSleeping || isEgg}
        className="flex flex-col gap-1 items-center py-4"
      >
        <Pizza className="w-4 h-4" />
        <span className="text-[9px]">Alimentar</span>
      </Button>
      
      <Button 
        variant="accent" 
        onClick={() => onAction('play')}
        disabled={isSleeping}
        className="flex flex-col gap-1 items-center py-4"
      >
        <Gamepad2 className="w-4 h-4" />
        <span className="text-[9px]">Otimizar</span>
      </Button>

      <Button 
        variant="accent" 
        onClick={() => onAction('patch')}
        disabled={isSleeping}
        className="flex flex-col gap-1 items-center py-4"
      >
        <Wrench className="w-4 h-4" />
        <span className="text-[9px]">Fixar</span>
      </Button>

      <Button 
        variant="accent" 
        onClick={() => onAction('dino')}
        disabled={isSleeping || isEgg}
        className="flex flex-col gap-1 items-center py-4"
      >
        <Zap className="w-4 h-4" />
        <span className="text-[9px]">Runner</span>
      </Button>

      <Button 
        variant={isSleeping ? "glow" : "accent"} 
        onClick={() => onAction('sleep')}
        className="flex flex-col gap-1 items-center py-4 col-span-2 md:col-span-1"
      >
        <Moon className="w-4 h-4" />
        <span className="text-[9px]">{isSleeping ? "Despertar" : "Modo Sleep"}</span>
      </Button>
    </div>
  );
}
