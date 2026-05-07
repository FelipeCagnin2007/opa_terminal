import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Mail, User, ArrowRight, Lock } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../atoms/Button';

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
            setFeedback(authError.message === 'Email not confirmed' ? 'Conta não verificada. Verifique seu e-mail.' : 'Credenciais inválidas. Tente novamente.');
        }
    } else if (view === 'register') {
        if (!nome.trim()) return;
        const { error: authError } = await signUp(email, password, nome.trim().toUpperCase());
        if (!authError) setView('check-email');
    } else if (view === 'forgot-password') {
        const { error: authError } = await resetPassword(email);
        if (!authError) setFeedback('Sucesso: Link de recuperação enviado.');
    }
  };

  return (
    <div className="fixed inset-0 z-[500] bg-bg flex items-center justify-center p-4 overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-primary/10 blur-[150px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-accent/10 blur-[150px] rounded-full" />
        <div className="noise-bg absolute inset-0 opacity-10" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
        animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-lg relative z-10"
      >
        {/* Corner Decor */}
        <div className="absolute -top-4 -left-4 w-16 h-16 border-t-2 border-l-2 border-primary/40 opacity-40" />
        <div className="absolute -bottom-4 -right-4 w-16 h-16 border-b-2 border-r-2 border-accent/40 opacity-40" />

        <div className="glass-card relative overflow-hidden backdrop-blur-3xl bg-surface-100/80 border-border p-8 md:p-12 w-full shadow-main">
            
            {/* Header */}
            <div className="flex flex-col items-center mb-10">
                <div className="w-20 h-20 mb-6 relative flex items-center justify-center">
                    <div className="absolute inset-0 border border-primary/20 rounded-3xl rotate-45 group-hover:rotate-90 transition-transform duration-1000" />
                    <div className="absolute inset-0 bg-primary/10 blur-xl rounded-full" />
                    <Shield className="text-primary w-10 h-10 relative animate-flicker" />
                </div>
                
                <h2 className="text-3xl font-bold text-text-main text-center tracking-wider mb-2">
                    {view === 'login' ? 'Acesso' : view === 'register' ? 'Cadastro' : 'Recuperação'}
                </h2>
                <div className="flex items-center gap-2">
                  <div className="h-px w-8 bg-primary/40" />
                  <p className="text-xs text-text-muted font-medium tracking-widest uppercase">OPA Terminal</p>
                  <div className="h-px w-8 bg-primary/40" />
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
                            <div className="w-16 h-16 bg-primary/10 rounded-2xl mx-auto flex items-center justify-center border border-primary/20">
                                <Mail className="text-primary w-8 h-8" />
                            </div>
                            <h3 className="text-xl text-text-main font-bold">Verifique seu E-mail</h3>
                            <p className="text-sm text-text-muted leading-relaxed font-medium">
                                Enviamos um link de confirmação para <strong className="text-primary">{email}</strong>. Acesse sua caixa de entrada para continuar.
                            </p>
                        </div>
                        <Button onClick={() => setView('login')} variant="primary" className="w-full py-4">Voltar ao Login</Button>
                    </motion.div>
                ) : (
                    <motion.form 
                        key={view}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onSubmit={handleSubmit} 
                        className="space-y-6"
                    >
                        {/* Tab Switcher */}
                        {(view === 'login' || view === 'register') && (
                            <div className="grid grid-cols-2 gap-4 mb-8 bg-surface-200 p-1.5 rounded-2xl border border-border">
                                <button 
                                    type="button"
                                    onClick={() => setView('login')}
                                    className={`py-3 text-sm font-bold rounded-xl transition-all ${view === 'login' ? 'bg-primary text-text-main shadow-pop' : 'text-text-muted hover:text-text-main/80'}`}
                                >
                                    LOGIN
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setView('register')}
                                    className={`py-3 text-sm font-bold rounded-xl transition-all ${view === 'register' ? 'bg-primary text-text-main shadow-pop' : 'text-text-muted hover:text-text-main/80'}`}
                                >
                                    CRIAR CONTA
                                </button>
                            </div>
                        )}

                        <div className="space-y-5">
                            {view === 'register' && (
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-text-muted ml-1 uppercase tracking-wide">Nome de Usuário</label>
                                    <div className="relative group">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted/40 group-focus-within:text-primary transition-colors" />
                                        <input 
                                            type="text" required placeholder="Digite seu nome"
                                            value={nome} onChange={(e) => setNome(e.target.value)}
                                            className="pl-12 w-full"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-text-muted ml-1 uppercase tracking-wide">E-mail</label>
                                <div className="relative group">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted/40 group-focus-within:text-primary transition-colors" />
                                    <input 
                                        type="email" required placeholder="seu@email.com"
                                        value={email} onChange={(e) => setEmail(e.target.value)}
                                        className="pl-12 w-full"
                                    />
                                </div>
                            </div>

                            {view !== 'forgot-password' && (
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-text-muted ml-1 uppercase tracking-wide">Senha</label>
                                    <div className="relative group">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted/40 group-focus-within:text-primary transition-colors" />
                                        <input 
                                            type="password" required placeholder="Sua senha secreta"
                                            value={password} onChange={(e) => setPassword(e.target.value)}
                                            className="pl-12 w-full"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-between px-2 pt-2">
                            {view === 'login' && (
                                <button type="button" onClick={() => setView('forgot-password')} className="text-xs text-text-muted hover:text-text-main font-medium transition-colors">
                                    Esqueceu sua senha?
                                </button>
                            )}
                            {view === 'forgot-password' && (
                                <button type="button" onClick={() => setView('login')} className="text-xs text-text-muted hover:text-text-main font-medium transition-colors">
                                    Voltar ao login
                                </button>
                            )}
                        </div>

                        <div className="space-y-4 pt-2">
                            {feedback && <p className="text-sm text-primary text-center font-medium bg-primary/10 py-3 rounded-xl border border-primary/20">{feedback}</p>}
                            {error && <p className="text-sm text-danger text-center font-medium bg-danger/10 py-3 rounded-xl border border-danger/20">Erro: {error}</p>}
                            
                            <Button 
                                type="submit" 
                                variant="primary"
                                disabled={loading}
                                className="w-full py-4 flex items-center justify-center gap-3"
                            >
                                <span>{loading ? "PROCESSANDO..." : (view === 'login' ? "ENTRAR" : view === 'register' ? "CRIAR CONTA" : "ENVIAR LINK")}</span>
                                {!loading && <ArrowRight className="w-5 h-5" />}
                            </Button>
                        </div>
                    </motion.form>
                )}
            </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

