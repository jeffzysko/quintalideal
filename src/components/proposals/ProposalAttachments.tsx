import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Paperclip, Trash2, Loader2, FileText, Image, File } from 'lucide-react';
import { toast } from 'sonner';

const MAX_FILES = 3;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

interface Attachment {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  content_type: string;
}

export interface PendingAttachment {
  file_name: string;
  file_path: string;
  file_size: number;
  content_type: string;
}

interface Props {
  proposalId: string | null;
  franchiseId: string;
  readOnly?: boolean;
  onPendingChange?: (pending: PendingAttachment[]) => void;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(contentType: string) {
  if (contentType.startsWith('image/')) return <Image className="w-4 h-4 text-primary" />;
  if (contentType === 'application/pdf') return <FileText className="w-4 h-4 text-destructive" />;
  return <File className="w-4 h-4 text-muted-foreground" />;
}

export function ProposalAttachments({ proposalId, franchiseId, readOnly = false, onPendingChange }: Props) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);

  const totalCount = attachments.length + pendingAttachments.length;

  useEffect(() => {
    if (proposalId) loadAttachments();
  }, [proposalId]);

  useEffect(() => {
    onPendingChange?.(pendingAttachments);
  }, [pendingAttachments, onPendingChange]);

  const loadAttachments = async () => {
    if (!proposalId) return;
    setLoading(true);
    const { data } = await supabase
      .from('proposal_attachments')
      .select('*')
      .eq('proposal_id', proposalId)
      .order('created_at');
    setAttachments((data as Attachment[]) || []);
    setLoading(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    e.target.value = '';

    const remaining = MAX_FILES - totalCount;
    if (remaining <= 0) {
      toast.error(`Limite de ${MAX_FILES} arquivos atingido.`);
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remaining);
    const tempFolder = proposalId || `temp_${crypto.randomUUID()}`;

    for (const file of filesToUpload) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`"${file.name}" excede o limite de 10 MB.`);
        continue;
      }

      setUploading(true);
      try {
        const ext = file.name.split('.').pop() || 'bin';
        const path = `${franchiseId}/${tempFolder}/${crypto.randomUUID()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('proposal-attachments')
          .upload(path, file, { contentType: file.type });
        if (uploadError) throw uploadError;

        if (proposalId) {
          // Save to DB immediately when we have a proposalId
          const { error: dbError } = await supabase
            .from('proposal_attachments')
            .insert({
              proposal_id: proposalId,
              file_name: file.name,
              file_path: path,
              file_size: file.size,
              content_type: file.type || 'application/octet-stream',
            });
          if (dbError) throw dbError;
          toast.success(`"${file.name}" anexado!`);
          await loadAttachments();
        } else {
          // Keep as pending
          setPendingAttachments(prev => [
            ...prev,
            {
              file_name: file.name,
              file_path: path,
              file_size: file.size,
              content_type: file.type || 'application/octet-stream',
            },
          ]);
          toast.success(`"${file.name}" anexado!`);
        }
      } catch (err: any) {
        toast.error(`Erro ao anexar "${file.name}": ${err.message}`);
      } finally {
        setUploading(false);
      }
    }
  };

  const handleDelete = async (att: Attachment) => {
    try {
      await supabase.storage.from('proposal-attachments').remove([att.file_path]);
      await supabase.from('proposal_attachments').delete().eq('id', att.id);
      setAttachments(prev => prev.filter(a => a.id !== att.id));
      toast.success(`"${att.file_name}" removido.`);
    } catch {
      toast.error('Erro ao remover arquivo.');
    }
  };

  const handleDeletePending = async (idx: number) => {
    const att = pendingAttachments[idx];
    try {
      await supabase.storage.from('proposal-attachments').remove([att.file_path]);
      setPendingAttachments(prev => prev.filter((_, i) => i !== idx));
      toast.success(`"${att.file_name}" removido.`);
    } catch {
      toast.error('Erro ao remover arquivo.');
    }
  };

  const getPublicUrl = (path: string) => {
    const { data } = supabase.storage.from('proposal-attachments').getPublicUrl(path);
    return data.publicUrl;
  };

  const allFiles = [
    ...attachments.map(a => ({ ...a, type: 'saved' as const })),
    ...pendingAttachments.map((a, i) => ({ ...a, id: `pending_${i}`, type: 'pending' as const, pendingIdx: i })),
  ];

  return (
    <div className="space-y-3">
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Carregando anexos...
        </div>
      ) : allFiles.length > 0 ? (
        <div className="space-y-2">
          {allFiles.map(att => (
            <div key={att.id} className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/30 px-3 py-2.5 group">
              {getFileIcon(att.content_type)}
              <a
                href={getPublicUrl(att.file_path)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 min-w-0 text-sm font-medium text-foreground hover:text-primary truncate transition-colors"
              >
                {att.file_name}
              </a>
              <span className="text-[11px] text-muted-foreground shrink-0">
                {formatFileSize(att.file_size)}
              </span>
              {!readOnly && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                  onClick={() =>
                    att.type === 'saved'
                      ? handleDelete(att as Attachment)
                      : handleDeletePending((att as any).pendingIdx)
                  }
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      ) : null}

      {!readOnly && totalCount < MAX_FILES && (
        <label className="inline-flex">
          <input
            type="file"
            className="hidden"
            onChange={handleUpload}
            multiple
            disabled={uploading}
          />
          <Button variant="outline" size="sm" className="cursor-pointer" disabled={uploading} asChild>
            <span>
              {uploading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Paperclip className="w-4 h-4 mr-1" />}
              {uploading ? 'Enviando...' : 'Anexar arquivos'}
            </span>
          </Button>
        </label>
      )}

      {!readOnly && (
        <p className="text-[11px] text-muted-foreground">
          Máx. {MAX_FILES} arquivos · 10 MB cada · {totalCount}/{MAX_FILES} usados
        </p>
      )}
    </div>
  );
}
