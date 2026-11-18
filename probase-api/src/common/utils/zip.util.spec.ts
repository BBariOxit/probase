import JSZip from 'jszip';
import { buildZipArchive } from './zip.util';

describe('buildZipArchive', () => {
  it('builds a valid PKZIP archive readable by standard unzippers', async () => {
    const zipBuffer = buildZipArchive([
      { name: 'Nhom_01_De_cuong.txt', data: Buffer.from('Xin chào ProBase', 'utf8') },
      { name: 'Nhom_02_File.bin', data: Buffer.from([1, 2, 3, 4, 5]) },
    ]);

    expect(zipBuffer.subarray(0, 4)).toEqual(Buffer.from([0x50, 0x4b, 0x03, 0x04]));

    const parsed = await JSZip.loadAsync(zipBuffer);
    expect(await parsed.file('Nhom_01_De_cuong.txt')?.async('string')).toBe(
      'Xin chào ProBase',
    );
    expect(await parsed.file('Nhom_02_File.bin')?.async('nodebuffer')).toEqual(
      Buffer.from([1, 2, 3, 4, 5]),
    );
  });
});

