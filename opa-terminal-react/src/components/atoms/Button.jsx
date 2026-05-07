import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function Button({ className, variant = "default", ...props }) {
  const variants = {
    default: "btn-premium-outline",
    primary: "btn-premium",
    glow: "btn-premium", // legacy support
    danger: "border border-danger/20 text-danger bg-danger/5 hover:bg-danger/10 hover:border-danger/30 rounded-xl px-4 py-2 sm:px-6 sm:py-3 min-h-[44px] font-bold text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-danger focus:ring-offset-2 focus:ring-offset-bg",
    accent: "border border-accent/20 text-accent bg-accent/5 hover:bg-accent/10 hover:border-accent/30 rounded-xl px-4 py-2 sm:px-6 sm:py-3 min-h-[44px] font-bold text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg",
  };

  return (
    <button
      className={twMerge(
        "inline-flex items-center justify-center cursor-pointer font-terminal transition-all duration-300 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant] || variants.default,
        className
      )}
      {...props}
    />
  );
}
