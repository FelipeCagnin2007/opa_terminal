import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { useAuthContext } from '../../context/AuthContext';
import { Button } from '../atoms/Button';
import { Send, Terminal as TerminalIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function ChatTab() {
  const { profile } = useAuthContext();
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef(null);

  // 1. Fetch initial messages
  useEffect(() => {
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          id,
          content,
          created_at,
          user_id,
          usuarios (nome)
        `)
        .order('created_at', { ascending: true })
        .limit(50);

      if (data) setMessages(data);
    };

    fetchMessages();

    // 2. Setup Realtime subscription
    const channelId = `chat_public_${Math.random().toString(36).slice(2, 7)}`;
    const channel = supabase
      .channel(channelId)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'chat_messages' 
      }, async (payload) => {
        // Fetch the user data for the new message
        const { data: userData } = await supabase
          .from('usuarios')
          .select('nome')
          .eq('id', payload.new.user_id)
          .single();
        
        const newMessage = {
          ...payload.new,
          usuarios: userData
        };

        setMessages(prev => [...prev, newMessage]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // 3. Scroll to bottom
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
      .insert([
        { content: inputValue.trim(), user_id: profile.id }
      ]);

    if (error) {
      console.error("[CHAT] Error sending message:", error);
      alert("ERRO_TRANSMISSÃO: Falha ao enviar dados para o cluster.");
    } else {
      setInputValue("");
    }
    setIsSending(false);
  };

  return (
    <div className="flex flex-col h-[600px] bg-surface/20 border border-border/40 rounded-2xl overflow-hidden backdrop-blur-sm">
      {/* Header */}
      <div className="p-4 border-b border-border/40 bg-black/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
            <TerminalIcon className="w-4 h-4 text-glow" />
            <h3 className="text-xs font-black uppercase tracking-widest text-glow">Protocolo de Comunicação Global</h3>
        </div>
        <div className="flex items-center gap-2 text-[9px] text-accent/50 uppercase font-mono">
            <span className="w-2 h-2 bg-glow rounded-full animate-pulse" />
            LIVE_SYNC_ENABLED
        </div>
      </div>

      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-grow p-6 overflow-y-auto custom-scrollbar flex flex-col gap-4 font-mono text-[13px]"
      >
        {messages.map((msg) => (
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            key={msg.id} 
            className="flex flex-col gap-1"
          >
            <div className="flex items-center gap-2">
                <span className="text-glow font-bold">[{msg.usuarios?.nome || 'ANON'}]</span>
                <span className="text-[10px] text-accent/30">{new Date(msg.created_at).toLocaleTimeString()}</span>
            </div>
            <p className="text-accent/90 break-words pl-4 border-l border-border/20">
                {msg.content}
            </p>
          </motion.div>
        ))}
        
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-accent/20 gap-2 uppercase tracking-tight">
            <p>Nenhuma mensagem no buffer global...</p>
            <p className="text-[9px]">Seja o primeiro a transmitir.</p>
          </div>
        )}
      </div>

      {/* Input Area */}
      <form 
        onSubmit={handleSendMessage}
        className="p-4 bg-black/60 border-t border-border/40 flex gap-4 items-center"
      >
        <div className="flex-grow relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-glow text-xs font-bold">&gt;</span>
            <input 
                type="text" 
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="TRANSMITIR_DADOS..."
                className="w-full bg-surface/40 border border-border/30 rounded-xl py-3 pl-8 pr-4 text-glow placeholder:text-accent/20 focus:border-glow outline-none transition-all uppercase"
            />
        </div>
        <Button 
            disabled={!inputValue.trim() || isSending}
            type="submit"
            className="px-6 h-12 flex items-center gap-2"
        >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">ENVIAR</span>
        </Button>
      </form>
    </div>
  );
}
