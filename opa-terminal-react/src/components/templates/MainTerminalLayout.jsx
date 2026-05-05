import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, Outlet, Link } from 'react-router-dom';
import { Menu, X, Terminal, Shield, Book, Gamepad2, Info, MessageSquare, Users, LogOut, Cpu, Activity, Trophy, Coins, Zap, Swords } from 'lucide-react';
import { NavTabs } from '../molecules/NavTabs';
import { useAuthContext } from '../../context/AuthContext';
import { usePet } from '../../context/PetContext';

const TABS = [
  { id: 'tradutor', label: 'Tradutor', icon: Terminal, path: '/tradutor' },
  { id: 'referencia', label: 'Referência', icon: Book, path: '/referencia' },
  { id: 'executor', label: 'Executor', icon: Shield, path: '/executor' },
  { id: 'chat', label: 'Chat', icon: MessageSquare, path: '/chat' },
  { id: 'leaderboard', label: 'Ranking', icon: Trophy, path: '/leaderboard' },
  { id: 'multiplayer', label: 'Multijogador', icon: Users, path: '/multiplayer' },
  { id: 'pokemon', label: 'Pokémon', icon: Swords, path: '/pokemon' },
  { id: 'blackopa', label: 'Blackopa', icon: Gamepad2, path: '/blackopa' },
  { id: 'linguopa', label: 'Linguopa', icon: Gamepad2, path: '/linguopa' },
  { id: 'gotchi', label: 'OPA-gotchi', icon: Info, path: '/gotchi' },
];

export function MainTerminalLayout() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { logout, profile } = useAuthContext();
  const { pet } = usePet();
  const location = useLocation();

  return (
    <div className="terminal-container font-terminal">
      {/* Dynamic Background Noise */}
      <div className="noise-bg fixed inset-0 z-[-1]" />

      {/* Header */}
      <header className="flex items-center justify-between gap-4 mb-8 md:mb-12 relative z-50">
        <div className="flex items-center gap-4 md:gap-6 min-w-0">
          <Link to="/" className="relative group shrink-0 hidden sm:block">
            <div className="absolute inset-0 bg-glow/20 blur-xl rounded-full scale-0 group-hover:scale-150 transition-transform duration-500" />
            <div className="p-4 bg-surface-brighter border border-white/5 rounded-2xl shadow-xl relative">
              <Cpu className="text-glow w-6 h-6 animate-flicker" />
            </div>
          </Link>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 md:gap-3 flex-wrap">
              <h1 className="text-xl md:text-2xl font-black text-white tracking-[0.2em] md:tracking-[0.3em] truncate">
                OPA<span className="text-glow">.CORE</span>
              </h1>
              <span className="text-[8px] bg-white/5 border border-white/10 px-2 py-0.5 rounded tracking-[0.2em] font-black text-neutral-400 shrink-0">v3.2_FIXED</span>
            </div>

            <div className="flex items-center gap-3 md:gap-5 mt-2 flex-wrap">
              <div className="hidden min-[400px]:flex items-center gap-2 opacity-40">
                <Activity className="w-3 h-3 text-glow" />
                <span className="text-[8px] md:text-[9px] uppercase tracking-widest font-bold">Lat: 12ms</span>
              </div>

              {profile ? (
                <div className="flex items-center gap-4 md:gap-6 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-glow animate-pulse box-glow shrink-0" />
                    <span className="text-[9px] uppercase tracking-widest font-black text-glow/80 truncate max-w-[100px] md:max-w-[200px]">ID: {profile.nome}</span>
                  </div>
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1 bg-surface-accent border border-white/5 rounded-lg shadow-inner">
                      <Coins className="w-3 h-3 text-glow/80" />
                      <span className="text-[9px] md:text-[10px] font-mono text-glow font-bold">{(pet?.coins ?? profile.coins ?? 0).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1 bg-surface-accent border border-white/5 rounded-lg shadow-inner">
                      <Zap className="w-3 h-3 text-cyber-blue/80" />
                      <span className="text-[9px] md:text-[10px] font-mono text-cyber-blue font-bold">{(pet?.xp ?? profile.xp ?? 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 opacity-20 animate-pulse">
                  <span className="text-[9px] uppercase tracking-widest font-black">Syncing...</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2.5 text-neutral-400 bg-surface border border-white/5 rounded-xl active:scale-95 transition-all shadow-lg hover:text-white hover:bg-surface-brighter"
            aria-label="Menu"
          >
            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <button
            onClick={logout}
            className="hidden md:flex items-center gap-3 px-6 py-3 bg-danger/10 hover:bg-danger/20 text-danger border border-danger/20 rounded-xl transition-all text-[10px] font-black tracking-widest uppercase group"
          >
            <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>TERMINATE_SESSION</span>
          </button>
        </div>
      </header>

      {/* Navigation - Desktop */}
      <nav className="hidden md:block mb-12">
        <NavTabs tabs={TABS} />
      </nav>

      {/* Navigation - Mobile Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="md:hidden fixed inset-y-0 right-0 w-[80vw] max-w-sm bg-surface/98 backdrop-blur-3xl border-l border-white/5 z-50 p-6 flex flex-col gap-3 shadow-2xl overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-6">
              <span className="text-[10px] font-black text-neutral-500 tracking-[0.3em]">NAV_SYSTEM</span>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="text-neutral-400 w-4 h-4" />
              </button>
            </div>
            {TABS.map((tab) => (
              <Link
                key={tab.id}
                to={tab.path}
                onClick={() => setIsMenuOpen(false)}
                className={`flex items-center gap-4 p-4 rounded-xl font-black uppercase tracking-[0.2em] text-[10px] transition-all active:scale-95 ${location.pathname === tab.path ? 'bg-glow/10 text-glow border border-glow/20 shadow-inner' : 'text-neutral-400 hover:bg-white/5 hover:text-white'
                  }`}
              >
                <tab.icon className={`w-4 h-4 ${location.pathname === tab.path ? 'text-glow' : 'text-neutral-500'}`} />
                {tab.label}
              </Link>
            ))}
            <div className="mt-8 pt-6 border-t border-white/5">
              <button
                onClick={logout}
                className="w-full flex items-center justify-center gap-3 p-4 rounded-xl font-black uppercase tracking-[0.2em] text-[10px] bg-danger/10 text-danger border border-danger/20 transition-all active:scale-95"
              >
                <LogOut className="w-4 h-4" />
                LOGOUT
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-grow w-full relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.99 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="h-full w-full"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer Info */}
      <footer className="mt-12 pt-8 border-t border-white/5 flex flex-wrap gap-8 justify-between items-center text-[9px] text-white/20 font-bold uppercase tracking-[0.3em] pb-4">
        <div className="flex gap-8">
          <span className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-glow box-glow" /> NETWORK: STABLE</span>
          <span className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-cyber-blue box-glow" /> CPU_LOAD: 0.04%</span>
          <span className="hidden sm:inline-flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-white/20" /> SYSTEM_UPTIME: 1.4M_CYCLES</span>
        </div>
        <div className="text-white/10 hover:text-white/30 transition-colors cursor-default">
          &copy; 2077 OPA_CORP // PROTOCOL_CORE
        </div>
      </footer>
    </div>
  );
}
