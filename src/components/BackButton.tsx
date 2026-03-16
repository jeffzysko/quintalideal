import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BackButtonProps {
  /** Fallback path when there's no browser history to go back to */
  fallback: string;
  /** Optional label next to the arrow icon */
  label?: string;
  /** Additional className */
  className?: string;
}

/**
 * Standardised back button with smart navigation:
 * - If the user arrived from within the app, goes back in history.
 * - If they landed directly on this page (no referrer from same origin), navigates to `fallback`.
 */
export function BackButton({ fallback, label, className }: BackButtonProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    // Check if the user navigated here from within the same app
    const hasAppHistory =
      window.history.length > 2 &&
      document.referrer &&
      document.referrer.startsWith(window.location.origin);

    if (hasAppHistory) {
      navigate(-1);
    } else {
      navigate(fallback);
    }
  };

  return (
    <Button
      variant="ghost"
      size={label ? 'sm' : 'icon'}
      onClick={handleBack}
      className={cn(
        'rounded-xl shrink-0 text-muted-foreground hover:text-foreground gap-1.5',
        !label && 'h-8 w-8',
        className,
      )}
      aria-label="Voltar"
    >
      <ArrowLeft className="w-4 h-4" />
      {label && <span>{label}</span>}
    </Button>
  );
}
