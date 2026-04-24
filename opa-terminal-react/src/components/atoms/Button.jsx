import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function Button({ className, variant = "default", ...props }) {
  const variants = {
    default: "btn-premium-outline",
    glow: "btn-premium",
    danger: "border border-danger/20 text-danger bg-danger/5 hover:bg-danger/10 hover:border-danger/30 rounded-xl px-8 py-3.5 font-black uppercase tracking-widest text-[10px]",
    accent: "border border-cyber-blue/20 text-cyber-blue bg-cyber-blue/5 hover:bg-cyber-blue/10 hover:border-cyber-blue/30 rounded-xl px-8 py-3.5 font-black uppercase tracking-widest text-[10px]",
  };

  return (
    <button
      className={twMerge(
        "cursor-pointer font-terminal transition-all duration-300 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30",
        variants[variant] || variants.default,
        className
      )}
      {...props}
    />
  );
}
