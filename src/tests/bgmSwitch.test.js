import { describe, it, expect, vi, beforeAll } from 'vitest';

/**
 * Fake WebAudio: every node accepts any call; gain nodes remember their gain ramps and what was
 * connected into them, so the test can see which lane the notes go to.
 */
function fakeAudio() {
  const gains = [];
  const filters = [];
  const param = () => ({ value: 0, ramps: [], setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime(v) { this.ramps.push(v); } });
  const node = (extra = {}) => ({ inputs: 0, connect(n) { if (n) n.inputs = (n.inputs ?? 0) + 1; return n; }, disconnect() {}, start() {}, stop() {}, ...extra });
  class Ctx {
    constructor() { this.state = 'running'; this.sampleRate = 1000; this.destination = node(); }
    get currentTime() { return Date.now() / 1000; } // follows vi's fake timers
    resume() { return Promise.resolve(); }
    createGain() { const g = node({ gain: param() }); gains.push(g); return g; }
    createOscillator() { return node({ frequency: param(), detune: param(), type: 'sine' }); }
    createBiquadFilter() { const f = node({ frequency: param(), Q: param(), type: 'lowpass' }); filters.push(f); return f; }
    createDelay() { return node({ delayTime: param() }); }
    createBuffer(ch, n) { return { getChannelData: () => new Float32Array(n) }; }
    createBufferSource() { return node({ buffer: null, playbackRate: param() }); }
  }
  return { Ctx, gains, filters };
}

let fake; // shared by both suites: audio.js keeps the AudioContext it made first

describe('music track switch', () => {
  let bgm;
  beforeAll(async () => {
    vi.useFakeTimers();
    fake = fakeAudio();
    globalThis.window = { AudioContext: fake.Ctx };
    ({ bgm } = await import('../game/systems/audio.js'));
  });

  it('cuts the old loop (its queued notes) and starts the new one right away', () => {
    bgm.setEnabled(true);
    // lane masters: gains that notes connect into (a note's own gain connects into its lane)
    const laneOf = () => fake.gains.filter((g) => g.inputs > 5);
    const before = laneOf();
    expect(before).toHaveLength(1); // the main loop is playing through one lane
    const mainLane = before[0];
    const mainInputs = mainLane.inputs;

    bgm.setTrack('battle');
    expect(mainLane.gain.ramps).toContain(0); // old lane faded to silence at once
    const after = laneOf().filter((g) => g !== mainLane);
    expect(after).toHaveLength(1); // the battle loop got its own lane, scheduled immediately
    expect(mainLane.inputs).toBe(mainInputs); // nothing new goes to the old lane

    bgm.setEnabled(false);
    expect(after[0].gain.ramps).toContain(0); // turning music off stops it now too
  });
});

describe('victory track', () => {
  it('plays the fanfare once, then loops from after it', async () => {
    const { bgm } = await import('../game/systems/audio.js');
    bgm.setEnabled(true);
    const from = fake.filters.length;
    bgm.setTrack('victory');
    // ~2 minutes of music (the loop repeats several times): the fanfare's crash (band-pass at
    // 6 kHz, Q 0.3) is heard exactly once
    for (let i = 0; i < 1200; i += 1) vi.advanceTimersByTime(100);
    const crashes = fake.filters.slice(from).filter((f) => f.type === 'bandpass' && f.frequency.value === 6000 && f.Q.value === 0.3);
    expect(crashes).toHaveLength(1);
    bgm.setTrack('main');
    bgm.setEnabled(false);
  });
});
