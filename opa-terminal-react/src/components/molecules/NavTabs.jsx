import { useRef } from 'react';
import { NavLink } from "react-router-dom";
import { twMerge } from "tailwind-merge";
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

export function NavTabs({ tabs }) {
  const scrollContainerRef = useRef(null);

  const scroll = (direction) => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === 'left' ? -200 : 200;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className="relative group flex items-center bg-surface-100/40 backdrop-blur-2xl rounded-[1.5rem] border border-border shadow-main p-1 overflow-hidden">
      {/* Esquerda */}
      <button 
        onClick={() => scroll('left')}
        className="z-20 p-2.5 bg-surface-200/90 text-text-main rounded-xl border border-border opacity-0 group-hover:opacity-100 transition-all focus:outline-none hover:bg-primary hover:text-text-inverse shadow-pop"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      
      <div 
        ref={scrollContainerRef}
        className="flex flex-grow overflow-x-auto flex-nowrap gap-2.5 px-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden scroll-smooth"
      >
        {tabs.map((tab) => (
          <NavLink
            key={tab.id}
            to={tab.path}
            className={({ isActive }) => twMerge(
              "shrink-0 min-w-fit flex-1 flex items-center justify-center gap-3 px-6 md:px-8 py-4 text-[10px] md:text-xs font-black uppercase tracking-[0.25em] transition-all duration-500 rounded-[1rem] relative overflow-hidden group/nav",
              isActive ? "text-primary bg-primary/10 shadow-pop translate-y-[-1px]" : "text-text-muted hover:bg-surface-200 hover:text-text-main"
            )}
          >
            {({ isActive }) => (
              <>
                <tab.icon className={twMerge("w-4 h-4 transition-all duration-500", isActive ? "text-primary scale-110" : "text-text-muted/40 group-hover/nav:text-text-main")} />
                <span className="relative z-10">{tab.label}</span>
                {isActive && (
                  <motion.div 
                    layoutId="nav-active"
                    className="absolute inset-0 bg-primary/5 border border-primary/20 rounded-[1rem]"
                  />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>

      {/* Direita */}
      <button 
        onClick={() => scroll('right')}
        className="z-20 p-2.5 bg-surface-200/90 text-text-main rounded-xl border border-border opacity-0 group-hover:opacity-100 transition-all focus:outline-none hover:bg-primary hover:text-text-inverse shadow-pop"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
