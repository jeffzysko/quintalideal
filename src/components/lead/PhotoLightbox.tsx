import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getOptimizedImageUrl } from '@/lib/storage';

interface PhotoLightboxProps {
  photos: string[];
  initialIndex?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PhotoLightbox({ photos, initialIndex = 0, open, onOpenChange }: PhotoLightboxProps) {
  const [index, setIndex] = useState(initialIndex);
  const [zoomed, setZoomed] = useState(false);

  const prev = () => { setIndex(i => (i - 1 + photos.length) % photos.length); setZoomed(false); };
  const next = () => { setIndex(i => (i + 1) % photos.length); setZoomed(false); };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-none overflow-hidden [&>button]:hidden">
        {/* Top bar */}
        <div className="absolute top-0 inset-x-0 z-10 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/60 to-transparent">
          <span className="text-white/70 text-xs font-medium">{index + 1} / {photos.length}</span>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" className="text-white/70 hover:text-white hover:bg-white/10 h-8 w-8" onClick={() => setZoomed(z => !z)}>
              {zoomed ? <ZoomOut className="w-4 h-4" /> : <ZoomIn className="w-4 h-4" />}
            </Button>
            <Button size="icon" variant="ghost" className="text-white/70 hover:text-white hover:bg-white/10 h-8 w-8" onClick={() => onOpenChange(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Image */}
        <div className="flex items-center justify-center w-full h-[80vh] relative">
          <AnimatePresence mode="wait">
            <motion.img
              key={index}
              src={photos[index]}
              alt={`Foto ${index + 1}`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={`max-w-full max-h-full object-contain transition-transform duration-300 ${zoomed ? 'scale-150 cursor-zoom-out' : 'cursor-zoom-in'}`}
              onClick={() => setZoomed(z => !z)}
              draggable={false}
            />
          </AnimatePresence>

          {photos.length > 1 && (
            <>
              <Button
                size="icon"
                variant="ghost"
                className="absolute left-2 top-1/2 -translate-y-1/2 text-white/70 hover:text-white hover:bg-white/10 h-10 w-10 rounded-full"
                onClick={prev}
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-white/70 hover:text-white hover:bg-white/10 h-10 w-10 rounded-full"
                onClick={next}
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </>
          )}
        </div>

        {/* Thumbnails */}
        {photos.length > 1 && (
          <div className="absolute bottom-0 inset-x-0 z-10 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-t from-black/60 to-transparent">
            {photos.map((url, i) => (
              <button
                key={i}
                onClick={() => { setIndex(i); setZoomed(false); }}
                className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${i === index ? 'border-white scale-110' : 'border-white/20 opacity-60 hover:opacity-100'}`}
              >
                <img
                  src={getOptimizedImageUrl(url, 96, 70)}
                  alt=""
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
