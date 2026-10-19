/**
 * Tiny synthesized sound effects (WebAudio). No external assets, no licensing.
 * Volume is controlled from the options screen through setVolume().
 */
let ctx = null;
let volume = 1;
/** Abyssal mode pick (sfx.abyss): its deep drone was much louder than the other effects, so it plays at 25%. */
const ABYSS_GAIN = 0.25;

function ac() {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

let outputBoost = 1;
let output = null;

/**
 * Master output every sound goes through. With a boost (phone speakers are much quieter
 * than desktop ones) it feeds a limiter, so stacked effects get louder without clipping.
 */
function outputNode(c) {
  if (!output) {
    output = c.createGain();
    output.gain.value = outputBoost;
    if (outputBoost > 1) {
      const limiter = c.createDynamicsCompressor();
      limiter.threshold.value = -10;
      limiter.knee.value = 6;
      limiter.ratio.value = 12;
      limiter.attack.value = 0.003;
      limiter.release.value = 0.2;
      output.connect(limiter).connect(c.destination);
    } else {
      output.connect(c.destination);
    }
  }
  return output;
}

/** Overall loudness multiplier for the platform; call before the first sound plays. */
export function setOutputBoost(k) {
  outputBoost = Math.max(1, Number(k) || 1);
}

/** One synthesized note; `at` delays it (seconds) on the audio clock, so short phrases stay tight. */
function tone({ freq = 440, type = 'square', dur = 0.12, gain = 0.2, slide = 0, at = 0 }) {
  const c = ac();
  if (!c || volume <= 0) return;
  const t0 = c.currentTime + at;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
  g.gain.setValueAtTime(gain * volume, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(outputNode(c));
  o.start(t0);
  o.stop(t0 + dur);
}

export const sfx = {
  setVolume(v) {
    volume = Math.max(0, Math.min(1, v));
  },
  hit(critical) {
    tone({ freq: critical ? 220 : 160, type: 'sawtooth', dur: critical ? 0.22 : 0.12, gain: critical ? 0.3 : 0.2, slide: -120 });
    if (critical) tone({ freq: 880, type: 'square', dur: 0.1, gain: 0.12 });
  },
  hurt() {
    tone({ freq: 110, type: 'triangle', dur: 0.18, gain: 0.25, slide: -60 });
  },
  heal() {
    tone({ freq: 523, type: 'sine', dur: 0.25, gain: 0.2, slide: 300 });
  },
  start() {
    tone({ freq: 330, type: 'square', dur: 0.08, gain: 0.15 });
    setTimeout(() => tone({ freq: 440, type: 'square', dur: 0.1, gain: 0.15 }), 90);
  },
  levelUp() {
    [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone({ freq: f, type: 'triangle', dur: 0.14, gain: 0.18 }), i * 80));
  },
  click() {
    tone({ freq: 600, type: 'sine', dur: 0.05, gain: 0.08 });
  },
  /*
   * Menu sounds in the spirit of classic JRPG menus, synthesized from scratch (plain square /
   * triangle notes, our own pitches): a short cursor blip, a rising confirm, a falling cancel
   * and a low buzz for something that cannot be chosen.
   */
  cursor() {
    tone({ freq: 1568, type: 'square', dur: 0.035, gain: 0.05 });
    tone({ freq: 2093, type: 'square', dur: 0.03, gain: 0.04, at: 0.025 });
  },
  confirm() {
    tone({ freq: 988, type: 'square', dur: 0.06, gain: 0.06 });
    tone({ freq: 1319, type: 'square', dur: 0.1, gain: 0.06, at: 0.05 });
    tone({ freq: 1319, type: 'triangle', dur: 0.14, gain: 0.05, at: 0.05 });
  },
  cancel() {
    tone({ freq: 1175, type: 'square', dur: 0.05, gain: 0.05 });
    tone({ freq: 784, type: 'square', dur: 0.09, gain: 0.05, at: 0.045 });
  },
  buzzer() {
    tone({ freq: 140, type: 'square', dur: 0.12, gain: 0.07 });
    tone({ freq: 132, type: 'sawtooth', dur: 0.12, gain: 0.05, at: 0.01 });
  },
  /*
   * Loot roulette (result screen), three stages: while it spins, a rising whoosh (reelSpin) under
   * a tick per step (reelTick, climbing as it slows); when it lands, a heavy clack and a snare
   * drumroll swelling into the reveal (reelStop); then the reveal itself (loot).
   */
  reelSpin(dur = 1.5) {
    tone({ freq: 160, type: 'sawtooth', dur, gain: 0.035, slide: 520 });
    tone({ freq: 320, type: 'triangle', dur, gain: 0.05, slide: 1040 });
  },
  reelTick(p = 0) {
    tone({ freq: 900 + p * 900, type: 'square', dur: 0.03, gain: 0.07 });
    tone({ freq: 1800 + p * 1800, type: 'sine', dur: 0.05, gain: 0.04, at: 0.01 });
    tone({ freq: 160, type: 'triangle', dur: 0.04, gain: 0.08 });
  },
  reelStop(suspense = 0.45) {
    // clack: low thump + bright click
    tone({ freq: 90, type: 'triangle', dur: 0.2, gain: 0.3, slide: -40 });
    tone({ freq: 2400, type: 'square', dur: 0.03, gain: 0.08 });
    // drumroll: quick ticks getting louder, under a held suspense note that bends up
    const n = Math.max(4, Math.round(suspense / 0.035));
    for (let i = 0; i < n; i += 1) tone({ freq: 220 + (i % 2) * 30, type: 'square', dur: 0.025, gain: 0.03 + (i / n) * 0.07, at: 0.08 + i * 0.035 });
    tone({ freq: 392, type: 'triangle', dur: suspense + 0.05, gain: 0.07, slide: 120, at: 0.05 });
  },
  /*
   * Item drop on the result screen: a burst and shimmer, then a rising chime that grows with the
   * rarity ('rare' | 'epic' | 'legendary'); legendary ends on a held major chord over a low root.
   */
  loot(tier = 'rare') {
    // burst: a falling whoosh and a high shimmer as the item pops out
    tone({ freq: 1400, type: 'sawtooth', dur: 0.25, gain: 0.05, slide: -1100 });
    [3520, 4186, 4699, 5274].forEach((f, i) => tone({ freq: f, type: 'sine', dur: 0.3, gain: 0.03, at: i * 0.03 }));
    // sparkle: quick high glints
    [2637, 3136, 3520].forEach((f, i) => tone({ freq: f, type: 'sine', dur: 0.08, gain: 0.05, at: i * 0.04 }));
    // the chime: C - E - G - C, a fifth higher for epic and legendary
    const lift = tier === 'rare' ? 1 : 1.5;
    [523, 659, 784, 1046].forEach((f, i) => {
      tone({ freq: f * lift, type: 'triangle', dur: 0.18, gain: 0.16, at: 0.14 + i * 0.08 });
      tone({ freq: f * lift * 2, type: 'sine', dur: 0.12, gain: 0.04, at: 0.14 + i * 0.08 });
    });
    if (tier === 'rare') return;
    // epic: a second, higher answer
    [1175, 1568, 2093].forEach((f, i) => tone({ freq: f, type: 'square', dur: 0.1, gain: 0.05, at: 0.5 + i * 0.07 }));
    if (tier !== 'legendary') return;
    // legendary: held major chord, low root and a last sparkle
    [784, 988, 1175, 1568].forEach((f) => tone({ freq: f, type: 'triangle', dur: 0.9, gain: 0.09, at: 0.74 }));
    tone({ freq: 196, type: 'sawtooth', dur: 0.8, gain: 0.08, at: 0.74 });
    tone({ freq: 98, type: 'triangle', dur: 0.9, gain: 0.18, at: 0.74 });
    [3136, 3951, 4699].forEach((f, i) => tone({ freq: f, type: 'sine', dur: 0.1, gain: 0.04, at: 0.9 + i * 0.06 }));
  },
  /** Abyssal mode chosen: a deep drone under a dissonant cluster, sinking like something stirring below. */
  abyss() {
    const k = ABYSS_GAIN;
    tone({ freq: 55, type: 'sawtooth', dur: 1.6, gain: 0.12 * k, slide: -18 });
    tone({ freq: 41, type: 'sine', dur: 1.8, gain: 0.25 * k, slide: -10 });
    [[233, 0.05], [247, 0.1], [370, 0.18]].forEach(([f, at]) => tone({ freq: f, type: 'triangle', dur: 1.2, gain: 0.05 * k, slide: -f * 0.25, at }));
    tone({ freq: 1800, type: 'sine', dur: 0.9, gain: 0.015 * k, slide: -1500, at: 0.2 });
  },
  /** A found relic's shadow beating like a heart (ResultScreen): lub-dub thumps, deeper and louder with `p` (0..1). */
  relicPulse(p = 0) {
    const k = ABYSS_GAIN;
    tone({ freq: 62 - p * 10, type: 'sine', dur: 0.22, gain: (0.3 + p * 0.2) * k, slide: -20 });
    tone({ freq: 52 - p * 8, type: 'sine', dur: 0.26, gain: (0.24 + p * 0.2) * k, slide: -16, at: 0.16 });
    tone({ freq: 311, type: 'triangle', dur: 0.4, gain: 0.03 * k, slide: -90 });
  },
  /** Battle lost (result screen): a short falling minor sting over a low thud. */
  defeat() {
    tone({ freq: 110, type: 'triangle', dur: 0.3, gain: 0.25, slide: -50 });
    [[440, 0], [415, 0.16], [349, 0.32], [294, 0.5]].forEach(([f, at]) => {
      tone({ freq: f, type: 'square', dur: at === 0.5 ? 0.6 : 0.15, gain: 0.06, at });
      tone({ freq: f / 2, type: 'triangle', dur: at === 0.5 ? 0.6 : 0.15, gain: 0.12, at });
    });
  },
  gameOver() {
    [392, 330, 262, 196].forEach((f, i) => setTimeout(() => tone({ freq: f, type: 'triangle', dur: 0.3, gain: 0.2 }), i * 180));
  },
};

/**
 * Background music: a cozy, upbeat lo-fi chiptune loop, synthesized on the fly (no assets,
 * original composition). 16 bars in C major at ~96 BPM with a light swing:
 *   A (bars 1-8)  theme over Cmaj7 - Am7 - Fmaj7 - G7 - Em7 - Am7 - Dm7 - G7
 *   B (bars 9-16) a brighter, higher chorus that lifts and resolves back home on C.
 * Layers: soft chord pad, warm bass, echoing lead, gentle drums (noise hats / clap, sine
 * kick) and a sparkle arpeggio in the chorus, all through a warm low-pass master.
 * Notes are scheduled slightly ahead on the audio clock so the loop stays in time.
 * Browsers only start audio after a user gesture, so enabling it before one simply waits:
 * the scheduler kicks in on the next call that finds the context running.
 */
const BPM = 96;
const STEP = 60 / BPM / 2; // one 8th note
const SWING = STEP * 0.16; // off-beat 8ths land a little late
const BAR_STEPS = 8;
const BGM_GAIN = 0.16;

const mtof = (m) => 440 * 2 ** ((m - 69) / 12);

// [bass root (MIDI), chord voicing (MIDI)] per bar
const CHORDS = [
  [36, [60, 64, 67, 71]], [33, [57, 60, 64, 67]], [41, [53, 57, 60, 64]], [43, [55, 59, 62, 65]],
  [40, [52, 55, 59, 62]], [33, [57, 60, 64, 67]], [38, [50, 53, 57, 60]], [43, [55, 59, 62, 65]],
  [41, [53, 57, 60, 64]], [43, [55, 59, 62, 64]], [40, [52, 55, 59, 62]], [33, [57, 60, 64, 67]],
  [38, [50, 53, 57, 60]], [43, [55, 59, 62, 65]], [36, [60, 64, 67, 71]], [36, [60, 64, 67, 69]],
];

// lead: per bar, [slot (8th), MIDI, length in 8ths]
const LEAD = [
  [[0, 76, 2], [2, 79, 1], [3, 81, 1], [4, 79, 2], [6, 76, 1], [7, 74, 1]],
  [[0, 72, 3], [3, 76, 1], [4, 76, 2], [6, 74, 1], [7, 72, 1]],
  [[0, 81, 2], [2, 84, 1], [3, 81, 1], [4, 79, 2], [6, 76, 2]],
  [[0, 74, 3], [4, 71, 1], [5, 74, 1], [6, 79, 2]],
  [[0, 76, 2], [2, 79, 1], [3, 83, 1], [4, 81, 2], [6, 79, 1], [7, 76, 1]],
  [[0, 81, 3], [3, 79, 1], [4, 76, 2], [6, 72, 2]],
  [[0, 74, 1], [1, 77, 1], [2, 81, 2], [4, 84, 2], [6, 81, 1], [7, 77, 1]],
  [[0, 79, 4], [4, 77, 1], [5, 76, 1], [6, 74, 2]],
  [[0, 81, 1], [1, 84, 1], [2, 88, 2], [4, 86, 1], [5, 84, 1], [6, 81, 2]],
  [[0, 83, 1], [1, 86, 1], [2, 86, 2], [4, 83, 2], [6, 79, 2]],
  [[0, 79, 1], [1, 83, 1], [2, 88, 3], [5, 86, 1], [6, 83, 2]],
  [[0, 84, 3], [3, 83, 1], [4, 81, 2], [6, 76, 2]],
  [[0, 77, 1], [1, 81, 1], [2, 86, 2], [4, 84, 1], [5, 81, 1], [6, 77, 2]],
  [[0, 79, 2], [2, 81, 1], [3, 83, 1], [4, 86, 2], [6, 83, 2]],
  [[0, 84, 2], [2, 83, 1], [3, 79, 1], [4, 76, 2], [6, 79, 2]],
  [[0, 84, 6]],
];

let bgmOn = false;
let bgmVolume = 1; // 0..1 (100% until the saved options load)
let bgmTimer = null;
let bgmStep = 0;
let bgmNext = 0;
let bus = null; // { out, warm, noise, lane }
let track = 'main';

/**
 * Output chain built once: volume (out) -> warm low-pass -> speakers. The music itself plays
 * through a "lane" (dry gain + its own echo send) per track: notes are scheduled ahead, so on a
 * track switch or when the music is turned off the lane is faded out and dropped, silencing the
 * notes it already had queued (no old loop playing over the new one) and the new loop starts
 * right away on a fresh lane.
 */
function bgmBus(c) {
  if (!bus) {
    const out = c.createGain();
    out.gain.value = BGM_GAIN * bgmVolume;
    const warm = c.createBiquadFilter();
    warm.type = 'lowpass';
    warm.frequency.value = TRACKS[track].cutoff;
    warm.Q.value = 0.4;
    out.connect(warm).connect(outputNode(c));
    const noise = c.createBuffer(1, c.sampleRate * 0.3, c.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i += 1) d[i] = Math.random() * 2 - 1;
    bus = { out, warm, noise, lane: null };
  }
  if (!bus.lane) bus.lane = makeLane(c);
  return bus.lane;
}

/** One track's lane: `master` (dry) and `echo` (send) for the step functions, into bus.out. */
function makeLane(c) {
  const master = c.createGain();
  master.connect(bus.out);
  const echo = c.createDelay(1);
  echo.delayTime.value = TRACKS[track].echo;
  const feedback = c.createGain();
  feedback.gain.value = 0.32;
  const wet = c.createGain();
  wet.gain.value = 0.28;
  echo.connect(feedback).connect(echo);
  echo.connect(wet).connect(master);
  return { master, echo, noise: bus.noise };
}

/** Fades the current lane out over `fade` s (its queued notes and echo tail go silent) and drops it. */
function retireLane(fade = 0.06) {
  if (!bus?.lane || !ctx) return;
  const { master } = bus.lane;
  master.gain.setTargetAtTime(0, ctx.currentTime, fade / 3);
  setTimeout(() => master.disconnect(), fade * 1000 + 300);
  bus.lane = null;
}

/** A soft enveloped note (attack, then a decay to silence) into `dest`. */
function note(c, dest, { freq, type = 'triangle', when, dur, gain, attack = 0.01, detune = 0 }) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, when);
  if (detune) o.detune.setValueAtTime(detune, when);
  g.gain.setValueAtTime(0.0001, when);
  g.gain.linearRampToValueAtTime(gain, when + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  o.connect(g).connect(dest);
  o.start(when);
  o.stop(when + dur + 0.02);
}

/** Filtered noise burst: hats (high) and a soft clap (mid). */
function noiseHit(c, b, when, { gain, freq, q = 0.8, dur }) {
  const s = c.createBufferSource();
  s.buffer = b.noise;
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = freq;
  f.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, when);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  s.connect(f).connect(g).connect(b.master);
  s.start(when);
  s.stop(when + dur + 0.02);
}

/** Round sine kick: a quick downward pitch sweep. */
function kick(c, b, when) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(130, when);
  o.frequency.exponentialRampToValueAtTime(45, when + 0.16);
  g.gain.setValueAtTime(0.7, when);
  g.gain.exponentialRampToValueAtTime(0.0001, when + 0.22);
  o.connect(g).connect(b.master);
  o.start(when);
  o.stop(when + 0.24);
}

/** Everything that starts on one 8th-note step of the loop. */
function bgmStepAt(c, b, step, when) {
  const bar = Math.floor(step / BAR_STEPS) % CHORDS.length;
  const slot = step % BAR_STEPS;
  const [root, chord] = CHORDS[bar];
  const chorus = bar >= 8;
  const barLen = STEP * BAR_STEPS;

  if (slot === 0) {
    // pad: the chord, slow attack, held for the bar (two slightly detuned voices = warmth)
    for (const m of chord) {
      note(c, b.master, { freq: mtof(m), type: 'triangle', when, dur: barLen * 0.98, gain: 0.05, attack: 0.18, detune: -6 });
      note(c, b.master, { freq: mtof(m), type: 'sine', when, dur: barLen * 0.98, gain: 0.04, attack: 0.25, detune: 7 });
    }
  }
  // bass: root, fifth, octave, fifth
  const bass = { 0: [root, 2], 3: [root + 7, 1], 4: [root + 12, 2], 6: [root + 7, 2] }[slot];
  if (bass) {
    note(c, b.master, { freq: mtof(bass[0]), type: 'triangle', when, dur: STEP * bass[1] * 0.95, gain: 0.32 });
    note(c, b.master, { freq: mtof(bass[0] - 12), type: 'sine', when, dur: STEP * bass[1] * 0.95, gain: 0.22 });
  }
  // lead: a soft square doubled by a triangle, sent to the echo
  for (const [s, m, len] of LEAD[bar]) {
    if (s !== slot) continue;
    const dur = STEP * len * 0.92;
    note(c, b.master, { freq: mtof(m), type: 'square', when, dur, gain: 0.06, attack: 0.012 });
    note(c, b.master, { freq: mtof(m), type: 'triangle', when, dur, gain: 0.1, attack: 0.012 });
    note(c, b.echo, { freq: mtof(m), type: 'triangle', when, dur, gain: 0.08, attack: 0.012 });
  }
  // chorus sparkle: chord tones an octave up on the off-beats, bell-like
  if (chorus && slot % 2 === 1) {
    const m = chord[(slot >> 1) % chord.length] + 12;
    note(c, b.echo, { freq: mtof(m), type: 'sine', when, dur: STEP * 1.6, gain: 0.07, attack: 0.005 });
  }
  // drums: kick on 1 and the "and" of 3, clap on 2 and 4, soft hats every 8th
  if (slot === 0 || slot === 5) kick(c, b, when);
  if (slot === 2 || slot === 6) noiseHit(c, b, when, { gain: 0.18, freq: 1800, q: 0.7, dur: 0.12 });
  noiseHit(c, b, when, { gain: slot % 2 ? 0.05 : 0.08, freq: 8000, q: 1, dur: 0.04 });
  // little fill into the next section
  if ((bar === 7 || bar === 15) && slot === 7) noiseHit(c, b, when + STEP * 0.5, { gain: 0.14, freq: 2400, q: 0.9, dur: 0.08 });
}


/*
 * Boss battle theme: tense and driving, original composition, D minor at ~152 BPM, no swing.
 *   A (bars 1-8)  Dm Dm Bb C | Dm Bb Gm A  (the A major chord's C# is the suspense)
 *   B (bars 9-16) Gm A Dm Bb | Gm A Bb A  (higher, more urgent, ends on the dominant)
 * Layers: low drone, insistent 8th-note bass, short sawtooth chord stabs, a sharp lead,
 * heavy drums (kick on every beat, snare, toms in the fills, a crash at each section).
 */
const BOSS_STEP = 60 / 152 / 2;

// [bass root (MIDI), stab chord (MIDI)] per bar
const BOSS_CHORDS = [
  [38, [62, 65, 69]], [38, [62, 65, 69]], [34, [58, 62, 65]], [36, [60, 64, 67]],
  [38, [62, 65, 69]], [34, [58, 62, 65]], [43, [55, 58, 62]], [33, [57, 61, 64]],
  [43, [55, 58, 62]], [33, [57, 61, 64]], [38, [62, 65, 69]], [34, [58, 62, 65]],
  [43, [55, 58, 62]], [33, [57, 61, 64]], [34, [58, 62, 65]], [33, [57, 61, 64]],
];

// lead: per bar, [slot (8th), MIDI, length in 8ths]
const BOSS_LEAD = [
  [[0, 74, 2], [2, 77, 2], [4, 81, 3], [7, 82, 1]],
  [[0, 81, 2], [2, 79, 1], [3, 77, 1], [4, 76, 2], [6, 77, 1], [7, 76, 1]],
  [[0, 74, 3], [3, 77, 1], [4, 82, 2], [6, 81, 2]],
  [[0, 79, 3], [3, 76, 1], [4, 72, 2], [6, 76, 2]],
  [[0, 74, 1], [1, 74, 1], [2, 81, 2], [4, 86, 2], [6, 84, 1], [7, 82, 1]],
  [[0, 82, 2], [2, 81, 2], [4, 77, 2], [6, 74, 2]],
  [[0, 79, 2], [2, 82, 2], [4, 86, 2], [6, 84, 1], [7, 82, 1]],
  [[0, 81, 4], [4, 85, 2], [6, 81, 2]],
  [[0, 86, 1], [1, 86, 1], [2, 89, 2], [4, 86, 2], [6, 82, 2]],
  [[0, 85, 2], [2, 88, 2], [4, 85, 2], [6, 81, 2]],
  [[0, 86, 3], [3, 84, 1], [4, 81, 2], [6, 77, 2]],
  [[0, 82, 2], [2, 86, 2], [4, 89, 3], [7, 88, 1]],
  [[0, 86, 2], [2, 82, 1], [3, 79, 1], [4, 82, 2], [6, 86, 2]],
  [[0, 85, 3], [3, 88, 1], [4, 88, 2], [6, 85, 2]],
  [[0, 86, 2], [2, 82, 2], [4, 77, 2], [6, 82, 2]],
  [[0, 81, 6], [6, 73, 1], [7, 76, 1]],
];

// bass offsets over the root, one per 8th: pounding root with octave jumps
const BOSS_BASS = [0, 0, 12, 0, 0, 12, 0, 7];

/** Low tom: a pitched sine thump for the fills. */
function tom(c, b, when, freq) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(freq, when);
  o.frequency.exponentialRampToValueAtTime(freq * 0.55, when + 0.18);
  g.gain.setValueAtTime(0.45, when);
  g.gain.exponentialRampToValueAtTime(0.0001, when + 0.22);
  o.connect(g).connect(b.master);
  o.start(when);
  o.stop(when + 0.24);
}

function bossStepAt(c, b, step, when) {
  const bar = Math.floor(step / BAR_STEPS) % BOSS_CHORDS.length;
  const slot = step % BAR_STEPS;
  const [root, chord] = BOSS_CHORDS[bar];
  const S = BOSS_STEP;

  if (slot === 0) {
    // drone: the root two octaves down, held through the bar
    note(c, b.master, { freq: mtof(root - 12), type: 'sine', when, dur: S * BAR_STEPS, gain: 0.16, attack: 0.05 });
    note(c, b.master, { freq: mtof(root), type: 'sawtooth', when, dur: S * BAR_STEPS, gain: 0.018, attack: 0.2, detune: -8 });
  }
  // bass: pounding 8ths
  const bm = root + BOSS_BASS[slot];
  note(c, b.master, { freq: mtof(bm), type: 'sawtooth', when, dur: S * 0.8, gain: 0.09 });
  note(c, b.master, { freq: mtof(bm), type: 'triangle', when, dur: S * 0.85, gain: 0.26 });
  // chord stabs on the syncopated 1 . . 4 . . 7 .
  if (slot === 0 || slot === 3 || slot === 6) {
    for (const m of chord) note(c, b.master, { freq: mtof(m), type: 'sawtooth', when, dur: S * 0.7, gain: 0.03, detune: slot === 3 ? 5 : -5 });
  }
  // lead: square doubled an octave down by a sawtooth, with echo
  for (const [s, m, len] of BOSS_LEAD[bar]) {
    if (s !== slot) continue;
    const dur = S * len * 0.9;
    note(c, b.master, { freq: mtof(m), type: 'square', when, dur, gain: 0.07, attack: 0.006 });
    note(c, b.master, { freq: mtof(m - 12), type: 'sawtooth', when, dur, gain: 0.035, attack: 0.006 });
    note(c, b.echo, { freq: mtof(m), type: 'square', when, dur, gain: 0.035, attack: 0.006 });
  }
  // drums: kick on every beat (plus a push into the next bar), snare on 2 and 4, driving hats
  if (slot % 2 === 0 || (slot === 7 && bar % 2 === 1)) kick(c, b, when);
  if (slot === 2 || slot === 6) noiseHit(c, b, when, { gain: 0.3, freq: 1500, q: 0.6, dur: 0.16 });
  noiseHit(c, b, when, { gain: slot % 2 ? 0.07 : 0.11, freq: 9000, q: 1.2, dur: 0.035 });
  // crash at the top of each section, tom fill at its end
  if (slot === 0 && (bar === 0 || bar === 8)) noiseHit(c, b, when, { gain: 0.22, freq: 6000, q: 0.3, dur: 0.9 });
  if ((bar === 7 || bar === 15) && slot >= 4) tom(c, b, when, [196, 165, 131, 110][slot - 4]);
}


/*
 * Normal battle theme: between the cozy main loop and the boss theme. Original composition,
 * A minor at ~124 BPM with a light swing, adventurous rather than dark.
 *   A (bars 1-8)  Am F C G | Am F G E  (E major pulls back to Am with a light tension)
 *   B (bars 9-16) F G Am Am | F G C E  (higher, brighter chorus with an arpeggio)
 * Layers: soft pad (from the cozy side), syncopated bass, bright lead with echo,
 * punchier drums than the main loop but without the boss's constant pounding.
 */
const BATTLE_STEP = 60 / 124 / 2;

// [bass root (MIDI), chord (MIDI)] per bar
const BATTLE_CHORDS = [
  [33, [57, 60, 64]], [41, [53, 57, 60]], [36, [55, 60, 64]], [43, [55, 59, 62]],
  [33, [57, 60, 64]], [41, [53, 57, 60]], [43, [55, 59, 62]], [40, [56, 59, 64]],
  [41, [53, 57, 60]], [43, [55, 59, 62]], [33, [57, 60, 64]], [33, [57, 60, 64]],
  [41, [53, 57, 60]], [43, [55, 59, 62]], [36, [55, 60, 64]], [40, [56, 59, 64]],
];

// lead: per bar, [slot (8th), MIDI, length in 8ths]
const BATTLE_LEAD = [
  [[0, 76, 2], [2, 72, 1], [3, 76, 1], [4, 81, 3], [7, 79, 1]],
  [[0, 77, 2], [2, 76, 1], [3, 74, 1], [4, 72, 2], [6, 74, 2]],
  [[0, 76, 3], [3, 79, 1], [4, 84, 2], [6, 83, 1], [7, 81, 1]],
  [[0, 79, 4], [4, 74, 2], [6, 76, 1], [7, 79, 1]],
  [[0, 81, 2], [2, 84, 2], [4, 83, 1], [5, 81, 1], [6, 79, 2]],
  [[0, 77, 2], [2, 81, 2], [4, 84, 3], [7, 81, 1]],
  [[0, 83, 2], [2, 79, 2], [4, 74, 2], [6, 79, 2]],
  [[0, 80, 4], [4, 76, 2], [6, 71, 2]],
  [[0, 81, 1], [1, 84, 1], [2, 89, 2], [4, 88, 2], [6, 84, 2]],
  [[0, 86, 1], [1, 83, 1], [2, 79, 2], [4, 83, 2], [6, 86, 2]],
  [[0, 88, 3], [3, 86, 1], [4, 84, 2], [6, 81, 2]],
  [[0, 84, 2], [2, 81, 1], [3, 79, 1], [4, 76, 4]],
  [[0, 77, 1], [1, 81, 1], [2, 84, 2], [4, 89, 2], [6, 88, 2]],
  [[0, 86, 2], [2, 83, 2], [4, 86, 2], [6, 91, 2]],
  [[0, 88, 3], [3, 86, 1], [4, 84, 2], [6, 79, 2]],
  [[0, 80, 2], [2, 83, 2], [4, 88, 4]],
];

// bass offsets over the root per 8th (null = rest): a syncopated, bouncing line
const BATTLE_BASS = [0, null, 12, 0, null, 7, 12, null];

function battleStepAt(c, b, step, when) {
  const bar = Math.floor(step / BAR_STEPS) % BATTLE_CHORDS.length;
  const slot = step % BAR_STEPS;
  const [root, chord] = BATTLE_CHORDS[bar];
  const chorus = bar >= 8;
  const S = BATTLE_STEP;

  if (slot === 0) {
    // pad: softer and shorter than the cozy one
    for (const m of chord) note(c, b.master, { freq: mtof(m), type: 'triangle', when, dur: S * BAR_STEPS * 0.9, gain: 0.04, attack: 0.1, detune: -5 });
  }
  const off = BATTLE_BASS[slot];
  if (off != null) {
    note(c, b.master, { freq: mtof(root + off), type: 'triangle', when, dur: S * 0.9, gain: 0.3 });
    note(c, b.master, { freq: mtof(root + off), type: 'square', when, dur: S * 0.6, gain: 0.035 });
  }
  // chord stabs on 1 and the "and" of 2 (lighter than the boss's)
  if (slot === 0 || slot === 3) {
    for (const m of chord) note(c, b.master, { freq: mtof(m + 12), type: 'square', when, dur: S * 0.5, gain: 0.018 });
  }
  // lead: square + triangle, with echo
  for (const [s, m, len] of BATTLE_LEAD[bar]) {
    if (s !== slot) continue;
    const dur = S * len * 0.9;
    note(c, b.master, { freq: mtof(m), type: 'square', when, dur, gain: 0.065, attack: 0.008 });
    note(c, b.master, { freq: mtof(m), type: 'triangle', when, dur, gain: 0.08, attack: 0.008 });
    note(c, b.echo, { freq: mtof(m), type: 'triangle', when, dur, gain: 0.06, attack: 0.008 });
  }
  // chorus arpeggio on the off-beats
  if (chorus && slot % 2 === 1) {
    const m = chord[(slot >> 1) % chord.length] + 24;
    note(c, b.echo, { freq: mtof(m), type: 'square', when, dur: S * 0.8, gain: 0.03, attack: 0.004 });
  }
  // drums: kick on 1 and 3 (plus a push on odd bars), snare on 2 and 4, hats every 8th
  if (slot === 0 || slot === 4 || (slot === 5 && bar % 2 === 1)) kick(c, b, when);
  if (slot === 2 || slot === 6) noiseHit(c, b, when, { gain: 0.22, freq: 1700, q: 0.65, dur: 0.14 });
  noiseHit(c, b, when, { gain: slot % 2 ? 0.06 : 0.09, freq: 8500, q: 1.1, dur: 0.04 });
  if (slot === 0 && bar === 8) noiseHit(c, b, when, { gain: 0.16, freq: 6000, q: 0.3, dur: 0.7 });
  if ((bar === 7 || bar === 15) && slot >= 6) tom(c, b, when, slot === 6 ? 165 : 131);
}

/*
 * Victory, in the spirit of Inflation RPG, which swaps the battle music for a victory track when a
 * fight is won (SeBgm.as win1_bgm, looped on the result screen). Original composition, energetic:
 * 168 BPM in C major. A two-bar fanfare played once (a rising C-E-G-C run hit with power-chord
 * stabs, a snare pickup, then a held high E over a big C chord and a crash), then an 8-bar loop
 * (C - G - Am - F - C - G - F - G) with four-on-the-floor kick, backbeat snare + clap, driving
 * octave bass, syncopated power-chord stabs, a doubled lead and a tom fill into the repeat.
 * It enters from the battle music with a riser (TRACKS.victory.entry).
 */
const VICTORY_STEP = 60 / 168 / 2;
const VICTORY_CHORDS = [
  [36, [60, 64, 67]], [36, [60, 64, 67]], // fanfare
  [36, [60, 64, 67]], [43, [59, 62, 67]], [45, [57, 60, 64]], [41, [57, 60, 65]],
  [36, [60, 64, 67]], [43, [59, 62, 67]], [41, [57, 60, 65]], [43, [59, 62, 67]],
];
const VICTORY_LEAD = [
  [[0, 72, 1], [1, 76, 1], [2, 79, 1], [3, 84, 2], [5, 79, 1], [6, 84, 2]],
  [[0, 88, 1], [1, 86, 1], [2, 84, 1], [3, 88, 5]],
  [[0, 79, 1], [1, 84, 1], [2, 88, 2], [4, 86, 1], [5, 84, 1], [6, 86, 2]],
  [[0, 83, 2], [2, 79, 1], [3, 83, 1], [4, 86, 3], [7, 83, 1]],
  [[0, 84, 1], [1, 88, 1], [2, 93, 2], [4, 91, 1], [5, 88, 1], [6, 84, 2]],
  [[0, 89, 2], [2, 88, 1], [3, 86, 1], [4, 84, 2], [6, 81, 2]],
  [[0, 79, 1], [1, 84, 1], [2, 88, 2], [4, 91, 2], [6, 88, 2]],
  [[0, 86, 2], [2, 83, 1], [3, 86, 1], [4, 91, 3], [7, 89, 1]],
  [[0, 88, 1], [1, 89, 1], [2, 93, 2], [4, 91, 2], [6, 89, 1], [7, 88, 1]],
  [[0, 86, 2], [2, 88, 1], [3, 86, 1], [4, 83, 2], [6, 79, 1], [7, 83, 1]],
];
const VICTORY_INTRO_BARS = 2;

/** Power chord (root, fifth, octave) stab, an octave above the bass. */
function stab(c, b, when, root, dur, gain = 0.03) {
  for (const m of [root + 24, root + 31, root + 36]) note(c, b.master, { freq: mtof(m), type: 'sawtooth', when, dur, gain, attack: 0.004 });
}

function victoryStepAt(c, b, step, when) {
  const bar = Math.floor(step / BAR_STEPS) % VICTORY_CHORDS.length;
  const slot = step % BAR_STEPS;
  const [root, chord] = VICTORY_CHORDS[bar];
  const fanfare = bar < VICTORY_INTRO_BARS;
  const S = VICTORY_STEP;

  // lead: square + triangle, doubled an octave below, with echo
  for (const [s, m, len] of VICTORY_LEAD[bar]) {
    if (s !== slot) continue;
    const dur = S * len * 0.9;
    note(c, b.master, { freq: mtof(m), type: 'square', when, dur, gain: fanfare ? 0.08 : 0.06, attack: 0.004 });
    note(c, b.master, { freq: mtof(m), type: 'triangle', when, dur, gain: 0.08, attack: 0.004 });
    note(c, b.master, { freq: mtof(m - 12), type: 'square', when, dur, gain: fanfare ? 0.045 : 0.03, attack: 0.004 });
    note(c, b.echo, { freq: mtof(m), type: 'triangle', when, dur, gain: 0.045, attack: 0.004 });
  }

  if (fanfare) {
    if (bar === 0) {
      // hits on the run, a snare pickup into bar 2
      if (slot === 0) noiseHit(c, b, when, { gain: 0.24, freq: 6000, q: 0.3, dur: 0.9 });
      if (slot === 0 || slot === 3 || slot === 6) { stab(c, b, when, root, S * 1.6, 0.035); kick(c, b, when); }
      if (slot === 7) for (let i = 0; i < 3; i += 1) noiseHit(c, b, when + i * (S / 3), { gain: 0.12 + i * 0.05, freq: 1800, q: 0.7, dur: 0.08 });
      note(c, b.master, { freq: mtof(root + (slot % 2 ? 12 : 0)), type: 'triangle', when, dur: S * 0.85, gain: 0.3 });
    } else if (slot === 3) {
      // the held high note lands on a big chord, low octave and a crash
      for (const m of [...chord, chord[0] + 12]) note(c, b.master, { freq: mtof(m + 12), type: 'sawtooth', when, dur: S * 5, gain: 0.025, attack: 0.01 });
      stab(c, b, when, root, S * 5, 0.03);
      note(c, b.master, { freq: mtof(root), type: 'triangle', when, dur: S * 5, gain: 0.34 });
      note(c, b.master, { freq: mtof(root - 12), type: 'sine', when, dur: S * 5, gain: 0.22 });
      noiseHit(c, b, when, { gain: 0.2, freq: 5000, q: 0.3, dur: 1.1 });
      kick(c, b, when);
    } else if (slot < 3) {
      kick(c, b, when);
      note(c, b.master, { freq: mtof(root + 12), type: 'triangle', when, dur: S * 0.8, gain: 0.26 });
    }
    return;
  }

  // loop
  if (slot === 0) for (const m of chord) note(c, b.master, { freq: mtof(m), type: 'triangle', when, dur: S * BAR_STEPS * 0.95, gain: 0.03, attack: 0.05 });
  // driving octave bass on every 8th
  const bm = root + (slot % 2 ? 12 : 0);
  note(c, b.master, { freq: mtof(bm), type: 'triangle', when, dur: S * 0.85, gain: 0.28 });
  note(c, b.master, { freq: mtof(bm), type: 'square', when, dur: S * 0.5, gain: 0.03 });
  // syncopated power-chord stabs
  if (slot === 0 || slot === 3 || slot === 6) stab(c, b, when, root, S * 0.8);
  // sparkle arpeggio on the off-beats, two octaves up
  if (slot % 2 === 1) note(c, b.echo, { freq: mtof(chord[(slot >> 1) % chord.length] + 24), type: 'square', when, dur: S * 0.7, gain: 0.022, attack: 0.003 });
  // drums: four on the floor, backbeat snare + clap, open hats on the off-beats
  if (slot % 2 === 0) kick(c, b, when);
  if (slot === 2 || slot === 6) {
    noiseHit(c, b, when, { gain: 0.24, freq: 1800, q: 0.7, dur: 0.13 });
    noiseHit(c, b, when + 0.012, { gain: 0.12, freq: 1200, q: 1.4, dur: 0.08 });
  }
  noiseHit(c, b, when, { gain: slot % 2 ? 0.09 : 0.05, freq: 9500, q: 1, dur: slot % 2 ? 0.09 : 0.03 });
  // tom fill at the end of the loop, back into its top
  if (bar === VICTORY_CHORDS.length - 1 && slot >= 4) tom(c, b, when, [196, 165, 147, 110][slot - 4]);
}

/** Transition riser: filtered noise and a tone sweeping up over `dur`, into lane `b`. */
function riser(c, b, when, dur) {
  const s = c.createBufferSource();
  s.buffer = b.noise;
  s.loop = true;
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.Q.value = 1.2;
  f.frequency.setValueAtTime(500, when);
  f.frequency.exponentialRampToValueAtTime(7000, when + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.001, when);
  g.gain.linearRampToValueAtTime(0.3, when + dur);
  g.gain.linearRampToValueAtTime(0, when + dur + 0.05);
  s.connect(f).connect(g).connect(b.master);
  s.start(when);
  s.stop(when + dur + 0.06);
  const o = c.createOscillator();
  const og = c.createGain();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(220, when);
  o.frequency.exponentialRampToValueAtTime(1760, when + dur);
  og.gain.setValueAtTime(0.001, when);
  og.gain.linearRampToValueAtTime(0.035, when + dur);
  og.gain.linearRampToValueAtTime(0, when + dur + 0.04);
  o.connect(og).connect(b.master);
  o.start(when);
  o.stop(when + dur + 0.05);
}

/**
 * The loops: tempo, swing, length and master brightness. `loopFrom` (bar): where the loop
 * restarts, for tracks with an intro played once (victory's fanfare).
 */
const TRACKS = {
  main: { step: STEP, swing: SWING, bars: CHORDS.length, cutoff: 3400, echo: STEP * 3, stepAt: bgmStepAt },
  battle: { step: BATTLE_STEP, swing: BATTLE_STEP * 0.08, bars: BATTLE_CHORDS.length, cutoff: 4800, echo: BATTLE_STEP * 3, stepAt: battleStepAt },
  boss: { step: BOSS_STEP, swing: 0, bars: BOSS_CHORDS.length, cutoff: 6500, echo: BOSS_STEP * 3, stepAt: bossStepAt },
  // entry: the old loop fades over `fade` s while a riser builds; the fanfare lands after `lead` s
  victory: { step: VICTORY_STEP, swing: 0, bars: VICTORY_CHORDS.length, loopFrom: VICTORY_INTRO_BARS, cutoff: 7000, echo: VICTORY_STEP * 3, stepAt: victoryStepAt, entry: { fade: 0.25, lead: 0.34 } },
};

function bgmSchedule() {
  const c = ac();
  if (!c || !bgmOn || c.state !== 'running') return;
  const b = bgmBus(c);
  const tr = TRACKS[track];
  if (bgmNext < c.currentTime) bgmNext = c.currentTime + 0.05;
  while (bgmNext < c.currentTime + 0.5) {
    const when = bgmNext + (bgmStep % 2 ? tr.swing : 0);
    tr.stepAt(c, b, bgmStep, when);
    bgmStep += 1;
    if (bgmStep >= tr.bars * BAR_STEPS) bgmStep = (tr.loopFrom ?? 0) * BAR_STEPS;
    bgmNext += tr.step;
  }
}

export const bgm = {
  /** Music volume 0..1 (applies right away). */
  setVolume(v) {
    bgmVolume = Math.max(0, Math.min(1, Number(v) || 0));
    if (bus && ctx) bus.out.gain.setTargetAtTime(BGM_GAIN * bgmVolume, ctx.currentTime, 0.05);
  },
  /**
   * Switches the loop ('main' | 'battle' | 'boss' | 'victory'): the old one is cut (its queued notes too) and
   * the new one starts from its top right away.
   */
  setTrack(name) {
    if (!TRACKS[name] || name === track) return;
    track = name;
    bgmStep = 0;
    if (bus && ctx) bus.warm.frequency.setTargetAtTime(TRACKS[name].cutoff, ctx.currentTime, 0.05);
    const entry = TRACKS[name].entry;
    retireLane(entry?.fade);
    bgmNext = 0; // bgmSchedule restarts the grid just ahead of now
    if (entry && bgmOn && ctx?.state === 'running') {
      // a riser on the new lane while the old one fades; the new loop starts when it peaks
      riser(ctx, bgmBus(ctx), ctx.currentTime, entry.lead);
      bgmNext = ctx.currentTime + entry.lead;
    }
    bgmSchedule();
  },
  setEnabled(on) {
    bgmOn = !!on;
    if (bgmOn && !bgmTimer) {
      bgmNext = 0;
      bgmTimer = setInterval(bgmSchedule, 100);
      bgmSchedule();
    } else if (!bgmOn && bgmTimer) {
      clearInterval(bgmTimer);
      bgmTimer = null;
      retireLane(); // stop now, not after the notes already queued
    }
  },
  /** Call from a user gesture so the AudioContext is allowed to start. */
  unlock() {
    ac();
  },
};
