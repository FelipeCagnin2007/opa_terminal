import { twMerge } from "tailwind-merge";

export function ProgressBar({ value, max = 100, variant = "default", label, className }) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  
  const colors = {
    default: "bg-glow",
    energy: "bg-energy",
    mood: "bg-mood",
    stability: "bg-stability",
    danger: "bg-danger"
  };

  return (
    <div className={twMerge("flex flex-col gap-1.5 w-full", className)}>
      {label && (
        <span className="text-[10px] uppercase font-bold text-accent/80 tracking-widest">
          {label}
        </span>
      )}
      <div className="w-full h-2.5 bg-black/40 border border-border rounded-full overflow-hidden shadow-inner">
        <div 
          className={twMerge("h-full transition-all duration-500 ease-out shadow-[0_0_10px_rgba(0,0,0,0.5)]", colors[variant])}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
