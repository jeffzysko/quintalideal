import { useState, useRef, useImperativeHandle, forwardRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Camera, Loader2, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const MAX_FILES = 4;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

interface LeadPhotoUploadProps {
  /** If editing an existing lead, pass its ID and current photos */
  leadId?: string;
  existingPhotos?: (string | null)[];
  /** For new leads (ManualLeadForm), return uploaded URLs */
  onPhotosChange?: (urls: string[]) => void;
  /** Called after successfully saving photos to an existing lead */
  onSaved?: () => void;
  franchiseId: string;
}

export interface LeadPhotoUploadRef {
  uploadAndGetUrls: () => Promise<string[]>;
}

export const LeadPhotoUpload = forwardRef<LeadPhotoUploadRef, LeadPhotoUploadProps>(({
  leadId,
  existingPhotos = [],
  onPhotosChange,
  onSaved,
  franchiseId,
}, ref) => {
  const currentPhotos = existingPhotos.filter(Boolean) as string[];
  const [newFiles, setNewFiles] = useState<{ file: File; preview: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const totalPhotos = currentPhotos.length + newFiles.length;
  const canAddMore = totalPhotos < MAX_FILES;

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const remaining = MAX_FILES - totalPhotos;
    const selected = Array.from(files).slice(0, remaining);

    const valid: { file: File; preview: string }[] = [];
    for (const file of selected) {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        toast.error(`${file.name}: formato não suportado. Use JPG, PNG ou WebP.`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name}: arquivo muito grande (máx 10MB).`);
        continue;
      }
      valid.push({ file, preview: URL.createObjectURL(file) });
    }

    const updated = [...newFiles, ...valid];
    setNewFiles(updated);

    if (!leadId && onPhotosChange) {
      onPhotosChange(updated.map(f => f.preview));
    }
  };

  const removeNew = (index: number) => {
    URL.revokeObjectURL(newFiles[index].preview);
    const updated = newFiles.filter((_, i) => i !== index);
    setNewFiles(updated);
    if (!leadId && onPhotosChange) {
      onPhotosChange(updated.map(f => f.preview));
    }
  };

  const uploadFiles = async (): Promise<string[]> => {
    const urls: string[] = [];
    for (const { file } of newFiles) {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${franchiseId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from('quintal-photos').upload(path, file, {
        cacheControl: '31536000',
        upsert: false,
      });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('quintal-photos').getPublicUrl(path);
      urls.push(urlData.publicUrl);
    }
    return urls;
  };

  const saveToLead = async () => {
    if (!leadId || newFiles.length === 0) return;
    setUploading(true);
    try {
      const urls = await uploadFiles();
      const update: Record<string, string> = {};
      const allPhotos = [...currentPhotos, ...urls];
      allPhotos.forEach((url, i) => {
        if (i < 4) update[`foto${i + 1}`] = url;
      });

      const { error } = await supabase.from('leads').update(update).eq('id', leadId);
      if (error) throw error;

      toast.success('Fotos salvas com sucesso!');
      newFiles.forEach(f => URL.revokeObjectURL(f.preview));
      setNewFiles([]);
      onSaved?.();
    } catch (err) {
      console.error('Photo upload error:', err);
      toast.error('Erro ao enviar fotos. Tente novamente.');
    } finally {
      setUploading(false);
    }
  };

  const uploadAndGetUrls = async (): Promise<string[]> => {
    if (newFiles.length === 0) return [];
    setUploading(true);
    try {
      const urls = await uploadFiles();
      newFiles.forEach(f => URL.revokeObjectURL(f.preview));
      setNewFiles([]);
      return urls;
    } catch (err) {
      console.error('Photo upload error:', err);
      toast.error('Erro ao enviar fotos.');
      return [];
    } finally {
      setUploading(false);
    }
  };

  useImperativeHandle(ref, () => ({
    uploadAndGetUrls,
  }));

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Camera className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium text-foreground">
          Fotos do Quintal
        </span>
        <span className="text-xs text-muted-foreground">
          ({totalPhotos}/{MAX_FILES})
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {currentPhotos.map((url, i) => (
          <div
            key={`existing-${i}`}
            className="relative rounded-xl overflow-hidden border border-border/50 aspect-square"
          >
            <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
          </div>
        ))}

        {newFiles.map((f, i) => (
          <div
            key={`new-${i}`}
            className="relative rounded-xl overflow-hidden border border-primary/30 aspect-square"
          >
            <img src={f.preview} alt={`Nova foto ${i + 1}`} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => removeNew(i)}
              className="absolute top-1.5 right-1.5 bg-destructive text-destructive-foreground rounded-full p-1 shadow-md hover:bg-destructive/90 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}

        {canAddMore && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className={cn(
              'flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed aspect-square transition-colors',
              'border-muted-foreground/20 hover:border-primary/50 hover:bg-primary/5 text-muted-foreground hover:text-primary'
            )}
          >
            <Plus className="w-6 h-6" />
            <span className="text-xs font-medium">Adicionar</span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {leadId && newFiles.length > 0 && (
        <Button
          onClick={saveToLead}
          disabled={uploading}
          size="sm"
          className="w-full rounded-xl"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Camera className="w-4 h-4 mr-2" />}
          {uploading ? 'Enviando...' : `Salvar ${newFiles.length} foto${newFiles.length > 1 ? 's' : ''}`}
        </Button>
      )}
    </div>
  );
});

LeadPhotoUpload.displayName = 'LeadPhotoUpload';

export { type LeadPhotoUploadProps };
