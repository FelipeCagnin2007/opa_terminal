import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("[SUPABASE] Erro: Variáveis de ambiente VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não encontradas. Verifique o seu arquivo .env e reinicie o servidor (npm run dev).");
} else {
  console.log("[SUPABASE] Configurações detectadas. Inicializando cliente...");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
