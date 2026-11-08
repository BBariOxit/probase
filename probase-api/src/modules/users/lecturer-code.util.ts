/**
 * Utility to generate sequential lecturer codes in the format GV001, GV002...
 * by checking existing codes in the database and incrementing.
 */
export function nextLecturerCodeFromList(existingCodes: string[]): string {
  const codeSet = new Set(existingCodes.map((c) => c.toUpperCase().trim()));

  let maxNum = 0;
  // Match standard sequential lecturer codes like GV001, GV012, GV100
  const GV_PATTERN = /^GV(\d{1,4})$/i;

  for (const code of codeSet) {
    const match = GV_PATTERN.exec(code);
    if (match) {
      const num = parseInt(match[1], 10);
      // Exclude legacy 6-digit random codes (e.g. GV657467)
      if (num > maxNum && num < 10000) {
        maxNum = num;
      }
    }
  }

  let nextNum = maxNum + 1;
  let candidate = `GV${String(nextNum).padStart(3, '0')}`;

  // Ensure unique guarantee in case candidate already exists
  while (codeSet.has(candidate)) {
    nextNum++;
    candidate = `GV${String(nextNum).padStart(3, '0')}`;
  }

  return candidate;
}
