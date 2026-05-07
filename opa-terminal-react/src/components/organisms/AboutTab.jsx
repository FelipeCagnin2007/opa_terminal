import { motion } from 'framer-motion';
import { Zap, BookOpen, Globe, ShieldCheck, Cpu } from 'lucide-react';

export function AboutTab() {
  const team = [
    { name: "Felipe Cagnin", role: "Arquiteto de Sistemas", icon: "🐱👤" },
    { name: "Eduardo", role: "Pesquisador de Protocolos", icon: "📡" },
    { name: "Paulo", role: "Especialista em Criptografia", icon: "🔐" },
    { name: "Cleiton", role: "Engenheiro de Dados", icon: "💾" }
  ];

  return (
    <div className="flex flex-col gap-12 py-8 h-full overflow-y-auto overflow-x-hidden custom-scrollbar pr-2 md:pr-4 w-full">
      {/* Hero Section */}
      <section className="relative px-2 sm:px-0">
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-primary/5 blur-[80px] rounded-full pointer-events-none hidden md:block" />
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 flex items-center justify-center shadow-pop">
            <Cpu className="text-primary w-8 h-8 animate-flicker" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-[0.1em] sm:tracking-[0.3em] text-text-main mb-1">OPA_PROTOCOL</h2>
            <div className="flex items-center gap-3">
              <span className="px-2 py-0.5 bg-primary/10 border border-primary/20 rounded text-[9px] font-black text-primary uppercase tracking-widest">Versão 9.0.4</span>
              <div className="h-px w-12 bg-border" />
              <p className="text-[10px] text-text-muted font-bold tracking-[0.3em] uppercase">SISTEMA_DE_CRIPTOGRAFIA_LÉXICA</p>
            </div>
          </div>
        </div>
        
        <div className="bg-surface-100/40 backdrop-blur-md border border-border p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-main relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
            <Globe className="w-32 h-32" />
          </div>
          <p className="text-sm md:text-lg text-text-main leading-relaxed font-medium max-w-3xl relative z-10 break-words">
            O <span className="text-primary font-bold">OPA Protocol</span> é um motor de criptografia e tradução léxica avançado, operando através de frequências de caracteres e expansão de sufixos. Projetado para máxima segurança e portabilidade, o sistema integra uma estética <span className="text-accent font-bold">Cyber-Noir</span> com uma lógica de processamento em tempo real de alta performance.
          </p>
        </div>
      </section>

      {/* Origin & Concept */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="flex flex-col gap-6">
          <h3 className="text-[10px] font-black uppercase text-primary/60 tracking-[0.5em] flex items-center gap-3">
            <span className="w-2 h-2 bg-primary rounded-full shadow-pop" />
            CONCEITO_E_GÊNESE
          </h3>
          <div className="bg-surface-200/50 border border-border p-6 md:p-8 rounded-3xl h-full">
            <p className="text-sm text-text-muted leading-relaxed mb-4 break-words">
              A arquitetura do projeto nasceu de uma experimentação colaborativa focada em protocolos de segurança e ofuscação de dados. O que inicialmente foi concebido como uma ferramenta de comunicação privada entre o núcleo original de desenvolvedores, evoluiu para uma plataforma robusta de tradução.
            </p>
            <p className="text-sm text-text-muted leading-relaxed italic border-l-2 border-primary/30 pl-4 break-words">
              "A ideia surgiu de uma brincadeira de criptografia entre amigos, e o grupo foi crescendo, incorporando novas visões e especialidades até consolidar o protocolo atual."
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <h3 className="text-[10px] font-black uppercase text-accent/60 tracking-[0.5em] flex items-center gap-3">
            <span className="w-2 h-2 bg-accent rounded-full shadow-pop" />
            INFRAESTRUTURA_TÉCNICA
          </h3>
          <div className="grid grid-cols-1 gap-3">
            {[
              { icon: ShieldCheck, title: "Segurança de Camada Tripla", desc: "Mapeamento base, acentuação e pontuação segregados." },
              { icon: Zap, title: "Processamento Instantâneo", desc: "Motor de tradução otimizado via regex e arrays nativos." },
              { icon: BookOpen, title: "Semântica Portuguesa/Espanhola", desc: "Reconhecimento avançado de diacríticos e caracteres regionais." }
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-4 p-4 bg-surface-200/30 border border-border/50 rounded-2xl hover:bg-surface-200/60 transition-colors">
                <item.icon className="w-5 h-5 text-accent shrink-0 mt-1" />
                <div>
                  <h4 className="text-xs font-black text-text-main uppercase tracking-widest mb-1">{item.title}</h4>
                  <p className="text-[11px] text-text-muted">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Professional Team Section */}
      <section className="flex flex-col gap-8">
        <h3 className="text-[10px] font-black uppercase text-text-muted tracking-[0.5em] text-center">
          NÚCLEO_DE_DESENVOLVIMENTO
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {team.map((member, i) => (
            <div key={i} className="bg-surface-100 border border-border p-6 rounded-3xl flex flex-col items-center text-center group hover:border-primary/40 transition-all duration-500 shadow-main">
              <div className="text-3xl mb-4 grayscale group-hover:grayscale-0 transition-all duration-500 transform group-hover:scale-110">
                {member.icon}
              </div>
              <h4 className="text-sm font-black text-text-main uppercase tracking-widest mb-1">{member.name}</h4>
              <p className="text-[10px] text-primary font-bold uppercase tracking-widest">{member.role}</p>
              <div className="mt-4 w-8 h-0.5 bg-border group-hover:w-16 group-hover:bg-primary/40 transition-all duration-500" />
            </div>
          ))}
        </div>
      </section>

      {/* Technical Footprint */}
      <section className="bg-surface-300/40 border border-border p-6 md:p-8 rounded-[2rem] flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="flex flex-col gap-2">
          <h3 className="text-[10px] font-black text-text-muted uppercase tracking-[0.4em]">LICENÇA_E_TERMOS</h3>
          <p className="text-[11px] text-text-muted/60 max-w-md break-words">
            Este projeto é mantido sob licença de código aberto, destinado exclusivamente a fins educacionais, pesquisa tecnológica e entretenimento.
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[10px] text-text-muted font-black uppercase tracking-widest">Status do Sistema</p>
            <p className="text-xs text-success font-bold uppercase flex items-center justify-end gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse shadow-pop" />
              Sincronizado
            </p>
          </div>
          <a 
            href="https://opa-terminal.vercel.app" 
            target="_blank" 
            rel="noopener noreferrer"
            className="btn-premium px-8"
          >
            TERMINAL_LINK
          </a>
        </div>
      </section>

      {/* Corporate Disclaimer */}
      <footer className="mt-4 pb-8 flex justify-center">
        <p className="text-[9px] text-text-muted/30 font-black uppercase tracking-[0.5em]">
          &copy; 2077 OPA_CORP // PROTOCOL_ESTABLISHED
        </p>
      </footer>
    </div>
  );
}
