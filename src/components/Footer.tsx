import { Link } from 'react-router-dom';

const APP_VERSION = '2.1';

export function Footer() {
  return (
    <footer className="w-full py-3 px-4 mt-auto border-t border-border/20">
      <p className="text-center text-xs text-muted-foreground/50">
        Quintal Ideal v{APP_VERSION} · © {new Date().getFullYear()} · Todos os direitos reservados
      </p>
    </footer>
  );
}

export function PublicFooter() {
  return (
    <footer className="w-full py-4 px-4 mt-auto border-t border-border/20">
      <div className="max-w-xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
        <p className="text-xs text-muted-foreground/60">
          © {new Date().getFullYear()} Quintal Ideal
        </p>
        <div className="flex items-center gap-3">
          <Link
            to="/privacidade"
            className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
          >
            Privacidade
          </Link>
          <span className="text-muted-foreground/30 text-xs">·</span>
          <Link
            to="/termos"
            className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
          >
            Termos de uso
          </Link>
        </div>
      </div>
    </footer>
  );
}
