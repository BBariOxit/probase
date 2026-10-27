'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  FileText,
  ImageIcon,
  Loader2,
  Trash2,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useActiveSemester,
  useMyEligibleProjectTypes,
} from '@/lib/api/master-data';
import {
  useCreateProposal,
  useUploadProposalAttachment,
} from '@/lib/api/proposals';
import { useRequireRole } from '@/lib/auth/use-require-role';
import { ProposalForm } from '@/components/proposals/proposal-form';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function NewProposalPage() {
  const allowed = useRequireRole('STUDENT');
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const semester = useActiveSemester();
  const { data: projectTypes, isPending } = useMyEligibleProjectTypes(
    semester?.id,
  );
  const create = useCreateProposal();
  const uploadAttachment = useUploadProposalAttachment();
  const [files, setFiles] = useState<File[]>([]);

  if (!allowed) return null;

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    if (!selected.length) return;

    const total = files.length + selected.length;
    if (total > 5) {
      toast.error('Chỉ được đính kèm tối đa 5 tệp.');
      return;
    }

    const oversized = selected.find((f) => f.size > 15 * 1024 * 1024);
    if (oversized) {
      toast.error(`Tệp ${oversized.name} vượt quá 15MB.`);
      return;
    }

    setFiles((prev) => [...prev, ...selected]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2 text-muted-foreground"
        render={<Link href="/student/proposals" />}
      >
        <ArrowLeft />
        Đề xuất của tôi
      </Button>

      {isPending || projectTypes === undefined ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : projectTypes.length === 0 ? (
        // Not an error and not an empty list either: the faculty has opened no
        // round this intake belongs to, and no form on this page could fix it.
        <p className="max-w-2xl rounded-xl border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          Học kỳ này khoa chưa mở loại đồ án nào cho khóa của bạn, nên chưa gửi
          đề xuất được. Nếu bạn nghĩ đây là sai sót, liên hệ giáo vụ khoa.
        </p>
      ) : (
        <ProposalForm
          projectTypes={projectTypes}
          submitLabel="Gửi đề xuất"
          onSubmit={async (values) => {
            const created = await create.mutateAsync(values);
            if (files.length > 0) {
              for (const file of files) {
                try {
                  await uploadAttachment.mutateAsync({
                    id: created.id,
                    file,
                  });
                } catch {
                  toast.error(`Không thể tải lên tệp: ${file.name}`);
                }
              }
            }
            toast.success('Đề xuất đã được gửi thành công.');
            router.push('/student/proposals');
          }}
          onCancel={() => router.push('/student/proposals')}
        >
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-medium">
                  Tài liệu & Hình ảnh đính kèm (Tùy chọn)
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Hỗ trợ PDF, Word (DOCX) hoặc hình ảnh sơ đồ (PNG, JPG, WebP) tối
                  đa 15MB/tệp (tối đa 5 tệp).
                </p>
              </div>

              {files.length < 5 && (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    multiple
                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"
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
        </ProposalForm>
      )}
    </div>
  );
}
