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
        className="flex flex-col gap-2 items-center py-6 rounded-2xl bg-white/[0.02] border-white/5 hover:bg-white/[0.05] transition-all duration-500"
      >
        <Pizza className="w-5 h-5 text-cyber-blue/50" />
        <span className="text-[9px] font-black uppercase tracking-widest">FEED_ENTITY</span>
      </Button>
      
      <Button 
        variant="accent" 
        onClick={() => onAction('play')}
        disabled={isSleeping}
        className="flex flex-col gap-2 items-center py-6 rounded-2xl bg-white/[0.02] border-white/5 hover:bg-white/[0.05] transition-all duration-500"
      >
        <Gamepad2 className="w-5 h-5 text-cyber-blue/50" />
        <span className="text-[9px] font-black uppercase tracking-widest">OPTIMIZE_OPS</span>
      </Button>

      <Button 
        variant="accent" 
        onClick={() => onAction('patch')}
        disabled={isSleeping}
        className="flex flex-col gap-2 items-center py-6 rounded-2xl bg-white/[0.02] border-white/5 hover:bg-white/[0.05] transition-all duration-500"
      >
        <Wrench className="w-5 h-5 text-cyber-blue/50" />
        <span className="text-[9px] font-black uppercase tracking-widest">PATCH_CORE</span>
      </Button>

      <Button 
        variant="accent" 
        onClick={() => onAction('dino')}
        disabled={isSleeping || isEgg}
        className="flex flex-col gap-2 items-center py-6 rounded-2xl bg-white/[0.02] border-white/5 hover:bg-white/[0.05] transition-all duration-500"
      >
        <Zap className="w-5 h-5 text-cyber-blue/50" />
        <span className="text-[9px] font-black uppercase tracking-widest">RUN_SYNC</span>
      </Button>

      <Button 
        variant={isSleeping ? "glow" : "accent"} 
        onClick={() => onAction('sleep')}
        className="flex flex-col gap-2 items-center py-6 rounded-2xl col-span-2 md:col-span-1 border-white/5 transition-all duration-500"
      >
        <Moon className={`w-5 h-5 ${isSleeping ? 'text-bg' : 'text-white/20'}`} />
        <span className="text-[9px] font-black uppercase tracking-widest">{isSleeping ? "AWAKEN_ID" : "SLEEP_MODE"}</span>
      </Button>
    </div>
  );
}
