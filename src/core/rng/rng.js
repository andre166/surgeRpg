/**
 * Injectable random number source.
 * Every rule in core/ receives an `rng` with `.next()` returning [0, 1),
 * so tests can be deterministic. The default source wraps Math.random.
 */

export function createMathRng() {
  return { next: () => Math.random() };
}

/** mulberry32: small, fast, seedable PRNG (32-bit state). */
export function createSeededRng(seed = 1) {
  let a = seed >>> 0;
  return {
    next() {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    seed() {
      return a;
    },
  };
}

/** Fixed sequence rng for tests: returns the given values in order, then repeats the last one. */
export function createSequenceRng(values) {
  let i = 0;
  return {
    next() {
      const v = values[Math.min(i, values.length - 1)];
      i += 1;
      return v;
    },
  };
}
