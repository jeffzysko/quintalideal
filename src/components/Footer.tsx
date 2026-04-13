import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Waves, MapPin, Trophy, FileText, Shield, Instagram, Code2, HelpCircle, ChevronDown } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useStandalone } from '@/hooks/useStandalone';
import { cn } from '@/lib/utils';
import logoHallow from '@/assets/logo-hallow.png';

export function Footer() {
  const { user } = useAuth();
  const isStandalone = useStandalone();
  const [expanded, setExpanded] = useState(false);

  // In PWA standalone mode with a logged-in user, the BottomNav handles navigation — hide footer entirely
  if (isStandalone && user) return null;

  return (
    <footer className="w-full border-t border-border/40 bg-background/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 py-6 sm:py-10">

        {/* ── Desktop: full grid ── */}
        <div className="hidden sm:grid sm:grid-cols-2 md:grid-cols-4 gap-8">
          <BrandBlock />
          <ExploreBlock />
          <LegalBlock />
          <SocialBlock />
        </div>

        {/* ── Mobile: compact layout ── */}
        <div className="sm:hidden">
          {/* Brand + inline links */}
          <div className="flex items-center gap-3 mb-4">
            <img src={logoHallow} alt="Hallow Comunicação" className="w-16 opacity-40 brightness-0 dark:invert" />
            <p className="text-[11px] text-muted-foreground leading-snug flex-1">
              Quintal Ideal — Descubra o potencial do seu quintal.
            </p>
          </div>

          {/* Quick inline links — always visible */}
          <div className="flex flex-wrap gap-x-4 gap-y-2 mb-3">
            <FooterInlineLink to="/termos" label="Termos" />
            <FooterInlineLink to="/privacidade" label="Privacidade" />
            <FooterInlineLink to="/suporte" label="Suporte" />
            <a
              href="https://www.instagram.com/quintalideal"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              <Instagram className="w-3 h-3" />
              Instagram
            </a>
          </div>

          {/* Expandable extra links */}
          <button
            onClick={() => setExpanded(v => !v)}
            className="flex items-center gap-1 text-[11px] text-muted-foreground/70 font-medium mb-2 active:scale-95 transition-transform"
          >
            Mais links
            <ChevronDown className={cn('w-3 h-3 transition-transform', expanded && 'rotate-180')} />
          </button>

          {expanded && (
            <div className="flex flex-wrap gap-x-4 gap-y-2 mb-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <FooterInlineLink to="/" label="Diagnóstico" />
              <FooterInlineLink to="/ranking" label="Ranking" />
              <FooterInlineLink to="/mapa" label="Mapa" />
              <FooterInlineLink to="/docs/webhook" label="API Docs" />
            </div>
          )}
        </div>

        {/* Bottom line */}
        <div className="mt-4 sm:mt-8 pt-4 sm:pt-5 border-t border-border/30 flex flex-col sm:flex-row items-center justify-between gap-1 text-[10px] text-muted-foreground/50">
          <p>
            © {new Date().getFullYear()} Quintal Ideal · Feito com ❤️ por{' '}
            <span className="font-semibold text-muted-foreground/70">Hallow Comunicação</span>
          </p>
          <p>Todos os direitos reservados</p>
        </div>
      </div>
    </footer>
  );
}

/* ── Desktop sub-blocks ── */

function BrandBlock() {
  return (
    <div className="col-span-1 flex flex-col items-start gap-3">
      <img src={logoHallow} alt="Hallow Comunicação" className="w-20 opacity-40 brightness-0 dark:invert" />
      <p className="text-xs text-muted-foreground leading-relaxed max-w-[220px]">
        Quintal Ideal — Descubra o potencial do seu quintal.
      </p>
    </div>
  );
}

function ExploreBlock() {
  return (
    <div className="flex flex-col gap-2">
      <SectionTitle>Explorar</SectionTitle>
      <FooterLink to="/" icon={<Waves className="w-3.5 h-3.5" />} label="Diagnóstico" />
      <FooterLink to="/ranking" icon={<Trophy className="w-3.5 h-3.5" />} label="Ranking" />
      <FooterLink to="/mapa" icon={<MapPin className="w-3.5 h-3.5" />} label="Mapa de Quintais" />
      <FooterLink to="/docs/webhook" icon={<Code2 className="w-3.5 h-3.5" />} label="API Docs" />
      <FooterLink to="/suporte" icon={<HelpCircle className="w-3.5 h-3.5" />} label="Suporte" />
    </div>
  );
}

function LegalBlock() {
  return (
    <div className="flex flex-col gap-2">
      <SectionTitle>Legal</SectionTitle>
      <FooterLink to="/termos" icon={<FileText className="w-3.5 h-3.5" />} label="Termos de Uso" />
      <FooterLink to="/privacidade" icon={<Shield className="w-3.5 h-3.5" />} label="Privacidade" />
    </div>
  );
}

function SocialBlock() {
  return (
    <div className="flex flex-col gap-2">
      <SectionTitle>Redes</SectionTitle>
      <a
        href="https://www.instagram.com/quintalideal"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors group"
      >
        <Instagram className="w-3.5 h-3.5 group-hover:text-pink-500 transition-colors" />
        @quintalideal
      </a>
    </div>
  );
}

/* ── Shared primitives ── */

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70 mb-1">
      {children}
    </h4>
  );
}

function FooterLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors group py-1"
    >
      <span className="text-muted-foreground/60 group-hover:text-primary transition-colors">{icon}</span>
      {label}
    </Link>
  );
}

function FooterInlineLink({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
      {label}
    </Link>
  );
}
