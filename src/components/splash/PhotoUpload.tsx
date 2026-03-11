import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, X, ArrowRight, ImagePlus, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { ExplorerProgress } from './ExplorerProgress';

interface PhotoUploadProps {
  onNext: (urls: string[]) => void;
  onBack: () => void;
}

export function PhotoUpload({ onNext, onBack }: PhotoUploadProps) {
  const [photos, setPhotos] = useState<{ file: File; preview: string }[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = 4 - photos.length;
    const toAdd = files.slice(0, remaining).map(file => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setPhotos(prev => [...prev, ...toAdd]);
  }, [photos.length]);

  const removePhoto = (index: number) => {
    setPhotos(prev => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleUpload = async () => {
    if (photos.length === 0) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const photo of photos) {
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${photo.file.name.split('.').pop()}`;
        const { data, error } = await supabase.storage
          .from('quintal-photos')
          .upload(fileName, photo.file);
        if (error) throw error;
        const { data: urlData } = supabase.storage
          .from('quintal-photos')
          .getPublicUrl(data.path);
        urls.push(urlData.publicUrl);
      }
      onNext(urls);
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -60 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="min-h-screen flex flex-col px-6 py-8 gradient-hero"
    >
      <div className="w-full max-w-lg mx-auto flex-1 flex flex-col">
        <ExplorerProgress currentStep={0} onBack={onBack} />

        <div className="flex-1 flex flex-col justify-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card rounded-3xl p-8"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl gradient-blue flex items-center justify-center">
                <Camera className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-tight text-foreground">Foto do seu quintal</h2>
                <p className="text-xs text-muted-foreground">Isso ajuda na análise do potencial</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 my-6">
              <AnimatePresence>
                {photos.map((photo, i) => (
                  <motion.div
                    key={photo.preview}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="relative aspect-square rounded-2xl overflow-hidden border border-border shadow-sm"
                  >
                    <img src={photo.preview} alt={`Quintal ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      onClick={() => removePhoto(i)}
                      className="absolute top-2 right-2 w-7 h-7 bg-foreground/70 text-background rounded-full flex items-center justify-center hover:bg-foreground/90 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>

              {photos.length < 4 && (
                <label className="aspect-square rounded-2xl border-2 border-dashed border-primary/25 flex flex-col items-center justify-center cursor-pointer hover:bg-accent/30 hover:border-primary/50 transition-all">
                  <ImagePlus className="w-7 h-7 text-primary/40 mb-1" />
                  <span className="text-[10px] text-muted-foreground font-medium">Adicionar</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            <p className="text-[10px] text-muted-foreground text-center mb-5">
              {photos.length}/4 fotos • JPG ou PNG
            </p>

            <div className="flex gap-3">
              <Button
                onClick={() => onNext([])}
                variant="ghost"
                className="flex-1 py-5 rounded-2xl text-sm text-muted-foreground"
              >
                Pular esta etapa
              </Button>
              <Button
                onClick={handleUpload}
                disabled={photos.length === 0 || uploading}
                className="flex-1 py-5 rounded-2xl text-sm font-semibold gradient-blue hover:opacity-90 transition-all gap-1.5"
              >
                {uploading ? 'Enviando...' : 'Continuar'}
                {!uploading && <ArrowRight className="w-4 h-4" />}
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
