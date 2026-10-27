'use client';

import { useRef, useState } from 'react';
import {
  ExternalLink,
  FileText,
  ImageIcon,
  Loader2,
  Trash2,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import type { ProposalAttachment } from '@/lib/api/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface ProposalAttachmentsProps {
  attachments: ProposalAttachment[];
  canManage?: boolean;
  onUpload?: (file: File) => Promise<unknown>;
  onDelete?: (attachmentId: number) => Promise<unknown>;
  maxAttachments?: number;
}

export function ProposalAttachments({
  attachments = [],
  canManage = false,
  onUpload,
  onDelete,
  maxAttachments = 5,
}: ProposalAttachmentsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [previewImage, setPreviewImage] = useState<ProposalAttachment | null>(
    null,
  );

  async function handleFileSelected(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    if (!file || !onUpload) return;

    if (attachments.length >= maxAttachments) {
      toast.error(`Đã đạt giới hạn tối đa ${maxAttachments} tệp đính kèm.`);
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      toast.error('Tệp vượt quá 15MB. Vui lòng chọn tệp nhỏ hơn.');
      return;
    }

    setIsUploading(true);
    try {
      await onUpload(file);
      toast.success(`Đã đính kèm tệp: ${file.name}`);
    } catch {
      toast.error('Không thể tải tệp lên. Vui lòng thử lại.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  async function handleDelete(id: number) {
    if (!onDelete) return;
    setDeletingId(id);
    try {
      await onDelete(id);
      toast.success('Đã xoá tệp đính kèm.');
    } catch {
      toast.error('Không thể xoá tệp. Vui lòng thử lại.');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-medium text-muted-foreground">
          Tài liệu & Hình ảnh đính kèm ({attachments.length}/{maxAttachments})
        </h4>

        {canManage && onUpload && attachments.length < maxAttachments && (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"
              onChange={handleFileSelected}
              disabled={isUploading}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {isUploading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Upload className="size-3.5" />
              )}
              Thêm tệp / ảnh
            </Button>
          </div>
        )}
      </div>

      {attachments.length === 0 ? (
        <p className="rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground">
          Chưa có tệp tài liệu hoặc hình ảnh minh hoạ nào được đính kèm.
        </p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="group relative flex items-center gap-3 rounded-lg border bg-card p-2.5 transition-colors hover:border-foreground/20 hover:bg-muted/30"
            >
              {att.fileType === 'IMAGE' ? (
                <button
                  type="button"
                  onClick={() => setPreviewImage(att)}
                  className="relative size-12 shrink-0 overflow-hidden rounded-md border bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  title="Nhấn để xem phóng to"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={att.fileUrl}
                    alt={att.fileName}
                    className="size-full object-cover transition-transform group-hover:scale-105"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
                    <ImageIcon className="size-4 text-white" />
                  </div>
                </button>
              ) : (
                <a
                  href={att.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex size-12 shrink-0 items-center justify-center rounded-md border bg-muted text-muted-foreground transition-colors hover:text-foreground"
                  title="Mở tài liệu"
                >
                  <FileText className="size-6" />
                </a>
              )}

              <div className="min-w-0 flex-1">
                <a
                  href={att.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="block truncate text-xs font-medium hover:underline"
                  title={att.fileName}
                >
                  {att.fileName}
                </a>
                <span className="text-[11px] text-muted-foreground">
                  {formatBytes(att.fileSize)} ·{' '}
                  {att.fileType === 'IMAGE' ? 'Hình ảnh' : 'Tài liệu'}
                </span>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <a
                  href={att.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  title="Mở trong tab mới"
                >
                  <ExternalLink className="size-3.5" />
                </a>

                {canManage && onDelete && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground hover:text-destructive"
                    disabled={deletingId === att.id}
                    onClick={() => handleDelete(att.id)}
                    title="Xoá tệp"
                  >
                    {deletingId === att.id ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="size-3.5" />
                    )}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Image preview modal */}
      {previewImage && (
        <Dialog
          open={!!previewImage}
          onOpenChange={(open) => !open && setPreviewImage(null)}
        >
          <DialogContent className="max-w-3xl overflow-hidden p-3">
            <DialogHeader className="px-2 pb-2">
              <DialogTitle className="truncate text-sm font-medium">
                {previewImage.fileName}
              </DialogTitle>
            </DialogHeader>
            <div className="flex max-h-[80vh] items-center justify-center overflow-auto rounded-lg bg-black/5 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewImage.fileUrl}
                alt={previewImage.fileName}
                className="max-h-[75vh] w-auto max-w-full rounded object-contain"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
