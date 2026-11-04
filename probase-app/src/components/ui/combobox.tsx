'use client';

import * as React from 'react';
import { Popover as PopoverPrimitive } from '@base-ui/react/popover';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ComboboxOption {
  value: string;
  label: string;
  subLabel?: string;
  disabled?: boolean;
}

export interface ComboboxProps {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  allLabel?: string;
  allValue?: string;
  className?: string;
  triggerClassName?: string;
  popupClassName?: string;
  disabled?: boolean;
  size?: 'sm' | 'default';
  id?: string;
  'aria-label'?: string;
}

/**
 * Chuẩn hóa chuỗi tiếng Việt: loại bỏ dấu, chuyển 'đ/Đ' -> 'd/D', lower-case
 * Phục vụ tìm kiếm không phân biệt dấu (ví dụ: "binh" -> "Bình", "dinh" -> "Đình")
 */
export function normalizeVietnamese(str: string): string {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, (m) => (m === 'đ' ? 'd' : 'D'))
    .toLowerCase()
    .trim();
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = 'Chọn một mục...',
  searchPlaceholder = 'Tìm kiếm…',
  emptyText = 'Không tìm thấy kết quả phù hợp.',
  allLabel,
  allValue = '',
  className,
  triggerClassName,
  popupClassName,
  disabled = false,
  size = 'sm',
  id,
  'aria-label': ariaLabel,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [highlightedIndex, setHighlightedIndex] = React.useState(0);

  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  // Gộp option "Mọi ..." nếu được cung cấp allLabel
  const allOptions = React.useMemo(() => {
    if (!allLabel) return options;
    return [{ value: allValue, label: allLabel }, ...options];
  }, [allLabel, allValue, options]);

  // Lọc theo tìm kiếm không dấu
  const filteredOptions = React.useMemo(() => {
    const query = normalizeVietnamese(searchQuery);
    if (!query) return allOptions;

    return allOptions.filter((opt) => {
      const normLabel = normalizeVietnamese(opt.label);
      const normSub = opt.subLabel ? normalizeVietnamese(opt.subLabel) : '';
      return normLabel.includes(query) || normSub.includes(query);
    });
  }, [allOptions, searchQuery]);

  // Tìm label hiện tại
  const selectedOption = React.useMemo(
    () => allOptions.find((opt) => String(opt.value) === String(value)),
    [allOptions, value],
  );

  const displayLabel = selectedOption
    ? selectedOption.label
    : (placeholder ?? 'Chọn...');

  const isAllSelected = !value || value === allValue;

  // Khi mở popup: focus vào ô search & reset highlight
  React.useEffect(() => {
    if (open) {
      setSearchQuery('');
      const selectedIdx = filteredOptions.findIndex(
        (opt) => String(opt.value) === String(value),
      );
      setHighlightedIndex(selectedIdx >= 0 ? selectedIdx : 0);
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Cuộn item được highlight vào tầm nhìn khi dùng phím mũi tên
  React.useEffect(() => {
    if (!open || !listRef.current) return;
    const items = listRef.current.querySelectorAll('[data-combobox-item]');
    const targetItem = items[highlightedIndex] as HTMLElement | undefined;
    if (targetItem) {
      targetItem.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex, open]);

  function handleSelect(val: string) {
    onChange(val);
    setOpen(false);
  }

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < filteredOptions.length - 1 ? prev + 1 : 0,
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredOptions.length - 1,
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredOptions[highlightedIndex]) {
        handleSelect(filteredOptions[highlightedIndex].value);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      // Ngăn Escape đóng cả panel cha
      e.stopPropagation();
      setOpen(false);
    }
  }

  return (
    <PopoverPrimitive.Root
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
      }}
    >
      <div className={cn('relative w-full', className)}>
        <PopoverPrimitive.Trigger
          data-slot="combobox-trigger"
          data-combobox-trigger="true"
          disabled={disabled}
          id={id}
          aria-label={ariaLabel ?? displayLabel}
          aria-expanded={open}
          role="combobox"
          className={cn(
            'flex w-full items-center justify-between gap-1.5 rounded-lg border-[1.5px] border-[#c4c9d9] dark:border-neutral-700 bg-white dark:bg-[#141414] py-1.5 pr-2 pl-2.5 text-left transition-colors outline-none select-none hover:bg-slate-50 dark:hover:bg-neutral-800/80 focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer shadow-2xs',
            size === 'sm' ? 'h-8.5 text-xs' : 'h-10 text-sm',
            triggerClassName,
          )}
        >
          <span
            className={cn(
              'block truncate flex-1',
              isAllSelected
                ? 'text-slate-700 dark:text-neutral-300 font-normal'
                : 'text-slate-900 dark:text-neutral-100 font-medium',
            )}
          >
            {displayLabel}
          </span>
          <ChevronDown
            className={cn(
              'pointer-events-none size-4 shrink-0 text-muted-foreground transition-transform duration-200',
              open && 'rotate-180',
            )}
          />
        </PopoverPrimitive.Trigger>

        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Positioner
            className="isolate z-[70] outline-none"
            align="start"
            side="bottom"
            sideOffset={4}
          >
            <PopoverPrimitive.Popup
              data-slot="combobox-content"
              data-combobox-content="true"
              className={cn(
                'z-[70] w-(--anchor-width) min-w-[200px] max-w-sm rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-[#1e1e1e] p-0 text-popover-foreground shadow-xl duration-100 outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 overflow-hidden',
                popupClassName,
              )}
            >
              {/* Ô tìm kiếm sticky ở đầu danh sách */}
              <div className="flex items-center gap-2 px-2.5 py-2 border-b border-slate-100 dark:border-neutral-800 bg-slate-50/70 dark:bg-neutral-900/50">
                <Search className="size-3.5 text-muted-foreground shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleInputKeyDown}
                  placeholder={searchPlaceholder}
                  className="flex-1 bg-transparent text-xs text-slate-900 dark:text-neutral-100 placeholder:text-muted-foreground focus:outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      inputRef.current?.focus();
                    }}
                    className="text-muted-foreground hover:text-primary p-0.5 rounded-sm transition-colors cursor-pointer"
                    aria-label="Xóa ô tìm kiếm"
                  >
                    <X className="size-3" />
                  </button>
                )}
              </div>

              {/* Danh sách các options cuộn được */}
              <div
                ref={listRef}
                role="listbox"
                tabIndex={-1}
                onWheel={(e) => e.stopPropagation()}
                className="max-h-64 overflow-y-auto p-1 text-xs space-y-0.5 scrollbar-thin"
              >
                {filteredOptions.length === 0 ? (
                  <div className="py-6 text-center text-xs text-muted-foreground">
                    {emptyText}
                  </div>
                ) : (
                  filteredOptions.map((option, index) => {
                    const isSelected = String(option.value) === String(value);
                    const isHighlighted = highlightedIndex === index;

                    return (
                      <div
                        key={String(option.value)}
                        data-combobox-item="true"
                        role="option"
                        aria-selected={isSelected}
                        onPointerDown={(e) => {
                          // Prevent input blur before selection is processed
                          e.preventDefault();
                          handleSelect(option.value);
                        }}
                        onClick={() => handleSelect(option.value)}
                        onMouseEnter={() => setHighlightedIndex(index)}
                        className={cn(
                          'relative flex items-center justify-between gap-2 px-2.5 py-2 rounded-md cursor-pointer select-none transition-colors text-xs',
                          isSelected
                            ? 'bg-primary/10 text-primary font-medium dark:bg-primary/20'
                            : isHighlighted
                              ? 'bg-slate-100 text-slate-900 dark:bg-neutral-800 dark:text-neutral-100'
                              : 'text-slate-700 dark:text-neutral-300 hover:bg-slate-50 dark:hover:bg-neutral-800/60',
                        )}
                      >
                        <div className="flex flex-col min-w-0 pr-2">
                          <span className="truncate">{option.label}</span>
                          {option.subLabel && (
                            <span className="text-[10px] text-muted-foreground truncate">
                              {option.subLabel}
                            </span>
                          )}
                        </div>
                        {isSelected && (
                          <Check className="size-3.5 text-primary shrink-0 stroke-[2.5]" />
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </PopoverPrimitive.Popup>
          </PopoverPrimitive.Positioner>
        </PopoverPrimitive.Portal>
      </div>
    </PopoverPrimitive.Root>
  );
}

