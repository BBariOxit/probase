const FORMULA_TRIGGER_RE = /^[=+\-@\t\r]/;

/**
 * Strips C0 control characters disallowed by XML 1.0 (keeping \t, \n, \r).
 */
function stripIllegalXmlControlChars(input: string): string {
  let result = '';
  for (let i = 0; i < input.length; i += 1) {
    const code = input.charCodeAt(i);
    const allowedWhitespace = code === 0x09 || code === 0x0a || code === 0x0d;
    const isIllegalControl = (code < 0x20 && !allowedWhitespace) || code === 0x7f;
    if (!isIllegalControl) {
      result += input[i];
    }
  }
  return result;
}

/**
 * Neutralizes spreadsheet formula injection (CWE-1236) and strips control
 * characters that would corrupt OOXML worksheets.
 */
export function sanitizeSpreadsheetText(
  value: string | null | undefined,
): string {
  if (value === null || value === undefined) return '';

  const cleaned = stripIllegalXmlControlChars(String(value)).trim();
  if (!cleaned) return '';

  return FORMULA_TRIGGER_RE.test(cleaned) ? `'${cleaned}` : cleaned;
}

/**
 * Produces an ASCII-only filename safe for Content-Disposition headers without
 * path traversal, quotes, or header-injection characters.
 */
export function sanitizeExportFilename(
  baseName: string,
  extension = 'xlsx',
): string {
  const ascii = baseName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();

  const cleanExt =
    extension.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'xlsx';
  return `${ascii || 'export'}.${cleanExt}`;
}
