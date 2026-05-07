import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { useAuthContext } from '../../context/AuthContext';
import { Button } from '../atoms/Button';
import { Send, Terminal as TerminalIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function ChatTab() {
  const { profile } = useAuthContext();
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef(null);

  // Local cache: user_id → nome. Seeded from the initial fetch, so no
  // extra SELECT is needed for users who already have messages loaded.
  const userNamesCache = useRef(new Map());

  // 1. Fetch initial messages (includes joined nome via FK)
  useEffect(() => {
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`id, content, created_at, user_id, usuarios (nome)`)
        .order('created_at', { ascending: false }) // fetch newest first
        .limit(50);

      if (error) {
        console.error('[CHAT] Fetch error:', error);
        return;
      }

      if (data) {
        // Reverse so messages display oldest → newest (chronological order in UI)
        const chronological = [...data].reverse();
        chronological.forEach(msg => {
          if (msg.user_id && msg.usuarios?.nome) {
            userNamesCache.current.set(msg.user_id, msg.usuarios.nome);
          }
        });
        setMessages(chronological);
      }
    };

    fetchMessages();

    // 2. Realtime subscription for new messages
    const channelId = `chat_public_${Math.random().toString(36).slice(2, 7)}`;
    const channel = supabase
      .channel(channelId)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages'
      }, async (payload) => {
        const uid = payload.new.user_id;
        let nome = userNamesCache.current.get(uid);

        // Cache miss → fetch once and cache for subsequent messages
        if (!nome) {
          const { data: userData } = await supabase
            .from('usuarios')
            .select('nome')
            .eq('id', uid)
            .single();
          nome = userData?.nome ?? 'ANONYMOUS_ENTITY';
          userNamesCache.current.set(uid, nome);
        }

        setMessages(prev => [...prev, { ...payload.new, usuarios: { nome } }]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // 3. Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || !profile || isSending) return;

    setIsSending(true);
    const { error } = await supabase
      .from('chat_messages')
      .insert([{ content: inputValue.trim(), user_id: profile.id }]);

    if (error) {
      console.error('[CHAT] Error sending message:', error);
      alert('ERRO_TRANSMISSÃO: Falha ao enviar dados para o cluster.');
    } else {
      // Cache our own name so the Realtime handler won't need to fetch it
      if (profile.id && profile.nome) {
        userNamesCache.current.set(profile.id, profile.nome);
      }
      setInputValue('');
    }
    setIsSending(false);
  };

  return (
    <div className="flex flex-col h-[500px] md:h-[650px] bg-surface-100/40 backdrop-blur-3xl border border-border rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden shadow-main relative">
      <div className="noise-bg absolute inset-0 opacity-5 pointer-events-none" />

      {/* Header */}
      <div className="p-4 md:p-6 border-b border-border bg-surface-200/50 flex items-center justify-between z-10">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
            <TerminalIcon className="w-4 h-4 md:w-5 md:h-5 text-primary animate-flicker" />
          </div>
          <div>
            <h3 className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] md:tracking-[0.3em] text-text-main">CANAL_DE_COMUNICAÇÃO</h3>
            <p className="text-[7px] md:text-[8px] text-text-muted font-bold uppercase tracking-widest mt-0.5">Canal_Subespacial_Criptografado</p>
          </div>
        </div>
        <div className="hidden min-[400px]:flex items-center gap-2 px-3 py-1 bg-primary/5 border border-primary/10 rounded-full text-[8px] text-primary font-black uppercase tracking-widest">
          <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse shadow-pop" />
          SINCRONIA_AO_VIVO: ATIVA
        </div>
      </div>

      {/* Messages Area */}
      <div
        ref={scrollRef}
        className="flex-grow p-4 md:p-8 overflow-y-auto custom-scrollbar flex flex-col gap-4 md:gap-6 font-mono text-[11px] md:text-[13px] z-10"
      >
        {messages.map((msg) => (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={msg.id}
            className="flex flex-col gap-2 max-w-[85%]"
          >
            <div className="flex items-center gap-3 ml-1">
              <span className="text-primary text-[10px] font-black uppercase tracking-widest bg-primary/5 px-2 py-0.5 rounded border border-primary/10">
                {msg.usuarios?.nome || 'ENTIDADE_ANÔNIMA'}
              </span>
              <span className="text-[9px] text-text-muted/20 font-bold">
                {new Date(msg.created_at).toLocaleTimeString()}
              </span>
            </div>
            <div className="bg-surface-200 border border-border p-4 rounded-2xl rounded-tl-none">
              <p className="text-text-main/60 break-words leading-relaxed">{msg.content}</p>
            </div>
          </motion.div>
        ))}

        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-text-muted/20 gap-4 uppercase tracking-[0.4em]">
            <div className="w-16 h-px bg-border/5" />
            <p className="text-[10px] font-black">Aguardando transmissão de entrada...</p>
            <div className="w-16 h-px bg-border/5" />
          </div>
        )}
      </div>

      {/* Input Area */}
      <form
        onSubmit={handleSendMessage}
        className="p-4 md:p-6 bg-surface-200/50 border-t border-border flex gap-3 md:gap-4 items-center z-10"
      >
        <div className="flex-grow relative group">
          <span className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 text-primary/40 text-[10px] md:text-xs font-black group-focus-within:text-primary transition-colors">&gt;</span>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="CODIFICAR_TRANSMISSÃO..."
            className="w-full bg-surface-200 border border-border rounded-xl md:rounded-2xl py-3 md:py-4 pl-8 md:pl-10 pr-4 md:pr-6 text-text-main text-xs md:text-sm placeholder:text-text-muted/20 focus:border-primary/40 focus:bg-surface-300 outline-none transition-all uppercase tracking-widest font-mono"
          />
        </div>
        <button
          disabled={!inputValue.trim() || isSending}
          type="submit"
          className="btn-premium px-4 md:px-8 py-3 md:py-4 flex items-center gap-2 md:gap-3 shrink-0"
        >
          <Send className="w-3.5 h-3.5 md:w-4 md:h-4" />
          <span className="hidden sm:inline text-[10px] md:text-xs tracking-widest font-black uppercase">ENVIAR</span>
        </button>
      </form>
    </div>
  );
}
