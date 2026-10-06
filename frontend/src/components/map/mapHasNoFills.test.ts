/** The jobs map draws boundaries, not blocks of colour.
 *
 *  Every region was filled with a colour of its own and every district with
 *  another, so twelve areas of colour sat over the map a person is reading to
 *  place a job — hiding the roads and towns underneath it.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const MAP_DIR = path.resolve(__dirname);

const layerFiles = () =>
  fs.readdirSync(MAP_DIR)
    .filter(f => /\.tsx?$/.test(f) && !f.includes('.test.'))
    .filter(f => !f.includes('regionOutlineStyle'))
    .map(f => path.join(MAP_DIR, f));

const code = (file: string) =>
  fs.readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

describe('the map layers', () => {
  it('fill no polygon', () => {
    const offenders: string[] = [];
    for (const file of layerFiles()) {
      code(file).split('\n').forEach((line, i) => {
        if (/fillColor|fill:\s*true/.test(line) || /fillOpacity:\s*(?!0\b)[0-9.]/.test(line)) {
          offenders.push(`${path.basename(file)}:${i + 1}  ${line.trim().slice(0, 60)}`);
        }
      });
    }
    expect(offenders, offenders.join('\n')).toEqual([]);
  });

  it('gives no layer a colour of its own', () => {
    // `getDistrictColor` returned one of twelve; nothing should call it.
    const callers = layerFiles().filter(f => /getDistrictColor\(/.test(code(f)));
    expect(callers.map(f => path.basename(f))).toEqual([]);
  });

  it('scans a realistic number of map files', () => {
    expect(layerFiles().length).toBeGreaterThan(8);
  });
});
