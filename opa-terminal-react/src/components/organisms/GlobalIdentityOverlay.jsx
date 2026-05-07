import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../atoms/Button';
import { Shield } from 'lucide-react';

export function GlobalIdentityOverlay({ onCreate }) {
  const [username, setUsername] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || isSubmitting) return;

    setIsSubmitting(true);
    await onCreate(username.trim().toUpperCase());
    setIsSubmitting(false);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[300] bg-bg/95 flex items-center justify-center p-4"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="max-w-md w-full bg-surface-100 border-2 border-primary p-8 rounded-2xl shadow-pop"
      >
        <div className="flex flex-col items-center gap-6 text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center border border-primary/30">
                <Shield className="text-primary w-8 h-8" />
            </div>
            
            <div className="space-y-2">
                <h2 className="text-xl font-black tracking-widest uppercase text-text-main">Protocolo de Identidade</h2>
                <p className="text-xs text-text-muted uppercase tracking-widest leading-relaxed">
                    Detectamos uma nova conexão ao Terminal OPA. <br />
                    Defina seu identificador global para acessar o Chat e o banco de dados.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="w-full space-y-4">
                <input 
                    type="text" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="DIGITE_SEU_ID" 
                    maxLength={15}
                    className="w-full bg-surface-200 border-b-2 border-border focus:border-primary outline-none py-3 text-center text-primary font-black tracking-widest uppercase text-lg"
                    autoFocus
                />
                
                <Button 
                    type="submit"
                    variant="primary"
                    className="w-full py-6"
                    disabled={!username.trim() || isSubmitting}
                >
                    {isSubmitting ? "SINCRO_DATA..." : "AUTORIZAR ACESSO"}
                </Button>
            </form>

            <p className="text-[9px] text-accent/30 uppercase mt-4">
                Segurança OPA Nível 4: Dados criptografados via Supabase.
            </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
