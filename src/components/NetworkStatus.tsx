import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Wifi } from 'lucide-react';

export function NetworkStatus() {
  const [online, setOnline] = useState(navigator.onLine);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const goOnline = () => {
      setOnline(true);
      setShowReconnected(true);
      setTimeout(() => setShowReconnected(false), 3000);
    };
    const goOffline = () => {
      setOnline(false);
      setShowReconnected(false);
    };

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  const show = !online || showReconnected;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -40 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed top-0 left-0 right-0 z-[200] flex items-center justify-center gap-2 py-2 text-xs font-medium"
          style={{
            paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.5rem)',
            background: online
              ? 'hsl(152 70% 40%)'
              : 'hsl(0 72% 51%)',
            color: '#fff',
          }}
        >
          {online ? (
            <>
              <Wifi className="w-3.5 h-3.5" />
              Conexão restabelecida
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5" />
              Sem conexão com a internet
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
