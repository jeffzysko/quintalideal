import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';

export function Footer() {
  return (
    <footer className="w-full border-t border-border/40 bg-background/80 backdrop-blur-sm">
      <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
        <p className="text-center sm:text-left">
          Plataforma desenvolvida como uma iniciativa da{' '}
          <span className="font-semibold text-foreground">Hallow Comunicação</span>
        </p>
        <div className="flex items-center gap-4 flex-wrap justify-center">
          <Link to="/termos" className="hover:text-foreground transition-colors underline underline-offset-2">
            Termos de Uso
          </Link>
          <span className="text-border">|</span>
          <Link to="/privacidade" className="hover:text-foreground transition-colors underline underline-offset-2">
            Política de Privacidade
          </Link>
          <span className="text-border">|</span>
          <a
            href="mailto:contato@hallow.com.br"
            className="hover:text-foreground transition-colors underline underline-offset-2 inline-flex items-center gap-1"
          >
            <Mail className="w-3 h-3" />
            Contato DPO
          </a>
        </div>
      </div>
    </footer>
  );
}
