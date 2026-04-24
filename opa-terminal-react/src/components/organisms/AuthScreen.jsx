import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Key, Mail, User, ArrowRight, Zap, Lock, Info } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const decryptEffect = (text) => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*";
    return text.split('').map(() => chars[Math.floor(Math.random() * chars.length)]).join('');
};

export function AuthScreen() {
  const [view, setView] = useState('login'); 
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [feedback, setFeedback] = useState("");

  const { signIn, signUp, resetPassword, loading, error } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFeedback("");

    if (view === 'login') {
        const { error: authError } = await signIn(email, password);
        if (authError) {
            setFeedback(authError.message === 'Email not confirmed' ? 'ERROR: UNVERIFIED_IDENTITY' : 'ERROR: ACCESS_DENIED');
        }
    } else if (view === 'register') {
        if (!nome.trim()) return;
        const { error: authError } = await signUp(email, password, nome.trim().toUpperCase());
        if (!authError) setView('check-email');
    } else if (view === 'forgot-password') {
        const { error: authError } = await resetPassword(email);
        if (!authError) setFeedback('SUCCESS: RESET_LINK_EMITTED');
    }
  };

  return (
    <div className="fixed inset-0 z-[500] bg-bg flex items-center justify-center p-4 overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-glow/10 blur-[150px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-cyber-blue/10 blur-[150px] rounded-full" />
        <div className="noise-bg absolute inset-0 opacity-10" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
        animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-lg relative z-10"
      >
        {/* Corner Decor */}
        <div className="absolute -top-4 -left-4 w-16 h-16 border-t-2 border-l-2 border-glow opacity-40" />
        <div className="absolute -bottom-4 -right-4 w-16 h-16 border-b-2 border-r-2 border-cyber-blue opacity-40" />

        <div className="glass-card relative overflow-hidden backdrop-blur-3xl bg-surface/80 border-white/5 p-10 md:p-16 w-full shadow-[0_32px_64px_rgba(0,0,0,0.8)]">
            
            {/* Header */}
            <div className="flex flex-col items-center mb-12">
                <div className="w-24 h-24 mb-8 relative flex items-center justify-center">
                    <div className="absolute inset-0 border border-glow/20 rounded-3xl rotate-45 group-hover:rotate-90 transition-transform duration-1000" />
                    <div className="absolute inset-0 bg-glow/5 blur-xl rounded-full" />
                    <Shield className="text-glow w-10 h-10 relative animate-flicker" />
                </div>
                
                <h2 className="text-4xl font-black text-white text-center tracking-[0.3em] mb-2">
                    {view === 'login' ? 'GATEWAY' : view === 'register' ? 'PROTOCOL' : 'RECOVERY'}
                </h2>
                <div className="flex items-center gap-2">
                  <div className="h-px w-8 bg-glow/40" />
                  <p className="text-[9px] text-white/30 font-black tracking-[0.5em] uppercase">Security Level 4</p>
                  <div className="h-px w-8 bg-glow/40" />
                </div>
            </div>

            <AnimatePresence mode="wait">
                {view === 'check-email' ? (
                    <motion.div 
                        key="check-email"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="text-center space-y-10 py-6"
                    >
                        <div className="space-y-4">
                            <div className="w-16 h-16 bg-glow/10 rounded-2xl mx-auto flex items-center justify-center border border-glow/20">
                                <Mail className="text-glow w-8 h-8" />
                            </div>
                            <h3 className="text-xl text-white font-black tracking-widest">VALIDATION_SENT</h3>
                            <p className="text-xs text-white/40 leading-relaxed font-bold uppercase tracking-wider">
                                Access fragment dispatched to <strong className="text-glow">{email}</strong>. Check your communication link.
                            </p>
                        </div>
                        <button onClick={() => setView('login')} className="btn-premium w-full">RETURN_TO_BASE</button>
                    </motion.div>
                ) : (
                    <motion.form 
                        key={view}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onSubmit={handleSubmit} 
                        className="space-y-8"
                    >
                        {/* Tab Switcher */}
                        {(view === 'login' || view === 'register') && (
                            <div className="grid grid-cols-2 gap-4 mb-10 bg-white/[0.03] p-1.5 rounded-2xl border border-white/5">
                                <button 
                                    type="button"
                                    onClick={() => setView('login')}
                                    className={`py-4 text-[10px] font-black rounded-xl transition-all tracking-[0.2em] ${view === 'login' ? 'bg-glow text-bg shadow-glowStrong' : 'text-white/20 hover:text-white/40'}`}
                                >
                                    LOGIN
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setView('register')}
                                    className={`py-4 text-[10px] font-black rounded-xl transition-all tracking-[0.2em] ${view === 'register' ? 'bg-glow text-bg shadow-glowStrong' : 'text-white/20 hover:text-white/40'}`}
                                >
                                    ENROLL
                                </button>
                            </div>
                        )}

                        <div className="space-y-6">
                            {view === 'register' && (
                                <div className="space-y-2">
                                    <label className="text-[8px] font-black text-white/20 ml-2 uppercase tracking-[0.4em]">Identity.Fragment</label>
                                    <div className="relative group">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/10 group-focus-within:text-glow/50 transition-colors" />
                                        <input 
                                            type="text" required placeholder="USERNAME"
                                            value={nome} onChange={(e) => setNome(e.target.value)}
                                            className="pl-12 w-full h-14"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-[8px] font-black text-white/20 ml-2 uppercase tracking-[0.4em]">Comms.Link</label>
                                <div className="relative group">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/10 group-focus-within:text-glow/50 transition-colors" />
                                    <input 
                                        type="email" required placeholder="EMAIL_ADDRESS"
                                        value={email} onChange={(e) => setEmail(e.target.value)}
                                        className="pl-12 w-full h-14"
                                    />
                                </div>
                            </div>

                            {view !== 'forgot-password' && (
                                <div className="space-y-2">
                                    <label className="text-[8px] font-black text-white/20 ml-2 uppercase tracking-[0.4em]">Access.Key</label>
                                    <div className="relative group">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/10 group-focus-within:text-glow/50 transition-colors" />
                                        <input 
                                            type="password" required placeholder="PASSWORD"
                                            value={password} onChange={(e) => setPassword(e.target.value)}
                                            className="pl-12 w-full h-14"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-between px-2">
                            {view === 'login' && (
                                <button type="button" onClick={() => setView('forgot-password')} className="text-[10px] text-white/20 hover:text-white/60 uppercase font-bold tracking-widest transition-colors">
                                    Lost access?
                                </button>
                            )}
                            {view === 'forgot-password' && (
                                <button type="button" onClick={() => setView('login')} className="text-[10px] text-white/20 hover:text-white/60 uppercase font-bold tracking-widest transition-colors">
                                    Return to login
                                </button>
                            )}
                        </div>

                        <div className="space-y-4 pt-4">
                            {feedback && <p className="text-[10px] text-glow text-center font-black bg-glow/5 py-4 rounded-xl border border-glow/20 uppercase tracking-widest">{feedback}</p>}
                            {error && <p className="text-[10px] text-danger text-center font-black bg-danger/5 py-4 rounded-xl border border-danger/20 uppercase tracking-widest">SYSTEM_ERROR: {error}</p>}
                            
                            <button 
                                type="submit" 
                                disabled={loading}
                                className="btn-premium w-full py-6 text-[11px] flex items-center justify-center gap-3 active:scale-95 disabled:scale-100"
                            >
                                <span>{loading ? "INITIALIZING..." : (view === 'login' ? "INITIALIZE_SESSION" : view === 'register' ? "GENERATE_ENTITY" : "DISPATCH_RECOVERY")}</span>
                                {!loading && <ArrowRight className="w-4 h-4" />}
                            </button>
                        </div>
                    </motion.form>
                )}
            </AnimatePresence>

            {/* Footer */}
            <div className="mt-12 flex items-center justify-between border-t border-white/5 pt-8 opacity-30">
                <div className="flex gap-4">
                    <div className="flex flex-col gap-1">
                      <div className="h-0.5 w-4 bg-glow" />
                      <div className="h-0.5 w-6 bg-glow/40" />
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-[8px] font-black uppercase tracking-[0.4em] text-white/40">OPA_SEC_CORE_v2.8</span>
                </div>
            </div>
        </div>
      </motion.div>
    </div>
  );
}
