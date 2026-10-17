import { describe, it, expect } from 'vitest';
import { areaLineColorIndex, areaLineColor, areaBorderSegments, AREA_LINE_COLORS } from '../core/world/areaLines.js';

describe('area border colours (StageMap_MakeMap.as GetLineColorNum)', () => {
  it('right level is index 6 (±10% of the hero level)', () => {
    expect(areaLineColorIndex(100, 100)).toBe(6);
    expect(areaLineColorIndex(90, 100)).toBe(6);
    expect(areaLineColorIndex(110, 100)).toBe(6);
  });
  it('easier areas get the blue scale', () => {
    expect(areaLineColorIndex(1, 100)).toBe(0); // <= 50% - 15
    expect(areaLineColorIndex(45, 100)).toBe(1); // <= 58% - 12
    expect(areaLineColorIndex(55, 100)).toBe(2);
    expect(areaLineColorIndex(65, 100)).toBe(3);
    expect(areaLineColorIndex(75, 100)).toBe(4);
    expect(areaLineColorIndex(85, 100)).toBe(5);
  });
  it('harder areas get the gold → red scale', () => {
    expect(areaLineColorIndex(111, 100)).toBe(7); // >= 105% + 1
    expect(areaLineColorIndex(119, 100)).toBe(8); // >= 110% + 8 (118 misses: 100 * 1.1 + 8 is 118.00000000000001, in AS3 too)
    expect(areaLineColorIndex(131, 100)).toBe(9);
    expect(areaLineColorIndex(145, 100)).toBe(10);
    expect(areaLineColorIndex(168, 100)).toBe(11);
    expect(areaLineColorIndex(190, 100)).toBe(12); // >= 140% + 50
  });
  it('hard mode always uses index 9', () => {
    expect(areaLineColor(1, 1000, true)).toBe(AREA_LINE_COLORS[9]);
  });
});

describe('area border segments (byougahoukou)', () => {
  it('a single-area map gets a closed inset frame on its outer cells only', () => {
    const segs = areaBorderSegments([[0, 0], [0, 0]], 100, 100, 5);
    // 4 cells, each a corner with 2 sides
    expect(segs.length).toBe(8);
    expect(segs).toContainEqual({ area: 0, x1: 5, y1: 5, x2: 105, y2: 5 }); // top of cell (0,0): start inset, end overshoots
  });
  it('a lone cell is boxed on all four sides with closed corners', () => {
    const segs = areaBorderSegments([[1]], 100, 100, 5);
    expect(segs).toEqual([
      { area: 1, x1: 5, y1: 5, x2: 95, y2: 5 },
      { area: 1, x1: 95, y1: 5, x2: 95, y2: 95 },
      { area: 1, x1: 5, y1: 95, x2: 95, y2: 95 },
      { area: 1, x1: 5, y1: 5, x2: 5, y2: 95 },
    ]);
  });
  it('two areas side by side each draw their own line along the shared edge', () => {
    const segs = areaBorderSegments([[0, 1]], 100, 100, 5);
    expect(segs.filter((s) => s.area === 0).some((s) => s.x1 === 95 && s.x2 === 95)).toBe(true);
    expect(segs.filter((s) => s.area === 1).some((s) => s.x1 === 105 && s.x2 === 105)).toBe(true);
  });
});
