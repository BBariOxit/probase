import { toast } from 'sonner';
import { ApiError } from '@/lib/api/client';

export function toastApiError(error: unknown, prefix?: string): void {
  const message = extractErrorMessage(error);
  toast.error(prefix ? `${prefix}: ${message}` : message);
}

export function toastSuccess(message: string): void {
  toast.success(message);
}

export function extractErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Something went wrong. Please try again.';
}
