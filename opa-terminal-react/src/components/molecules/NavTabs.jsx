import { NavLink } from "react-router-dom";
import { twMerge } from "tailwind-merge";

export function NavTabs({ tabs }) {
  return (
    <div className="flex w-full pb-3 mb-6 border-b border-white/5 gap-1 md:gap-2">
      {tabs.map((tab) => (
        <NavLink
          key={tab.id}
          to={tab.path}
          className={({ isActive }) => twMerge(
            "flex-1 px-1 md:px-4 py-2 text-[10px] md:text-xs font-black uppercase tracking-wider transition-all rounded hover:bg-white/5 text-white/40 border-b-2 border-transparent text-center",
            isActive && "text-glow bg-glow/5 border-b-glow shadow-[0_4px_10px_-4px_var(--color-glow)]"
          )}
        >
          {tab.label}
        </NavLink>
      ))}
    </div>
  );
}
