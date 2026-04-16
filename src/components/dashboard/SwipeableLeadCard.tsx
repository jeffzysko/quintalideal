import { useRef, useState, useCallback } from 'react';
import { motion, useMotionValue, useTransform, animate, PanInfo } from 'framer-motion';
import { Phone, MessageCircle, Check, ChevronRight } from 'lucide-react';
import { toWhatsAppPhone } from '@/lib/phone-utils';

const SWIPE_THRESHOLD = 70;

interface SwipeableLeadCardProps {
  children: React.ReactNode;
  leadPhone: string | null;
  leadName: string | null;
  onComplete?: () => void;
  onOpen?: () => void;
}

export function SwipeableLeadCard({ children, leadPhone, leadName, onComplete, onOpen }: SwipeableLeadCardProps) {
  const x = useMotionValue(0);
  const [swiped, setSwiped] = useState<'left' | 'right' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Right-side actions (swipe left to reveal)
  const rightOpacity = useTransform(x, [-SWIPE_THRESHOLD, -30], [1, 0]);
  const rightScale = useTransform(x, [-SWIPE_THRESHOLD, -20], [1, 0.7]);
  // Left-side action (swipe right to reveal): mark complete
  const leftOpacity = useTransform(x, [30, SWIPE_THRESHOLD], [0, 1]);
  const leftScale = useTransform(x, [20, SWIPE_THRESHOLD], [0.7, 1]);

  const handleWhatsApp = useCallback(() => {
    if (!leadPhone) return;
    const fullPhone = toWhatsAppPhone(leadPhone);
    const msg = encodeURIComponent(`Olá ${leadName || ''}, tudo bem?`);
    window.open(`https://wa.me/${fullPhone}?text=${msg}`, '_blank');
  }, [leadPhone, leadName]);

  const handleCall = useCallback(() => {
    if (!leadPhone) return;
    const phone = leadPhone.replace(/\D/g, '');
    window.open(`tel:+55${phone}`, '_self');
  }, [leadPhone]);

  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    const offset = info.offset.x;

    if (offset < -SWIPE_THRESHOLD && leadPhone) {
      animate(x, -140, { type: 'spring', stiffness: 400, damping: 35 });
      setSwiped('left');
    } else if (offset > SWIPE_THRESHOLD) {
      // Swipe right: complete or open
      navigator.vibrate?.(50);
      if (onComplete) {
        animate(x, 400, { type: 'spring', stiffness: 300, damping: 30 });
        setTimeout(() => onComplete(), 200);
      } else if (onOpen) {
        animate(x, 0, { type: 'spring', stiffness: 400, damping: 35 });
        setSwiped(null);
        onOpen();
      } else {
        animate(x, 0, { type: 'spring', stiffness: 400, damping: 35 });
        setSwiped(null);
      }
    } else {
      animate(x, 0, { type: 'spring', stiffness: 400, damping: 35 });
      setSwiped(null);
    }
  }, [x, leadPhone, onComplete, onOpen]);

  const handleTap = useCallback(() => {
    if (swiped) {
      animate(x, 0, { type: 'spring', stiffness: 400, damping: 35 });
      setSwiped(null);
    }
  }, [swiped, x]);

  if (!leadPhone && !onComplete && !onOpen) {
    return <>{children}</>;
  }

  const dragLeftLimit = leadPhone ? -140 : 0;
  const dragRightLimit = onComplete || onOpen ? 140 : 0;

  return (
    <div ref={containerRef} className="relative overflow-hidden rounded-xl">
      {/* Left action (revealed on swipe right): Mark complete / Open */}
      {(onComplete || onOpen) && (
        <motion.div
          className="absolute inset-y-0 left-0 flex items-stretch z-0"
          style={{ opacity: leftOpacity, scale: leftScale }}
        >
          <div
            className={`flex flex-col items-center justify-center w-[70px] gap-1 ${
              onComplete ? 'bg-emerald-500 text-white' : 'bg-primary text-primary-foreground'
            }`}
            aria-label={onComplete ? 'Concluir' : 'Abrir'}
          >
            {onComplete ? <Check className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            <span className="text-[9px] font-bold">{onComplete ? 'Concluir' : 'Abrir'}</span>
          </div>
        </motion.div>
      )}

      {/* Right actions (revealed on swipe left): WhatsApp + Call */}
      {leadPhone && (
        <motion.div
          className="absolute inset-y-0 right-0 flex items-stretch z-0"
          style={{ opacity: rightOpacity, scale: rightScale }}
        >
          <button
            onClick={handleWhatsApp}
            className="flex flex-col items-center justify-center w-[70px] bg-emerald-500 text-white gap-1 active:bg-emerald-600 transition-colors"
            aria-label="WhatsApp"
          >
            <MessageCircle className="w-5 h-5" />
            <span className="text-[9px] font-bold">WhatsApp</span>
          </button>
          <button
            onClick={handleCall}
            className="flex flex-col items-center justify-center w-[70px] bg-primary text-primary-foreground gap-1 active:opacity-80 transition-colors"
            aria-label="Ligar"
          >
            <Phone className="w-5 h-5" />
            <span className="text-[9px] font-bold">Ligar</span>
          </button>
        </motion.div>
      )}

      {/* Swipeable content */}
      <motion.div
        style={{ x }}
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: dragLeftLimit, right: dragRightLimit }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        onTap={handleTap}
        className="relative z-10 bg-card"
      >
        {children}
      </motion.div>
    </div>
  );
}
