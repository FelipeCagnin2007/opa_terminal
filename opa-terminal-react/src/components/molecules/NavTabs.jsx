import { useRef } from 'react';
import { NavLink } from "react-router-dom";
import { twMerge } from "tailwind-merge";
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function NavTabs({ tabs }) {
  const scrollContainerRef = useRef(null);

  const scroll = (direction) => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === 'left' ? -200 : 200;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className="relative group flex items-center">
      {/* Esquerda */}
      <button 
        onClick={() => scroll('left')}
        className="absolute left-0 z-10 p-2 m-2 bg-surface/80 text-white rounded-full border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0 focus:outline-none hover:bg-glow/20 hover:text-glow backdrop-blur-md shadow-lg"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      <div 
        ref={scrollContainerRef}
        className="flex w-full overflow-x-auto flex-nowrap gap-2 p-1.5 bg-surface/30 backdrop-blur-md rounded-2xl border border-white/5 shadow-2xl [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden scroll-smooth"
      >
        {tabs.map((tab) => (
          <NavLink
            key={tab.id}
            to={tab.path}
            className={({ isActive }) => twMerge(
              "shrink-0 min-w-fit flex-1 flex items-center justify-center gap-2 px-5 md:px-6 py-3.5 text-[10px] md:text-xs font-black uppercase tracking-[0.2em] transition-all duration-300 rounded-xl text-neutral-400 hover:bg-white/5 hover:text-white",
              isActive && "bg-glow/20 text-glow shadow-glow box-glow translate-y-[-2px] border border-glow/30"
            )}
          >
            {({ isActive }) => (
              <>
                <tab.icon className={twMerge("w-4 h-4 transition-colors", isActive ? "text-glow" : "text-neutral-500")} />
                <span className="inline">{tab.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>

      {/* Direita */}
      <button 
        onClick={() => scroll('right')}
        className="absolute right-0 z-10 p-2 m-2 bg-surface/80 text-white rounded-full border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none hover:bg-glow/20 hover:text-glow backdrop-blur-md shadow-lg"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
