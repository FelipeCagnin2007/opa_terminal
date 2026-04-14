import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function Button({ className, variant = "default", ...props }) {
  const variants = {
    default: "btn-premium-outline",
    glow: "btn-premium",
    danger: "border-2 border-danger text-danger hover:bg-danger/10",
    accent: "border-2 border-cyber-blue text-cyber-blue hover:bg-cyber-blue/10",
  };

  return (
    <button
      className={twMerge(
        "cursor-pointer font-terminal",
        variants[variant] || variants.default,
        className
      )}
      {...props}
    />
  );
}
