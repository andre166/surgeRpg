import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import catalog from '../data/items.json';
import { armorIconName } from '../ui/itemIcons.js';

const DIR = path.join(__dirname, '../../public/assets/items/armors');

describe('armor icons (scripts/build-armor-icons.mjs)', () => {
  it('every armor of the catalog has its generated icon', () => {
    const missing = catalog.armors.filter((a) => {
      const name = armorIconName(a);
      return !name || !fs.existsSync(path.join(DIR, `${name}.png`));
    });
    expect(missing.map((a) => a.name)).toEqual([]);
  });
});
