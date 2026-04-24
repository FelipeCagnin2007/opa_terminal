import { twMerge } from "tailwind-merge";

export function ProgressBar({ value, max = 100, variant = "default", label, className }) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  
  const colors = {
    default: "bg-glow",
    energy: "bg-orange-500",
    mood: "bg-cyber-pink",
    stability: "bg-cyber-blue",
    agility: "bg-glow",
    danger: "bg-danger"
  };

  return (
    <div className={twMerge("flex flex-col gap-2 w-full", className)}>
      {label && (
        <div className="flex justify-between items-center px-1">
          <span className="text-[8px] uppercase font-black text-white/30 tracking-[0.3em]">
            {label}
          </span>
          <span className="text-[9px] font-mono font-bold text-white/60">{Math.floor(percentage)}%</span>
        </div>
      )}
      <div className="w-full h-1.5 bg-white/[0.03] border border-white/5 rounded-full overflow-hidden relative">
        <div 
          className={twMerge("h-full transition-all duration-1000 cubic-bezier(0.4, 0, 0.2, 1) relative z-10", colors[variant] || colors.default)}
          style={{ width: `${percentage}%` }}
        >
          {/* Shine effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] animate-[shimmer_2s_infinite]" />
        </div>
      </div>
    </div>
  );
}
