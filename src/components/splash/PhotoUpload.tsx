import { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, X, ArrowRight, ImagePlus, Eye, Lightbulb, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { ExplorerProgress } from './ExplorerProgress';
import { toast } from 'sonner';

interface PhotoUploadProps {
  onNext: (urls: string[]) => void;
  onBack: () => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const photoTips = [
  { icon: '☀️', text: 'Prefira luz natural (durante o dia)' },
  { icon: '📐', text: 'Fotografe de um canto para mostrar toda a área' },
  { icon: '🌿', text: 'Inclua os limites do quintal na foto' },
  { icon: '📏', text: 'Tire de pé, na altura dos olhos' },
];

async function compressImage(file: File, maxWidth = 1920, quality = 0.85): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(new File([blob], file.name, { type: 'image/jpeg' }));
          } else {
            resolve(file);
          }
        },
        'image/jpeg',
        quality
      );
    };
    img.onerror = () => resolve(file);
    img.src = URL.createObjectURL(file);
  });
}

function validateFile(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return `Formato não suportado: ${file.type}. Use JPG, PNG ou WebP.`;
  }
  if (file.size > MAX_FILE_SIZE) {
    return `Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(1)}MB). Máximo: 10MB.`;
  }
  return null;
}

export function PhotoUpload({ onNext, onBack }: PhotoUploadProps) {
  const [photos, setPhotos] = useState<{ file: File; preview: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showTips, setShowTips] = useState(true);
  const [replacingIndex, setReplacingIndex] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const addFiles = useCallback(async (files: File[]) => {
    const remaining = 4 - photos.length;
    const validFiles: File[] = [];
    
    for (const file of files.slice(0, remaining)) {
      const error = validateFile(file);
      if (error) {
        toast.error(error);
        continue;
      }
      const compressed = await compressImage(file);
      validFiles.push(compressed);
    }

    const toAdd = validFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setPhotos(prev => [...prev, ...toAdd]);
  }, [photos.length]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    addFiles(files);
    // Reset input so same file can be selected again
    e.target.value = '';
  }, [addFiles]);

  const removePhoto = (index: number) => {
    setPhotos(prev => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const replacePhoto = (index: number) => {
    setReplacingIndex(index);
    openCamera();
  };

  const openCamera = async () => {
    setShowTips(false);
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      toast.error('Não foi possível acessar a câmera. Verifique as permissões.');
      setShowCamera(false);
      setShowTips(true);
    }
  };

  const closeCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
    setShowTips(true);
    setReplacingIndex(null);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' });
      const preview = URL.createObjectURL(blob);

      if (replacingIndex !== null) {
        setPhotos(prev => {
          URL.revokeObjectURL(prev[replacingIndex].preview);
          const updated = [...prev];
          updated[replacingIndex] = { file, preview };
          return updated;
        });
        setReplacingIndex(null);
      } else {
        setPhotos(prev => [...prev, { file, preview }]);
      }
      closeCamera();
    }, 'image/jpeg', 0.9);
  };

  const handleUpload = async () => {
    if (photos.length === 0) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const photo of photos) {
        const ext = photo.file.name.split('.').pop() || 'jpg';
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
        const { data, error } = await supabase.storage
          .from('quintal-photos')
          .upload(fileName, photo.file, {
            cacheControl: '3600',
            contentType: photo.file.type,
          });
        if (error) throw error;
        const { data: urlData } = supabase.storage
          .from('quintal-photos')
          .getPublicUrl(data.path);
        urls.push(urlData.publicUrl);
      }
      onNext(urls);
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Erro ao enviar fotos. Tente novamente.');
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
      className="min-h-screen flex flex-col px-4 sm:px-6 py-6 sm:py-8 gradient-hero"
    >
      <div className="w-full max-w-lg mx-auto flex-1 flex flex-col">
        <ExplorerProgress currentStep={0} onBack={onBack} />
        <canvas ref={canvasRef} className="hidden" />

        <div className="flex-1 flex flex-col justify-center">
          <AnimatePresence mode="wait">
            {showCamera ? (
              <motion.div
                key="camera"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="glass-card rounded-3xl p-4 flex flex-col items-center gap-4"
              >
                <div className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden bg-black">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-4 border-2 border-dashed border-white/30 rounded-xl" />
                    <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm text-white text-[11px] px-3 py-1.5 rounded-full flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5" />
                      Enquadre todo o quintal
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 w-full justify-center pb-2">
                  <Button
                    onClick={closeCamera}
                    variant="ghost"
                    size="icon"
                    className="w-12 h-12 rounded-full border border-border"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                  <button
                    onClick={capturePhoto}
                    className="w-16 h-16 rounded-full gradient-blue flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform"
                  >
                    <div className="w-14 h-14 rounded-full border-2 border-white/80 flex items-center justify-center">
                      <Camera className="w-6 h-6 text-primary-foreground" />
                    </div>
                  </button>
                  <div className="w-12 h-12" />
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="upload"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
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

                <AnimatePresence>
                  {showTips && photos.length === 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="my-4 p-4 rounded-2xl bg-accent/40 border border-accent"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <Lightbulb className="w-4 h-4 text-primary" />
                        <span className="text-xs font-semibold text-foreground">Dicas para a melhor foto</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {photoTips.map((tip, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 + i * 0.08 }}
                            className="flex items-start gap-2 text-[11px] text-muted-foreground"
                          >
                            <span className="text-sm leading-none mt-0.5">{tip.icon}</span>
                            <span>{tip.text}</span>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="grid grid-cols-2 gap-3 my-4">
                  <AnimatePresence>
                    {photos.map((photo, i) => (
                      <motion.div
                        key={photo.preview}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="relative aspect-square rounded-2xl overflow-hidden border border-border shadow-sm group"
                      >
                        <img src={photo.preview} alt={`Quintal ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                          <button
                            onClick={() => replacePhoto(i)}
                            className="w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow-sm"
                            title="Tirar outra foto"
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-foreground" />
                          </button>
                          <button
                            onClick={() => removePhoto(i)}
                            className="w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow-sm"
                            title="Remover"
                          >
                            <X className="w-3.5 h-3.5 text-destructive" />
                          </button>
                        </div>
                        <button
                          onClick={() => removePhoto(i)}
                          className="absolute top-2 right-2 w-6 h-6 bg-foreground/60 text-background rounded-full flex items-center justify-center group-hover:hidden transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {photos.length < 4 && (
                    <div className="grid gap-2">
                      <button
                        onClick={() => { setReplacingIndex(null); openCamera(); }}
                        className="aspect-[2/1] rounded-2xl border-2 border-dashed border-primary/30 flex flex-col items-center justify-center cursor-pointer hover:bg-primary/5 hover:border-primary/50 transition-all"
                      >
                        <Camera className="w-5 h-5 text-primary/50 mb-0.5" />
                        <span className="text-[10px] text-muted-foreground font-medium">Tirar foto</span>
                      </button>
                      <label className="aspect-[2/1] rounded-2xl border-2 border-dashed border-primary/20 flex flex-col items-center justify-center cursor-pointer hover:bg-accent/30 hover:border-primary/40 transition-all">
                        <ImagePlus className="w-5 h-5 text-primary/35 mb-0.5" />
                        <span className="text-[10px] text-muted-foreground font-medium">Da galeria</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          multiple
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}
                </div>

                <p className="text-[10px] text-muted-foreground text-center mb-5">
                  {photos.length}/4 fotos • JPG, PNG ou WebP • Máx. 10MB
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
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}