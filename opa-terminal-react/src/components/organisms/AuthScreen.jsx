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
  const [glitchText, setGlitchText] = useState("SISTEMA OPA");

  const { signIn, signUp, resetPassword, loading, error } = useAuth();

  // Glitch effect for title
  useEffect(() => {
    const interval = setInterval(() => {
      setGlitchText(prev => prev === "SISTEMA OPA" ? "SYS_PROTOCOL" : "SISTEMA OPA");
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFeedback("");

    if (view === 'login') {
        const { error: authError } = await signIn(email, password);
        if (authError) {
            setFeedback(authError.message === 'Email not confirmed' ? 'ERRO: E-mail não verificado.' : 'ERRO: Acesso negado.');
        }
    } else if (view === 'register') {
        if (!nome.trim()) return;
        const { error: authError } = await signUp(email, password, nome.trim().toUpperCase());
        if (!authError) setView('check-email');
    } else if (view === 'forgot-password') {
        const { error: authError } = await resetPassword(email);
        if (!authError) setFeedback('SUCESSO: Link enviado.');
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.98 },
    visible: { 
        opacity: 1, y: 0, scale: 1,
        transition: { duration: 0.6, ease: "easeOut" }
    },
    exit: { opacity: 0, scale: 1.02, transition: { duration: 0.3 } }
  };

  return (
    <div className="fixed inset-0 z-[500] bg-bg flex items-center justify-center p-4 overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-glow/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyber-blue/20 blur-[120px] rounded-full" />
      </div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="w-full max-w-lg relative"
      >
        {/* Decorative Borders */}
        <div className="absolute -top-4 -left-4 w-12 h-12 border-t-4 border-l-4 border-glow rounded-tl-lg" />
        <div className="absolute -bottom-4 -right-4 w-12 h-12 border-b-4 border-r-4 border-cyber-blue rounded-br-lg" />

        <div className="glass-card relative overflow-hidden backdrop-blur-3xl bg-surface/80 border-white/5 p-8 md:p-14 w-full shadow-2xl">
            
            {/* Header */}
            <div className="flex flex-col items-center mb-10">
                <div className="w-20 h-20 mb-6 relative">
                    <div className="absolute inset-0 border-2 border-glow/20 rounded-full" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Shield className="text-glow w-8 h-8" />
                    </div>
                </div>
                
                <h2 className="text-3xl md:text-4xl font-black text-white text-center mb-1">
                    LOGIN
                </h2>
                <div className="h-1 w-12 bg-glow mb-4 rounded-full" />
                <p className="text-[10px] text-white/40 font-black tracking-[0.4em] uppercase">Security Gateway</p>
            </div>

            <AnimatePresence mode="wait">
                {view === 'check-email' ? (
                    <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="text-center space-y-8 py-4"
                    >
                        <div className="space-y-4">
                            <h3 className="text-xl text-white font-black">VALIDAÇÃO_PENDENTE</h3>
                            <p className="text-sm text-white/60 leading-relaxed font-sans">
                                Protocolo enviado para <strong className="text-white">{email}</strong>.
                            </p>
                        </div>
                        <button onClick={() => setView('login')} className="btn-premium w-full text-bg">RTN_LOGON</button>
                    </motion.div>
                ) : (
                    <motion.form 
                        key={view}
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        onSubmit={handleSubmit} 
                        className="space-y-6"
                    >
                        {/* Tab Switcher */}
                        {(view === 'login' || view === 'register') && (
                            <div className="grid grid-cols-2 gap-2 mb-8 bg-white/5 p-1 rounded-xl border-2 border-white/5">
                                <button 
                                    type="button"
                                    onClick={() => setView('login')}
                                    className={`py-3 text-[10px] font-black rounded-lg transition-all ${view === 'login' ? 'bg-white text-bg shadow-lg' : 'text-white/40 hover:text-white'}`}
                                >
                                    ENTRAR
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setView('register')}
                                    className={`py-3 text-[10px] font-black rounded-lg transition-all ${view === 'register' ? 'bg-white text-bg shadow-lg' : 'text-white/40 hover:text-white'}`}
                                >
                                    REGISTRAR
                                </button>
                            </div>
                        )}

                        <div className="space-y-5">
                            {view === 'register' && (
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-white/40 ml-2 uppercase tracking-widest">Protocol.Identity</label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                                        <input 
                                            type="text" required placeholder="NOME DE USUÁRIO"
                                            value={nome} onChange={(e) => setNome(e.target.value)}
                                            className="pl-12 w-full"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-white/40 ml-2 uppercase tracking-widest">Comm.Link</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                                    <input 
                                        type="email" required placeholder="E-MAIL"
                                        value={email} onChange={(e) => setEmail(e.target.value)}
                                        className="pl-12 w-full"
                                    />
                                </div>
                            </div>

                            {view !== 'forgot-password' && (
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-white/40 ml-2 uppercase tracking-widest">Access.Fragment</label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                                        <input 
                                            type="password" required placeholder="SENHA"
                                            value={password} onChange={(e) => setPassword(e.target.value)}
                                            className="pl-12 w-full"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-between px-2">
                            {view === 'login' && (
                                <button type="button" onClick={() => setView('forgot-password')} className="text-[10px] text-white/40 hover:text-white uppercase font-black transition-colors">
                                    Recuperar Acesso
                                </button>
                            )}
                        </div>

                        <div className="space-y-4 pt-4">
                            {feedback && <p className="text-[10px] text-glow text-center font-black bg-glow/10 py-3 rounded-xl border-2 border-glow/20 uppercase">{feedback}</p>}
                            {error && <p className="text-[10px] text-danger text-center font-black bg-danger/10 py-3 rounded-xl border-2 border-danger/20 uppercase">ERRO: {error}</p>}
                            
                            <button 
                                type="submit" 
                                disabled={loading}
                                className="btn-premium w-full py-5 text-xs flex items-center justify-center gap-3 transition-transform active:scale-95 shadow-glow"
                            >
                                <span>{loading ? "PROCESSANDO..." : (view === 'login' ? "INICIAR SESSÃO" : view === 'register' ? "GERAR PROTOCOLO" : "ENVIAR LINK")}</span>
                                {!loading && <Zap className="w-4 h-4" />}
                            </button>
                        </div>
                    </motion.form>
                )}
            </AnimatePresence>

            {/* Footer */}
            <div className="mt-12 flex items-center justify-between border-t border-white/5 pt-6 opacity-20">
                <div className="flex gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    <div className="w-1.5 h-1.5 rounded-full bg-white/50" />
                </div>
                <div className="flex items-center gap-1">
                    <span className="text-[8px] font-black uppercase tracking-[0.3em] text-white">SECURE_LINK_v2.8</span>
                </div>
            </div>
        </div>
      </motion.div>
    </div>
  );
}
