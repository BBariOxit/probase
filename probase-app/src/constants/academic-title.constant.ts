export interface AcademicTitleOption {
  value: string;
  label: string;
}

export const ACADEMIC_TITLE_OPTIONS: AcademicTitleOption[] = [
  { value: 'ThS.', label: 'Thạc sĩ (ThS.)' },
  { value: 'TS.', label: 'Tiến sĩ (TS.)' },
  { value: 'PGS.TS.', label: 'Phó Giáo sư, Tiến sĩ (PGS.TS.)' },
  { value: 'GS.TS.', label: 'Giáo sư, Tiến sĩ (GS.TS.)' },
  { value: 'ThS.NCS.', label: 'ThS. Nghiên cứu sinh (ThS.NCS.)' },
  { value: 'CN.', label: 'Cử nhân (CN.)' },
  { value: 'KS.', label: 'Kỹ sư (KS.)' },
  { value: '', label: 'Chưa có / Khác' },
];
