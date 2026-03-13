import { Link } from 'react-router-dom';
import { Waves, MapPin, Trophy, FileText, Shield, Instagram, Code2, HelpCircle } from 'lucide-react';
import logoSplash from '@/assets/logo-splash.png';

export function Footer() {
  return (
    <footer className="w-full border-t border-border/40 bg-background/95 backdrop-blur-md">
      <div className="max-w-5xl mx-auto px-4 py-8 sm:py-10">
        {/* Grid principal */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-1 flex flex-col items-start gap-3">
            <img src={logoSplash} alt="Splash Piscinas" className="w-10 opacity-70" />
            <p className="text-xs text-muted-foreground leading-relaxed max-w-[220px]">
              Essa é uma iniciativa da Hallow Comunicação juntamente com a iGUi Santo Antônio.
            </p>
          </div>

          {/* Explorar */}
          <div className="flex flex-col gap-2">
            <h4 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70 mb-1">
              Explorar
            </h4>
            <FooterLink to="/" icon={<Waves className="w-3.5 h-3.5" />} label="Diagnóstico" />
            <FooterLink to="/ranking" icon={<Trophy className="w-3.5 h-3.5" />} label="Ranking" />
            <FooterLink to="/mapa" icon={<MapPin className="w-3.5 h-3.5" />} label="Mapa de Quintais" />
          </div>

          {/* Legal */}
          <div className="flex flex-col gap-2">
            <h4 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70 mb-1">
              Legal
            </h4>
            <FooterLink to="/termos" icon={<FileText className="w-3.5 h-3.5" />} label="Termos de Uso" />
            <FooterLink to="/privacidade" icon={<Shield className="w-3.5 h-3.5" />} label="Privacidade" />
            <FooterLink to="/docs/webhook" icon={<Code2 className="w-3.5 h-3.5" />} label="API Docs" />
            <FooterLink to="/suporte" icon={<HelpCircle className="w-3.5 h-3.5" />} label="Suporte" />
          </div>

          {/* Redes */}
          <div className="flex flex-col gap-2">
            <h4 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70 mb-1">
              Redes
            </h4>
            <a
              href="https://www.instagram.com/iguisantoantonio"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors group"
            >
              <Instagram className="w-3.5 h-3.5 group-hover:text-pink-500 transition-colors" />
              @iguisantoantonio
            </a>
          </div>
        </div>

        {/* Divider + bottom */}
        <div className="mt-8 pt-5 border-t border-border/30 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-muted-foreground/50">
          <p>
            © {new Date().getFullYear()} Quintal Ideal · Plataforma desenvolvida com ❤️ por{' '}
            <span className="font-semibold text-muted-foreground/70">Hallow Comunicação</span>
          </p>
          <p>Todos os direitos reservados</p>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors group"
    >
      <span className="text-muted-foreground/60 group-hover:text-primary transition-colors">{icon}</span>
      {label}
    </Link>
  );
}
