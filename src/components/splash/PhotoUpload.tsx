import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, X, ArrowRight, ImagePlus } from 'lucide-react';
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
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="min-h-screen flex flex-col px-6 py-8"
    >
      <ExplorerProgress currentStep={0} onBack={onBack} />

      <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
        <div className="flex items-center gap-3 mb-2">
          <Camera className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold" style={{ fontFamily: 'Montserrat' }}>
            Foto do seu quintal
          </h2>
        </div>
        <p className="text-muted-foreground mb-6">
          Envie uma foto do espaço onde você imagina sua piscina.
        </p>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <AnimatePresence>
            {photos.map((photo, i) => (
              <motion.div
                key={photo.preview}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="relative aspect-square rounded-xl overflow-hidden border-2 border-border"
              >
                <img src={photo.preview} alt={`Quintal ${i + 1}`} className="w-full h-full object-cover" />
                <button
                  onClick={() => removePhoto(i)}
                  className="absolute top-2 right-2 w-7 h-7 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>

          {photos.length < 4 && (
            <label className="aspect-square rounded-xl border-2 border-dashed border-primary/40 flex flex-col items-center justify-center cursor-pointer hover:bg-accent/50 transition-colors">
              <ImagePlus className="w-8 h-8 text-primary/60 mb-1" />
              <span className="text-xs text-muted-foreground">Adicionar</span>
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

        <p className="text-xs text-muted-foreground mb-6 text-center">
          {photos.length}/4 fotos • JPG ou PNG
        </p>

        <Button
          onClick={handleUpload}
          disabled={photos.length === 0 || uploading}
          className="w-full py-6 text-lg rounded-full font-bold"
        >
          {uploading ? 'Enviando...' : 'Continuar'}
          {!uploading && <ArrowRight className="w-5 h-5 ml-2" />}
        </Button>
      </div>
    </motion.div>
  );
}
