import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, Outlet, Link } from 'react-router-dom';
import { Menu, X, Terminal, Shield, Book, Gamepad2, Info, MessageSquare, Users, LogOut, Cpu, Activity, Trophy, Coins, Zap } from 'lucide-react';
import { NavTabs } from '../molecules/NavTabs';
import { useAuthContext } from '../../context/AuthContext';

const TABS = [
  { id: 'tradutor', label: 'Tradutor', icon: Terminal, path: '/tradutor' },
  { id: 'referencia', label: 'Referência', icon: Book, path: '/referencia' },
  { id: 'executor', label: 'Executor', icon: Shield, path: '/executor' },
  { id: 'chat', label: 'Chat', icon: MessageSquare, path: '/chat' },
  { id: 'leaderboard', label: 'Ranking', icon: Trophy, path: '/leaderboard' },
  { id: 'multiplayer', label: 'Multijogador', icon: Users, path: '/multiplayer' },
  { id: 'blackopa', label: 'Blackopa', icon: Gamepad2, path: '/blackopa' },
  { id: 'linguopa', label: 'Linguopa', icon: Gamepad2, path: '/linguopa' },
  { id: 'gotchi', label: 'OPA-gotchi', icon: Info, path: '/gotchi' },
];

export function MainTerminalLayout() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { logout, profile } = useAuthContext();
  const location = useLocation();

  return (
    <div className="terminal-container font-terminal overflow-x-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-glow/5 blur-[150px] pointer-events-none -z-10" />

      {/* Header */}
      <header className="flex items-center justify-between mb-8 border-b border-white/5 pb-8 relative z-10 px-2 lg:px-0">
        <div className="flex items-center gap-4">
          <Link to="/" className="p-3 bg-glow/5 rounded-xl border-2 border-glow/20 shadow-glow hover:scale-105 transition-transform">
            <Cpu className="text-glow w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-white flex items-center gap-3">
                OPA<span className="text-glow">.CORE</span>
                <span className="hidden sm:inline-block text-[8px] border-2 border-white/10 px-2 py-0.5 rounded tracking-[0.2em] font-black align-middle text-white/40">v2.8_FINAL</span>
            </h1>
            <div className="flex items-center gap-4 mt-1">
                <div className="flex items-center gap-1.5 opacity-60">
                    <Activity className="w-3 h-3 text-glow" />
                    <span className="text-[9px] uppercase tracking-widest font-black text-white">Latency: 12ms</span>
                </div>
                {profile ? (
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-glow animate-pulse" />
                            <span className="text-[9px] uppercase tracking-widest font-black text-glow">USER: {profile.nome}</span>
                        </div>
                        <div className="hidden sm:flex items-center gap-4">
                            <div className="flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-lg">
                                <Coins className="w-3 h-3 text-glow opacity-50" />
                                <span className="text-[10px] font-mono text-glow font-bold">{(profile.coins || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-lg">
                                <Zap className="w-3 h-3 text-cyber-blue opacity-50" />
                                <span className="text-[10px] font-mono text-cyber-blue font-bold">{(profile.xp || 0).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 opacity-20 animate-pulse">
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        <span className="text-[9px] uppercase tracking-widest font-black">Sincronizando_Perfil...</span>
                    </div>
                )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
            <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="md:hidden p-3 text-white bg-white/5 rounded-xl border-2 border-white/10 active:scale-95 transition-all"
                aria-label="Menu"
            >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <button 
                onClick={logout}
                className="hidden md:flex items-center gap-2 px-6 py-2.5 bg-danger/5 hover:bg-danger/20 text-danger border-2 border-danger/20 rounded-xl transition-all text-[10px] font-black tracking-widest uppercase group"
            >
                <LogOut className="w-3 h-3 group-hover:-translate-x-1 transition-transform" />
                <span>LOGOFF</span>
            </button>
        </div>
      </header>

      {/* Navigation - Desktop */}
      <div className="hidden md:block mb-8 px-2 lg:px-0">
        <NavTabs tabs={TABS} />
      </div>

      {/* Navigation - Mobile Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="md:hidden absolute top-24 left-4 right-4 bg-surface-brighter/95 backdrop-blur-2xl border border-glow/20 rounded-2xl z-50 p-6 flex flex-col gap-3 shadow-2xl"
          >
            {TABS.map((tab) => (
              <Link
                key={tab.id}
                to={tab.path}
                onClick={() => setIsMenuOpen(false)}
                className={`flex items-center gap-4 p-4 rounded-xl font-black uppercase tracking-[0.2em] text-xs transition-all ${
                  location.pathname === tab.path ? 'bg-glow/20 text-glow border border-glow/30' : 'text-accent/50 hover:bg-white/5 hover:text-white'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </Link>
            ))}
            <div className="h-px bg-white/5 my-2" />
            <button 
                onClick={logout}
                className="flex items-center gap-4 p-4 rounded-xl font-black uppercase tracking-[0.2em] text-xs text-danger hover:bg-danger/10 transition-all"
            >
                <LogOut className="w-4 h-4" />
                EXIT_SYSTEM
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-grow overflow-y-auto overflow-x-hidden custom-scrollbar w-full px-2 lg:px-0 relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -10, filter: 'blur(10px)' }}
            transition={{ duration: 0.4, ease: "circOut" }}
            className="h-full w-full"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer Info (Subtle) */}
      <footer className="mt-6 pt-6 border-t border-glow/10 flex flex-wrap gap-4 justify-between items-center text-[9px] text-accent/40 font-bold uppercase tracking-[0.3em] pb-2">
        <div className="flex gap-6">
            <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-glow" /> SECURE_LINK: ACTIVE</span>
            <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-cyber-blue" /> CORE_LOAD: OPTIMIZED</span>
            <span className="hidden sm:inline-flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-glow/20" /> UPTIME: 14:02:11</span>
        </div>
        <div className="text-glow/30 group cursor-default">
            &copy; 2077 OPA_SYSTEMS // <span className="text-accent underline group-hover:text-glow transition-colors">ROOT_ACCESS</span>
        </div>
      </footer>
    </div>
  );
}
