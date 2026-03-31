import { useRef, useState, useCallback } from 'react';
import { motion, useMotionValue, useTransform, animate, PanInfo } from 'framer-motion';
import { Phone, MessageCircle } from 'lucide-react';
import { toWhatsAppPhone } from '@/lib/phone-utils';

const SWIPE_THRESHOLD = 70;

interface SwipeableLeadCardProps {
  children: React.ReactNode;
  leadPhone: string | null;
  leadName: string | null;
}

export function SwipeableLeadCard({ children, leadPhone, leadName }: SwipeableLeadCardProps) {
  const x = useMotionValue(0);
  const [swiped, setSwiped] = useState<'left' | 'right' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Right-side actions (swipe left to reveal): WhatsApp + Ligar
  const rightOpacity = useTransform(x, [-SWIPE_THRESHOLD, -30], [1, 0]);
  const rightScale = useTransform(x, [-SWIPE_THRESHOLD, -20], [1, 0.7]);

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
      // Snap open to reveal actions
      animate(x, -140, { type: 'spring', stiffness: 400, damping: 35 });
      setSwiped('left');
    } else {
      // Snap back
      animate(x, 0, { type: 'spring', stiffness: 400, damping: 35 });
      setSwiped(null);
    }
  }, [x, leadPhone]);

  const handleTap = useCallback(() => {
    if (swiped) {
      animate(x, 0, { type: 'spring', stiffness: 400, damping: 35 });
      setSwiped(null);
    }
  }, [swiped, x]);

  if (!leadPhone) {
    return <>{children}</>;
  }

  return (
    <div ref={containerRef} className="relative overflow-hidden rounded-xl">
      {/* Background action buttons (revealed on swipe left) */}
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

      {/* Swipeable content */}
      <motion.div
        style={{ x }}
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: -140, right: 0 }}
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
