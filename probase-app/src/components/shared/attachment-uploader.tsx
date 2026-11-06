'use client';

import { useRef } from 'react';
import { FileText, ImageIcon, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export interface AttachmentUploaderProps {
  files: File[];
  onChange: (files: File[]) => void;
  maxFiles?: number;
  maxSizeMb?: number;
  label?: string;
  hint?: string;
  accept?: string;
}

export function AttachmentUploader({
  files,
  onChange,
  maxFiles = 5,
  maxSizeMb = 15,
  label = 'Tài liệu & Hình ảnh đính kèm (Tùy chọn)',
  hint = `Hỗ trợ PDF, Word (DOCX) hoặc hình ảnh sơ đồ (PNG, JPG, WebP) tối đa ${maxSizeMb}MB/tệp (tối đa ${maxFiles} tệp).`,
  accept = '.pdf,.doc,.docx,.png,.jpg,.jpeg,.webp',
}: AttachmentUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    if (!selected.length) return;

    const total = files.length + selected.length;
    if (total > maxFiles) {
      toast.error(`Chỉ được đính kèm tối đa ${maxFiles} tệp.`);
      return;
    }

    const maxBytes = maxSizeMb * 1024 * 1024;
    const oversized = selected.find((f) => f.size > maxBytes);
    if (oversized) {
      toast.error(`Tệp ${oversized.name} vượt quá ${maxSizeMb}MB.`);
      return;
    }

    onChange([...files, ...selected]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function removeFile(index: number) {
    onChange(files.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-xs font-medium">{label}</Label>
          <p className="text-[11px] text-muted-foreground">{hint}</p>
        </div>

        {files.length < maxFiles && (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              multiple
              accept={accept}
              onChange={handleFileChange}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="size-3.5" />
              Thêm tệp
            </Button>
          </div>
        )}
      </div>

      {files.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {files.map((file, idx) => {
            const isImg = file.type.startsWith('image/');
            return (
              <div
                key={idx}
                className="flex items-center gap-2.5 rounded-lg border bg-card p-2 text-xs"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded border bg-muted text-muted-foreground">
                  {isImg ? (
                    <ImageIcon className="size-4" />
                  ) : (
                    <FileText className="size-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium" title={file.name}>
                    {file.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatBytes(file.size)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground hover:text-destructive"
                  onClick={() => removeFile(idx)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
