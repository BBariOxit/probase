'use client';

import { useState } from 'react';
import {
  CircleHelp,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  TriangleAlert,
} from 'lucide-react';
import { ApiError } from '@/lib/api/client';
import type { CatalogueInput } from '@/lib/api/master-data';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { FormError } from '@/components/shared/form-error';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { LucideIcon } from 'lucide-react';

export interface CatalogueItem {
  id: number;
  name: string;
  code: string;
}

export function CatalogueManager<T extends CatalogueItem>({
  icon,
  title,
  noun,
  codeHint,
  items,
  isPending,
  error,
  usage,
  onCreate,
  onUpdate,
  onDelete,
}: {
  icon: LucideIcon;
  title: string;
  noun: string;
  codeHint: string;
  items: T[] | undefined;
  isPending: boolean;
  error: unknown;
  usage: (item: T) => { count: number; label: string };
  onCreate: (input: CatalogueInput) => Promise<unknown>;
  onUpdate: (input: CatalogueInput & { id: number }) => Promise<unknown>;
  onDelete: (id: number) => Promise<unknown>;
}) {
  const [editing, setEditing] = useState<T | 'new' | null>(null);
  const [deleting, setDeleting] = useState<T | null>(null);

  return (
    /* No width of its own: two of these share a screen, and how much room each
       gets is the page's decision rather than the block's. */
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-heading text-sm font-semibold tracking-tight">
          {title}
        </h2>
        <Button size="sm" onClick={() => setEditing('new')}>
          <Plus />
          Thêm {noun}
        </Button>
      </div>

      {error != null && (
        <p className="text-sm text-destructive">Không tải được danh sách.</p>
      )}

      <div className="overflow-hidden rounded-xl border">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-48">Tên</TableHead>
                <TableHead className="w-28">
                  {/*
                    What the code is for used to be a line of grey text above
                    the table, permanently, for everyone who had already read
                    it. It belongs to this column and to the moment somebody
                    wonders about it.
                  */}
                  <span className="inline-flex items-center gap-1">
                    Mã
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <button
                            type="button"
                            aria-label={`Mã ${noun} dùng để làm gì?`}
                            className="rounded-full text-muted-foreground/70 transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                          />
                        }
                      >
                        <CircleHelp className="size-3.5" />
                      </TooltipTrigger>
                      <TooltipContent
                        side="top"
                        className="max-w-xs text-pretty"
                      >
                        {codeHint} Dùng để đối chiếu khi nhập danh sách, nên đặt
                        ngắn và không đổi về sau.
                      </TooltipContent>
                    </Tooltip>
                  </span>
                </TableHead>
                <TableHead className="w-32">Đang dùng</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items?.map((item) => {
                const used = usage(item);

                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-muted-foreground tabular-nums">
                      {item.code}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {used.count > 0 ? used.label : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Sửa ${item.name}`}
                          onClick={() => setEditing(item)}
                        >
                          <Pencil />
                        </Button>
                        {/*
                          Hidden rather than disabled once something depends on
                          it: a greyed button invites hunting for the trick that
                          enables it, and the count in the column beside it has
                          already given the reason.
                        */}
                        {used.count === 0 && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Xoá ${item.name}`}
                            onClick={() => setDeleting(item)}
                          >
                            <Trash2 />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {isPending && (
          <div className="flex justify-center py-14">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isPending && items?.length === 0 && (
          <EmptyState
            icon={icon}
            title={`Chưa có ${noun} nào.`}
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditing('new')}
              >
                <Plus />
                Thêm {noun} đầu tiên
              </Button>
            }
          />
        )}
      </div>

      {editing && (
        <CatalogueDialog
          noun={noun}
          codeHint={codeHint}
          item={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSubmit={(input) =>
            editing === 'new'
              ? onCreate(input)
              : onUpdate({ ...input, id: editing.id })
          }
        />
      )}

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Xoá ${noun}?`}
        description={`"${deleting?.name}" sẽ bị xoá khỏi danh mục. Không thể hoàn tác.`}
        confirmLabel="Xoá"
        onConfirm={() => onDelete(deleting!.id)}
      />
    </section>
  );
}

function CatalogueDialog({
  noun,
  codeHint,
  item,
  onClose,
  onSubmit,
}: {
  noun: string;
  codeHint: string;
  item: CatalogueItem | null;
  onClose: () => void;
  onSubmit: (input: CatalogueInput) => Promise<unknown>;
}) {
  const [name, setName] = useState(item?.name ?? '');
  const [code, setCode] = useState(item?.code ?? '');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const ready = name.trim() !== '' && code.trim() !== '';

  async function submit() {
    setPending(true);
    setError(null);
    try {
      await onSubmit({ name: name.trim(), code: code.trim() });
      onClose();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Không kết nối được máy chủ',
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open onOpenChange={(next) => !next && !pending && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {item ? `Sửa ${noun}` : `Thêm ${noun}`}
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    aria-label="Ghi chú"
                    className="rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  />
                }
              >
                <CircleHelp className="size-4" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-pretty">
                {item
                  ? 'Đổi mã sẽ ảnh hưởng tới các file nhập danh sách đang dùng mã cũ.'
                  : 'Mã sẽ được viết hoa tự động.'}
              </TooltipContent>
            </Tooltip>
          </DialogTitle>
          <DialogDescription className="sr-only">
            {item ? `Sửa ${noun}` : `Thêm ${noun} mới`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <FormError message={error} />

          <div className="space-y-2">
            <Label htmlFor="catalogue-name">Tên</Label>
            <Input
              id="catalogue-name"
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="catalogue-code">Mã</Label>
            <Input
              id="catalogue-code"
              className="uppercase"
              value={code}
              onChange={(event) => setCode(event.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" disabled={pending} onClick={onClose}>
            Huỷ
          </Button>
          <Button disabled={!ready || pending} onClick={submit}>
            {pending && <Loader2 className="animate-spin" />}
            {item ? 'Lưu' : 'Thêm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
