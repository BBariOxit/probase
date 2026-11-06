'use client';

import { useEffect, useRef, useState } from 'react';
import { ExternalLink, FileText, ImageIcon, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export interface ExistingAttachment {
  id: number | string;
  name: string;
  url?: string;
  size?: number;
  type?: string;
}

export interface AttachmentUploaderProps {
  files: File[];
  onChange: (files: File[]) => void;
  existingFiles?: ExistingAttachment[];
  onDeleteExisting?: (id: number | string) => void;
  maxFiles?: number;
  maxSizeMb?: number;
  label?: string;
  hint?: string;
  accept?: string;
}

export function AttachmentUploader({
  files,
  onChange,
  existingFiles = [],
  onDeleteExisting,
  maxFiles = 5,
  maxSizeMb = 15,
  label = 'Tài liệu & Hình ảnh đính kèm (Tùy chọn)',
  hint = `Hỗ trợ PDF, Word (DOCX) hoặc hình ảnh sơ đồ (PNG, JPG, WebP) tối đa ${maxSizeMb}MB/tệp (tối đa ${maxFiles} tệp).`,
  accept = '.pdf,.doc,.docx,.png,.jpg,.jpeg,.webp',
}: AttachmentUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const totalCount = existingFiles.length + files.length;

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    if (!selected.length) return;

    if (totalCount + selected.length > maxFiles) {
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

        {totalCount < maxFiles && (
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
              className="h-8 gap-1.5 text-xs font-semibold cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="size-3.5" />
              Thêm tệp
            </Button>
          </div>
        )}
      </div>

      {totalCount > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {/* Tệp đã có từ trước */}
          {existingFiles.map((file) => {
            const isImg =
              file.type?.toLowerCase().includes('image') ||
              /\.(jpg|jpeg|png|webp|gif)$/i.test(file.name);

            return (
              <div
                key={`existing-${file.id}`}
                className="flex items-center gap-2.5 rounded-lg border border-slate-200 dark:border-neutral-800 bg-slate-50/70 dark:bg-neutral-900/50 p-2.5 text-xs shadow-2xs"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-muted-foreground overflow-hidden">
                  {isImg && file.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={file.url}
                      alt={file.name}
                      className="size-full object-cover"
                    />
                  ) : isImg ? (
                    <ImageIcon className="size-4 text-primary" />
                  ) : (
                    <FileText className="size-4 text-primary" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    {file.url ? (
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate font-medium text-slate-800 dark:text-neutral-200 hover:text-primary transition-colors flex items-center gap-1"
                        title={file.name}
                      >
                        <span className="truncate">{file.name}</span>
                        <ExternalLink className="size-3 shrink-0 opacity-60" />
                      </a>
                    ) : (
                      <p className="truncate font-medium text-slate-800 dark:text-neutral-200" title={file.name}>
                        {file.name}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {file.size ? (
                      <span className="text-[11px] text-muted-foreground">
                        {formatBytes(file.size)}
                      </span>
                    ) : null}
                    <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-slate-200 dark:bg-neutral-700 text-slate-700 dark:text-neutral-300">
                      Đã đính kèm
                    </span>
                  </div>
                </div>

                {onDeleteExisting && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground hover:text-destructive cursor-pointer"
                    onClick={() => onDeleteExisting(file.id)}
                    title="Xoá tệp đính kèm này"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
              </div>
            );
          })}

          {/* Tệp mới chọn để tải lên */}
          {files.map((file, idx) => {
            const isImg = file.type.startsWith('image/');

            return (
              <div
                key={`new-${idx}`}
                className="flex items-center gap-2.5 rounded-lg border border-primary/20 bg-primary/5 dark:bg-primary/10 p-2.5 text-xs shadow-2xs"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded border border-primary/20 bg-white dark:bg-neutral-800 text-primary">
                  {isImg ? (
                    <ImageIcon className="size-4" />
                  ) : (
                    <FileText className="size-4" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-900 dark:text-neutral-100" title={file.name}>
                    {file.name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-muted-foreground">
                      {formatBytes(file.size)}
                    </span>
                    <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-primary text-white">
                      Mới
                    </span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground hover:text-destructive cursor-pointer"
                  onClick={() => removeFile(idx)}
                  title="Bỏ tệp này"
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
