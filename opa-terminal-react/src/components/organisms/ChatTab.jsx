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
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) {
        console.error('[CHAT] Fetch error:', error);
        return;
      }

      if (data) {
        // Seed the cache with every user we got from the initial fetch
        data.forEach(msg => {
          if (msg.user_id && msg.usuarios?.nome) {
            userNamesCache.current.set(msg.user_id, msg.usuarios.nome);
          }
        });
        setMessages(data);
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
        const uid  = payload.new.user_id;
        let   nome = userNamesCache.current.get(uid);

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
    <div className="flex flex-col h-[650px] bg-surface/40 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl relative">
      <div className="noise-bg absolute inset-0 opacity-5 pointer-events-none" />
      
      {/* Header */}
      <div className="p-6 border-b border-white/5 bg-white/[0.02] flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl bg-glow/10 flex items-center justify-center border border-glow/20">
              <TerminalIcon className="w-5 h-5 text-glow animate-flicker" />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-[0.3em] text-white/80">GLOBAL_COMMS_RELAY</h3>
              <p className="text-[8px] text-white/20 font-bold uppercase tracking-widest mt-0.5">Encrypted_Subspace_Channel</p>
            </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-glow/[0.03] border border-glow/10 rounded-full text-[8px] text-glow font-black uppercase tracking-widest">
            <span className="w-1.5 h-1.5 bg-glow rounded-full animate-pulse box-glow" />
            LIVE_SYNC: ACTIVE
        </div>
      </div>

      {/* Messages Area */}
      <div
        ref={scrollRef}
        className="flex-grow p-8 overflow-y-auto custom-scrollbar flex flex-col gap-6 font-mono text-[13px] z-10"
      >
        {messages.map((msg) => (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={msg.id}
            className="flex flex-col gap-2 max-w-[85%]"
          >
            <div className="flex items-center gap-3 ml-1">
                <span className="text-glow text-[10px] font-black uppercase tracking-widest bg-glow/5 px-2 py-0.5 rounded border border-glow/10">
                  {msg.usuarios?.nome || 'ANONYMOUS_ENTITY'}
                </span>
                <span className="text-[9px] text-white/10 font-bold">
                  {new Date(msg.created_at).toLocaleTimeString()}
                </span>
            </div>
            <div className="bg-white/[0.03] border border-white/5 p-4 rounded-2xl rounded-tl-none">
              <p className="text-white/60 break-words leading-relaxed">{msg.content}</p>
            </div>
          </motion.div>
        ))}
        
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-white/10 gap-4 uppercase tracking-[0.4em]">
            <div className="w-16 h-px bg-white/5" />
            <p className="text-[10px] font-black">Waiting for incoming transmission...</p>
            <div className="w-16 h-px bg-white/5" />
          </div>
        )}
      </div>

      {/* Input Area */}
      <form
        onSubmit={handleSendMessage}
        className="p-6 bg-white/[0.02] border-t border-white/5 flex gap-4 items-center z-10"
      >
        <div className="flex-grow relative group">
            <span className="absolute left-6 top-1/2 -translate-y-1/2 text-glow/40 text-xs font-black group-focus-within:text-glow transition-colors">&gt;</span>
            <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="ENCODE_TRANSMISSION..."
                className="w-full bg-surface/60 border border-white/5 rounded-2xl py-4 pl-10 pr-6 text-white text-sm placeholder:text-white/10 focus:border-glow/30 focus:bg-surface/80 outline-none transition-all uppercase tracking-widest font-mono"
            />
        </div>
        <button
            disabled={!inputValue.trim() || isSending}
            type="submit"
            className="btn-premium px-8 py-4 flex items-center gap-3"
        >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">SEND</span>
        </button>
      </form>
    </div>
  );
}
