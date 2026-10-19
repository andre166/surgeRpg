/**
 * Hand-drawn Ancestral Echoes: every echo of the game (echoSvg keeps its procedural ghost only as a
 * fallback for an echo with no art here).
 * Same contract as echoSvg: `pose` { t 0..1, blink } draws one animation frame (map textures);
 * without a pose the portrait animates itself with SMIL (Echoes cards, battle).
 */

const TAU = Math.PI * 2;
const f1 = (n) => n.toFixed(1);

/** Lâmpada-Fátua: an old iron lantern swinging on its hook, a little flame-spirit inside. */
function lanternWispSvg(pose) {
  const ph = pose ? pose.t * TAU : 0;
  const swing = pose ? Math.sin(ph) * 7 : 0;
  const flick = pose ? 1 + Math.sin(ph * 3) * 0.08 : 1;
  const tip = pose ? Math.sin(ph - 0.9) * 8 : 0;
  const eyes = pose?.blink
    ? '<rect x="44.6" y="45.3" width="3.8" height="1.4" rx=".7" fill="#7a4a00"/><rect x="51.6" y="45.3" width="3.8" height="1.4" rx=".7" fill="#7a4a00"/>'
    : `<ellipse cx="46.5" cy="46" rx="1.9" ry="2.6" fill="#7a4a00">${pose ? '' : '<animate attributeName="ry" values="2.6;2.6;.3;2.6" keyTimes="0;.92;.96;1" dur="4s" repeatCount="indefinite"/>'}</ellipse>`
      + `<ellipse cx="53.5" cy="46" rx="1.9" ry="2.6" fill="#7a4a00">${pose ? '' : '<animate attributeName="ry" values="2.6;2.6;.3;2.6" keyTimes="0;.92;.96;1" dur="4s" repeatCount="indefinite"/>'}</ellipse>`
      + '<circle cx="47" cy="45" r=".7" fill="#fff"/><circle cx="54" cy="45" r=".7" fill="#fff"/>';
  let motes = '';
  for (let i = 0; i < 3; i += 1) {
    const a = i * 2.1 + ph;
    motes += `<circle cx="${f1(50 + Math.cos(a) * 36)}" cy="${f1(46 + Math.sin(a) * 26)}" r="2.2" fill="#fff6b0" opacity=".85"/>`;
  }
  const flame = `<path d="M50,29 C60,39 60,50 50,57 C40,50 40,39 50,29 Z" fill="url(#lwF)"/>
<path d="M50,38 C54,43 54,49 50,53 C46,49 46,43 50,38 Z" fill="#fffbe0" opacity=".7"/>
${eyes}<path d="M48.5,50 q1.5,1.2 3,0" stroke="#7a4a00" stroke-width="1" fill="none" stroke-linecap="round"/>`;
  const flameG = pose
    ? `<g transform="translate(50 57) scale(1 ${flick.toFixed(3)}) translate(-50 -57)">${flame}</g>`
    : `<g transform="translate(50 57)"><g><animateTransform attributeName="transform" type="scale" values="1 1;1.04 1.1;.97 .93;1 1" dur=".7s" repeatCount="indefinite"/><g transform="translate(-50 -57)">${flame}</g></g></g>`;
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
<defs>
<radialGradient id="lwG" cx="50%" cy="46%"><stop offset="0" stop-color="#ffe680" stop-opacity=".55"/><stop offset="1" stop-color="#ffe680" stop-opacity="0"/></radialGradient>
<radialGradient id="lwF" cx="50%" cy="68%"><stop offset="0" stop-color="#fffbe0"/><stop offset=".55" stop-color="#ffd23f"/><stop offset="1" stop-color="#ff9a1f"/></radialGradient>
<linearGradient id="lwT" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe680" stop-opacity=".75"/><stop offset="1" stop-color="#ffe680" stop-opacity="0"/></linearGradient>
</defs>
<circle cx="50" cy="46" r="46" fill="url(#lwG)"/>
<g transform="rotate(${f1(swing)} 50 8)">${pose ? '' : '<animateTransform attributeName="transform" type="rotate" values="-7 50 8;7 50 8;-7 50 8" dur="3.2s" repeatCount="indefinite"/>'}
<path d="M44,68 C40,78 ${f1(47 + tip)},84 ${f1(50 + tip)},96 C${f1(54 + tip)},84 60,78 56,68 Z" fill="url(#lwT)"/>
<circle cx="50" cy="8" r="3.4" fill="none" stroke="#2a201b" stroke-width="2"/>
<path d="M50,11 V16" stroke="#2a201b" stroke-width="2"/>
<path d="M40,24 L60,24 L56,15 L44,15 Z" fill="#4a3a32" stroke="#1c1410" stroke-width="2" stroke-linejoin="round"/>
<rect x="35" y="24" width="30" height="37" rx="5" fill="#fff3b8" fill-opacity=".28" stroke="#2a201b" stroke-width="2.5"/>
${flameG}
<path d="M43,25.5 V59.5 M57,25.5 V59.5" stroke="#2a201b" stroke-width="1.6" opacity=".75"/>
<path d="M38.5,28 v12" stroke="#fff" stroke-width="1.6" opacity=".6" stroke-linecap="round"/>
<path d="M33,61 L67,61 L62,69 L38,69 Z" fill="#4a3a32" stroke="#1c1410" stroke-width="2" stroke-linejoin="round"/>
</g>
<g>${pose ? '' : '<animateTransform attributeName="transform" type="rotate" values="0 50 46;360 50 46" dur="7s" repeatCount="indefinite"/>'}${motes}</g>
</svg>`;
}

/** Fantasma Abóbora: a carved pumpkin head with a glowing grin over a tattered purple ghost sheet. */
function pumpkinGhostSvg(pose) {
  const ph = pose ? pose.t * TAU : 0;
  const tilt = pose ? Math.sin(ph) * 5 : 0;
  const mid = pose ? Math.sin(ph) * 4 : 0;
  const tip = pose ? Math.sin(ph - 0.9) * 9 : 0;
  const glow = pose ? 0.78 + 0.22 * Math.sin(ph * 3) : 0.95;
  const eyes = pose?.blink
    ? '<path d="M36,38.5 L46,37.5 L46,39.5 L36,40 Z"/><path d="M64,38.5 L54,37.5 L54,39.5 L64,40 Z"/>'
    : '<path d="M36,40 L44,30 L46,41 Z"/><path d="M64,40 L56,30 L54,41 Z"/>';
  let wisps = '';
  for (let i = 0; i < 2; i += 1) {
    const a = i * Math.PI + ph;
    wisps += `<circle cx="${f1(50 + Math.cos(a) * 38)}" cy="${f1(46 + Math.sin(a) * 24)}" r="2.6" fill="#c9a2ff" opacity=".85"/>`;
  }
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
<defs>
<radialGradient id="pgG" cx="50%" cy="44%"><stop offset="0" stop-color="#ff9a3c" stop-opacity=".45"/><stop offset="1" stop-color="#ff9a3c" stop-opacity="0"/></radialGradient>
<linearGradient id="pgT" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a5cc8" stop-opacity=".95"/><stop offset="1" stop-color="#8a5cc8" stop-opacity=".08"/></linearGradient>
<radialGradient id="pgF" cx="50%" cy="50%"><stop offset="0" stop-color="#fff6b0"/><stop offset="1" stop-color="#ffb020"/></radialGradient>
</defs>
<circle cx="50" cy="44" r="46" fill="url(#pgG)"/>
<path d="M30,48 C30,66 ${f1(38 + mid)},78 ${f1(42 + tip)},94 C${f1(46 + tip)},86 ${f1(50 + mid)},88 ${f1(54 + tip)},96 C${f1(58 + mid)},86 ${f1(62 + tip)},90 ${f1(64 + tip)},92 C${f1(66 + mid)},78 70,66 70,48 Z" fill="url(#pgT)" stroke="#3b2266" stroke-width="1.6" stroke-linejoin="round">${pose ? '' : '<animateTransform attributeName="transform" type="rotate" values="-4 50 48;4 50 48;-4 50 48" dur="2.6s" repeatCount="indefinite"/>'}</path>
<g transform="rotate(${f1(tilt)} 50 40)">${pose ? '' : '<animateTransform attributeName="transform" type="rotate" values="-5 50 40;5 50 40;-5 50 40" dur="3s" repeatCount="indefinite"/>'}
<path d="M47,20 C46,14 49,9 55,7 L57,10 C53,12 52,15 53,20 Z" fill="#5b7a2e" stroke="#2c3d14" stroke-width="1.6" stroke-linejoin="round"/>
<path d="M54,12 C60,6 68,8 70,12 C64,15 58,15 54,12 Z" fill="#7da53c" stroke="#2c3d14" stroke-width="1.3"/>
<path d="M47,18 q-8,-6 -4,-11 q3,-2 4,1" fill="none" stroke="#5b7a2e" stroke-width="1.4"/>
<ellipse cx="50" cy="40" rx="26" ry="21" fill="#f08a24" stroke="#7a3405" stroke-width="2.2"/>
<ellipse cx="50" cy="40" rx="15" ry="21" fill="none" stroke="#c4600f" stroke-width="1.6"/>
<ellipse cx="50" cy="40" rx="5.5" ry="21" fill="none" stroke="#c4600f" stroke-width="1.4"/>
<path d="M31,32 q3,-8 10,-11" stroke="#ffc074" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".8"/>
<g fill="url(#pgF)" stroke="#5a2203" stroke-width="1.3" stroke-linejoin="round" opacity="${glow.toFixed(2)}">${pose ? '' : '<animate attributeName="opacity" values=".95;.7;1;.8;.95" dur="1.3s" repeatCount="indefinite"/>'}
${eyes}
<path d="M48,45 L50,41.5 L52,45 Z"/>
<path d="M34,47 L38,50 L41,47 L44,51 L47,48 L50,52 L53,48 L56,51 L59,47 L62,50 L66,47 C63,57 37,57 34,47 Z"/>
</g>
</g>
<g>${pose ? '' : '<animateTransform attributeName="transform" type="rotate" values="0 50 46;360 50 46" dur="6s" repeatCount="indefinite"/>'}${wisps}</g>
</svg>`;
}

/** Sereia Afogada: a pale drowned siren with seaweed hair and a teal fish tail, bubbles rising. */
function drownedSirenSvg(pose) {
  const ph = pose ? pose.t * TAU : 0;
  const sway = pose ? Math.sin(ph) * 4 : 0;
  const tl = pose ? Math.sin(ph - 0.8) * 7 : 0;
  const eyes = pose?.blink
    ? '<rect x="44.2" y="35.6" width="3.6" height="1.2" rx=".6" fill="#8ff6ff"/><rect x="52.2" y="35.6" width="3.6" height="1.2" rx=".6" fill="#8ff6ff"/>'
    : `<ellipse cx="46" cy="36" rx="1.8" ry="2.4" fill="#8ff6ff">${pose ? '' : '<animate attributeName="ry" values="2.4;2.4;.3;2.4" keyTimes="0;.9;.95;1" dur="4.4s" repeatCount="indefinite"/>'}</ellipse>`
      + `<ellipse cx="54" cy="36" rx="1.8" ry="2.4" fill="#8ff6ff">${pose ? '' : '<animate attributeName="ry" values="2.4;2.4;.3;2.4" keyTimes="0;.9;.95;1" dur="4.4s" repeatCount="indefinite"/>'}</ellipse>`;
  let bubbles = '';
  [[30, 2.6], [68, 2], [36, 1.6], [72, 2.8]].forEach(([x, r], i) => {
    if (pose) {
      const k = (pose.t + i / 4) % 1;
      bubbles += `<circle cx="${x}" cy="${f1(90 - k * 70)}" r="${r}" fill="none" stroke="#bff8ff" stroke-width="1.1" opacity="${f1(Math.sin(k * Math.PI))}"/>`;
    } else {
      bubbles += `<circle cx="${x}" cy="90" r="${r}" fill="none" stroke="#bff8ff" stroke-width="1.1" opacity="0"><animate attributeName="cy" values="90;20" dur="3s" begin="${(i * 0.75).toFixed(2)}s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;1;0" dur="3s" begin="${(i * 0.75).toFixed(2)}s" repeatCount="indefinite"/></circle>`;
    }
  });
  const swayAnim = (deg, cx, cy, dur) => (pose ? '' : `<animateTransform attributeName="transform" type="rotate" values="-${deg} ${cx} ${cy};${deg} ${cx} ${cy};-${deg} ${cx} ${cy}" dur="${dur}" repeatCount="indefinite"/>`);
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
<defs>
<radialGradient id="dsG" cx="50%" cy="48%"><stop offset="0" stop-color="#6ff0ff" stop-opacity=".42"/><stop offset="1" stop-color="#6ff0ff" stop-opacity="0"/></radialGradient>
<linearGradient id="dsT" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3fc0b0"/><stop offset="1" stop-color="#1b5e66"/></linearGradient>
</defs>
<circle cx="50" cy="48" r="46" fill="url(#dsG)"/>
<g transform="rotate(${f1(tl)} 50 62)">${swayAnim(6, 50, 62, '2.4s')}
<path d="M42,60 C40,74 47,82 50,88 C44,91 38,94 34,97 C44,98 52,96 54,92 C58,95 66,97 70,95 C64,92 58,90 54,87 C60,78 60,70 58,60 Z" fill="url(#dsT)" stroke="#123c40" stroke-width="1.8" stroke-linejoin="round"/>
<path d="M45,66 q2.5,2 5,0 q2.5,2 5,0 M46,72 q2.5,2 5,0 q2.5,2 5,0 M47.5,78 q2.5,2 5,0" stroke="#7fe0d0" stroke-width="1" fill="none" opacity=".75"/>
</g>
<g transform="rotate(${f1(sway)} 50 22)">${swayAnim(4, 50, 22, '3.6s')}
<path d="M50,20 C34,20 32,34 33,44 C33,56 26,64 30,76 C36,70 40,60 42,52 L58,52 C60,60 64,70 70,76 C74,64 67,56 67,44 C68,34 66,20 50,20 Z" fill="#1f4a3f" stroke="#0e2620" stroke-width="1.8" stroke-linejoin="round"/>
</g>
<path d="M42,48 C42,56 41,60 42,62 L58,62 C59,60 58,56 58,48 Z" fill="#b8d3d6" stroke="#3a5e66" stroke-width="1.6" stroke-linejoin="round"/>
<path d="M42,55 q8,3 16,-1" stroke="#2f7a52" stroke-width="2.4" fill="none" stroke-linecap="round"/>
<path d="M42.5,50 C37,54 36,58 38.5,62 M57.5,50 C63,54 64,58 61.5,62" stroke="#3a5e66" stroke-width="4" fill="none" stroke-linecap="round"/>
<path d="M42.5,50 C37,54 36,58 38.5,62 M57.5,50 C63,54 64,58 61.5,62" stroke="#b8d3d6" stroke-width="2" fill="none" stroke-linecap="round"/>
<rect x="47.5" y="44" width="5" height="6" fill="#b8d3d6"/>
<ellipse cx="50" cy="35" rx="10.5" ry="12" fill="#c7dfe1" stroke="#3a5e66" stroke-width="1.8"/>
<path d="M39.5,34 C40,24 46,21 50,21 C55,21 61,24 60.5,34 C58,28 55,26 50,27 C46,27 42,29 39.5,34 Z" fill="#1f4a3f"/>
<g transform="rotate(${f1(sway * 0.6)} 50 30)">${swayAnim(3, 50, 30, '3.6s')}
<path d="M40,35 C38,44 37,50 38,57 M60,35 C62,44 63,50 62,57" stroke="#1f4a3f" stroke-width="3" fill="none" stroke-linecap="round"/>
</g>
<path d="M56,24 l3,-3.5 l3,3.5 z" fill="#f2c1c8" stroke="#8a4a55" stroke-width=".8" stroke-linejoin="round"/>
${eyes}
<path d="M46,39.5 v3 M54,39.5 v2.4" stroke="#5fc8d8" stroke-width=".9" opacity=".75" stroke-linecap="round"/>
<path d="M48,43 q2,-1 4,0" stroke="#3a5e66" stroke-width="1" fill="none" stroke-linecap="round"/>
${bubbles}
</svg>`;
}

/** Portrait blink (SMIL on an eye's ry); nothing in animation frames, which draw `pose.blink` instead. */
const blink = (pose, ry, dur) => (pose ? '' : `<animate attributeName="ry" values="${ry};${ry};.3;${ry}" keyTimes="0;.9;.95;1" dur="${dur}" repeatCount="indefinite"/>`);

/** Slime Aconchegante:a round mint slime in a knitted beanie and scarf, sleepy smile, squishing. */
function cozySlimeSvg(pose) {
  const ph = pose ? pose.t * TAU : 0;
  // squash & stretch around the base
  const sy = pose ? 1 + Math.sin(ph) * 0.07 : 1;
  const sx = pose ? 1 - Math.sin(ph) * 0.05 : 1;
  const tail = pose ? Math.sin(ph - 0.7) * 6 : 0;
  const eyes = pose?.blink
    ? '<path d="M39,50 q3,2.4 6,0 M55,50 q3,2.4 6,0" stroke="#24533c" stroke-width="2" fill="none" stroke-linecap="round"/>'
    : `<ellipse cx="42" cy="50" rx="3" ry="3.6" fill="#24533c">${blink(pose, 3.6, '4.6s')}</ellipse><ellipse cx="58" cy="50" rx="3" ry="3.6" fill="#24533c">${blink(pose, 3.6, '4.6s')}</ellipse>`
      + '<circle cx="43" cy="48.8" r="1.1" fill="#fff"/><circle cx="59" cy="48.8" r="1.1" fill="#fff"/>';
  const body = `<path d="M18,74 C16,52 30,30 50,30 C70,30 84,52 82,74 C82,80 76,82 70,82 L30,82 C24,82 18,80 18,74 Z" fill="url(#csB)" stroke="#2f7a58" stroke-width="2.2"/>
<ellipse cx="36" cy="44" rx="7" ry="4.5" fill="#fff" opacity=".55" transform="rotate(-25 36 44)"/>
<ellipse cx="35" cy="58" rx="4.2" ry="2.6" fill="#ff9fb2" opacity=".75"/><ellipse cx="65" cy="58" rx="4.2" ry="2.6" fill="#ff9fb2" opacity=".75"/>
${eyes}
<path d="M46,58 q4,3.5 8,0" stroke="#24533c" stroke-width="1.8" fill="none" stroke-linecap="round"/>
<path d="M30,33 C34,18 66,18 70,33 C62,29 38,29 30,33 Z" fill="#d9534f" stroke="#7a2422" stroke-width="2" stroke-linejoin="round"/>
<path d="M30,33 C38,29 62,29 70,33 L70,37 C62,33 38,33 30,37 Z" fill="#f2e6c9" stroke="#7a2422" stroke-width="1.6"/>
<path d="M36,33.5 v3 M42,32 v3 M48,31.4 v3 M54,31.4 v3 M60,32 v3 M66,33.5 v3" stroke="#c9b993" stroke-width="1"/>
<circle cx="50" cy="16" r="5" fill="#f2e6c9" stroke="#7a2422" stroke-width="1.6"/>
<path d="M24,70 C38,76 62,76 76,70 L76,75 C62,81 38,81 24,75 Z" fill="#f2b84b" stroke="#8a5a14" stroke-width="1.8" stroke-linejoin="round"/>
<path d="M66,74 C68,80 ${f1(66 + tail)},86 ${f1(70 + tail)},92 L${f1(76 + tail)},90 C${f1(72 + tail)},84 72,79 72,73 Z" fill="#f2b84b" stroke="#8a5a14" stroke-width="1.6" stroke-linejoin="round"/>
<path d="M${f1(70 + tail)},92 l1,3 M${f1(73 + tail)},91 l1,3" stroke="#8a5a14" stroke-width="1.2"/>`;
  const squish = pose
    ? `<g transform="translate(50 82) scale(${sx.toFixed(3)} ${sy.toFixed(3)}) translate(-50 -82)">${body}</g>`
    : `<g transform="translate(50 82)"><g><animateTransform attributeName="transform" type="scale" values="1 1;1.05 .93;.96 1.06;1 1" dur="1.8s" repeatCount="indefinite"/><g transform="translate(-50 -82)">${body}</g></g></g>`;
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
<defs>
<radialGradient id="csG" cx="50%" cy="58%"><stop offset="0" stop-color="#b9f5cf" stop-opacity=".45"/><stop offset="1" stop-color="#b9f5cf" stop-opacity="0"/></radialGradient>
<radialGradient id="csB" cx="40%" cy="35%"><stop offset="0" stop-color="#c8f7d6"/><stop offset=".6" stop-color="#7fdba4"/><stop offset="1" stop-color="#4fb782"/></radialGradient>
</defs>
<circle cx="50" cy="56" r="44" fill="url(#csG)"/>
<ellipse cx="50" cy="86" rx="28" ry="4" fill="#000" opacity=".18"/>
${squish}
</svg>`;
}

/** Olho Abissal: a huge floating eyeball with a green slit iris and dark tentacles beneath (it never blinks: a lid read as the eye going dark). */
function abyssEyeSvg(pose) {
  const ph = pose ? pose.t * TAU : 0;
  const look = pose ? Math.sin(ph) * 5 : 0;
  const lookY = pose ? Math.cos(ph * 2) * 1.5 : 0;
  let tentacles = '';
  [[34, -1], [44, -0.4], [56, 0.4], [66, 1]].forEach(([x, dir], i) => {
    const w = pose ? Math.sin(ph + i * 1.3) * 7 : 0;
    const d = `M${x - 4},62 C${x - 4 + dir * 4},74 ${f1(x + w)},80 ${f1(x + dir * 6 + w * 1.4)},94 C${f1(x + dir * 2 + w)},84 ${x + 4 + dir * 2},74 ${x + 4},62 Z`;
    tentacles += `<path d="${d}" fill="#3a1f4f" stroke="#160a22" stroke-width="1.6" stroke-linejoin="round">${pose ? '' : `<animateTransform attributeName="transform" type="rotate" values="-7 ${x} 62;7 ${x} 62;-7 ${x} 62" dur="${(2.2 + i * 0.35).toFixed(2)}s" repeatCount="indefinite"/>`}</path>`;
    tentacles += `<circle cx="${f1(x + dir * 3 + w * 0.8)}" cy="80" r="1.4" fill="#c46bff" opacity=".8"/>`;
  });
  const iris = `<g transform="translate(${f1(look)} ${f1(lookY)})">${pose ? '' : '<animateTransform attributeName="transform" type="translate" values="-5 0;5 1;0 -1;-5 0" dur="5s" repeatCount="indefinite"/>'}
<circle cx="50" cy="42" r="12" fill="url(#aeI)" stroke="#0d3a24" stroke-width="1.6"/>
<ellipse cx="50" cy="42" rx="2.8" ry="9" fill="#06140d"/>
<circle cx="46" cy="37.5" r="2.4" fill="#fff" opacity=".85"/>
</g>`;
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
<defs>
<radialGradient id="aeG" cx="50%" cy="45%"><stop offset="0" stop-color="#7cffb5" stop-opacity=".38"/><stop offset=".6" stop-color="#7b3fbf" stop-opacity=".2"/><stop offset="1" stop-color="#7b3fbf" stop-opacity="0"/></radialGradient>
<radialGradient id="aeW" cx="42%" cy="35%"><stop offset="0" stop-color="#fbf4ff"/><stop offset=".7" stop-color="#e4d2ee"/><stop offset="1" stop-color="#b48fc9"/></radialGradient>
<radialGradient id="aeI" cx="50%" cy="50%"><stop offset="0" stop-color="#d6ffe6"/><stop offset=".45" stop-color="#3fe08a"/><stop offset="1" stop-color="#127a46"/></radialGradient>
</defs>
<circle cx="50" cy="48" r="47" fill="url(#aeG)"/>
${tentacles}
<circle cx="50" cy="42" r="26" fill="url(#aeW)" stroke="#2a1238" stroke-width="2.4"/>
<path d="M28,50 q6,-2 10,2 M72,50 q-6,-2 -10,2 M33,30 q5,3 6,8 M67,30 q-5,3 -6,8" stroke="#d94b6a" stroke-width="1" fill="none" opacity=".75"/>
${iris}
<path d="M30,26 C36,18 64,18 70,26" stroke="#2a1238" stroke-width="2" fill="none" opacity=".6"/>
</svg>`;
}

/** Gato das Sete Vidas: a little black cat spirit with glowing eyes, a bell collar and a swishing tail. */
function sevenLivesCatSvg(pose) {
  const ph = pose ? pose.t * TAU : 0;
  const swish = pose ? Math.sin(ph) * 14 : 0;
  const ear = pose ? Math.max(0, Math.sin(ph * 2 - 1)) * 8 : 0;
  const eyes = pose?.blink
    ? '<path d="M37,46 q4.5,3 9,0 M54,46 q4.5,3 9,0" stroke="#ffd84a" stroke-width="2" fill="none" stroke-linecap="round"/>'
    : `<ellipse cx="41.5" cy="46" rx="4.4" ry="5" fill="#ffd84a">${blink(pose, 5, '4s')}</ellipse><ellipse cx="58.5" cy="46" rx="4.4" ry="5" fill="#ffd84a">${blink(pose, 5, '4s')}</ellipse>`
      + `<ellipse cx="41.5" cy="46" rx="1.3" ry="4" fill="#1b1424">${blink(pose, 4, '4s')}</ellipse><ellipse cx="58.5" cy="46" rx="1.3" ry="4" fill="#1b1424">${blink(pose, 4, '4s')}</ellipse>`
      + '<circle cx="40" cy="44" r="1" fill="#fff"/><circle cx="57" cy="44" r="1" fill="#fff"/>';
  const tail = `<path d="M62,80 C76,82 84,72 ${f1(82 + swish * 0.3)},60 C${f1(80 + swish * 0.6)},52 ${f1(86 + swish)},44 ${f1(90 + swish)},48 C${f1(92 + swish)},54 ${f1(86 + swish * 0.6)},60 ${f1(88 + swish * 0.3)},66 C90,80 78,90 62,86 Z" fill="#2a2236" stroke="#0e0a14" stroke-width="1.8" stroke-linejoin="round">${pose ? '' : '<animateTransform attributeName="transform" type="rotate" values="-8 64 82;10 64 82;-8 64 82" dur="2.2s" repeatCount="indefinite"/>'}</path>`;
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
<defs>
<radialGradient id="ccG" cx="50%" cy="52%"><stop offset="0" stop-color="#ffe27a" stop-opacity=".34"/><stop offset=".6" stop-color="#9d7bff" stop-opacity=".18"/><stop offset="1" stop-color="#9d7bff" stop-opacity="0"/></radialGradient>
<radialGradient id="ccB" cx="40%" cy="30%"><stop offset="0" stop-color="#4a3e5e"/><stop offset="1" stop-color="#211a2c"/></radialGradient>
</defs>
<circle cx="50" cy="52" r="46" fill="url(#ccG)"/>
${tail}
<path d="M32,88 C26,76 30,62 38,58 L62,58 C70,62 74,76 68,88 Z" fill="url(#ccB)" stroke="#0e0a14" stroke-width="2" stroke-linejoin="round"/>
<path d="M38,88 v-6 M46,88 v-5 M54,88 v-5 M62,88 v-6" stroke="#0e0a14" stroke-width="1.4"/>
<path d="M30,40 L${f1(31 - ear * 0.2)},${f1(20 + ear * 0.6)} L42,28 Z" fill="#2a2236" stroke="#0e0a14" stroke-width="2" stroke-linejoin="round">${pose ? '' : '<animateTransform attributeName="transform" type="rotate" values="0 36 34;0 36 34;-14 36 34;0 36 34" keyTimes="0;.8;.86;1" dur="3.4s" repeatCount="indefinite"/>'}</path>
<path d="M70,40 L69,20 L58,28 Z" fill="#2a2236" stroke="#0e0a14" stroke-width="2" stroke-linejoin="round"/>
<path d="M33,37 L33.5,26 L39,30 Z M67,37 L66.5,26 L61,30 Z" fill="#e88aa8" opacity=".75"/>
<ellipse cx="50" cy="45" rx="21" ry="18" fill="url(#ccB)" stroke="#0e0a14" stroke-width="2"/>
${eyes}
<path d="M48.6,52 L51.4,52 L50,53.8 Z" fill="#e88aa8"/>
<path d="M50,53.8 q-2.4,2.6 -4.6,0.8 M50,53.8 q2.4,2.6 4.6,0.8" stroke="#c9b6e8" stroke-width="1.1" fill="none" stroke-linecap="round"/>
<path d="M30,50 l-8,-2 M30,53 l-8,1 M70,50 l8,-2 M70,53 l8,1" stroke="#c9b6e8" stroke-width=".9" opacity=".8"/>
<path d="M36,61 q14,6 28,0" stroke="#b02a3c" stroke-width="3.2" fill="none" stroke-linecap="round"/>
<circle cx="50" cy="66" r="3.4" fill="#f2c94c" stroke="#8a6414" stroke-width="1.2">${pose ? '' : '<animateTransform attributeName="transform" type="rotate" values="-12 50 62;12 50 62;-12 50 62" dur="1.6s" repeatCount="indefinite"/>'}</circle>
<path d="M48.6,67.4 h2.8" stroke="#8a6414" stroke-width=".9"/>
</svg>`;
}

/** Duende Ganancioso: a grinning green goblin hugging a sack of gold, a coin spinning over its hand. */
function greedGoblinSvg(pose) {
  const ph = pose ? pose.t * TAU : 0;
  const coinY = pose ? 12 - Math.abs(Math.sin(ph)) * 8 : 12;
  const coinW = pose ? Math.abs(Math.cos(ph * 2)) * 4.2 + 0.6 : 4.2;
  const earW = pose ? Math.sin(ph * 2) * 4 : 0;
  const eyes = pose?.blink
    ? '<path d="M40,40 h6 M54,40 h6" stroke="#1d2a0c" stroke-width="2" stroke-linecap="round"/>'
    : `<ellipse cx="43" cy="40" rx="3.4" ry="4" fill="#fff6c8">${blink(pose, 4, '4.2s')}</ellipse><ellipse cx="57" cy="40" rx="3.4" ry="4" fill="#fff6c8">${blink(pose, 4, '4.2s')}</ellipse>`
      + `<ellipse cx="43.6" cy="40.6" rx="1.8" ry="1.8" fill="#1d2a0c">${blink(pose, 1.8, '4.2s')}</ellipse><ellipse cx="57.6" cy="40.6" rx="1.8" ry="1.8" fill="#1d2a0c">${blink(pose, 1.8, '4.2s')}</ellipse>`;
  const coin = pose
    ? `<ellipse cx="74" cy="${f1(coinY)}" rx="${coinW.toFixed(2)}" ry="4.2" fill="#ffd84a" stroke="#8a6414" stroke-width="1.2"/>`
    : '<ellipse cx="74" cy="12" rx="4.2" ry="4.2" fill="#ffd84a" stroke="#8a6414" stroke-width="1.2"><animate attributeName="rx" values="4.2;.6;4.2;.6;4.2" dur="1s" repeatCount="indefinite"/><animate attributeName="cy" values="12;4;12" dur="1s" repeatCount="indefinite"/></ellipse>';
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
<defs>
<radialGradient id="ggG" cx="50%" cy="55%"><stop offset="0" stop-color="#ffd84a" stop-opacity=".42"/><stop offset="1" stop-color="#ffd84a" stop-opacity="0"/></radialGradient>
<radialGradient id="ggS" cx="45%" cy="40%"><stop offset="0" stop-color="#c99a5b"/><stop offset="1" stop-color="#7a5326"/></radialGradient>
</defs>
<circle cx="50" cy="54" r="46" fill="url(#ggG)"/>
<path d="M30,92 C24,78 30,62 40,58 L60,58 C70,62 74,76 70,92 Z" fill="#5a7a2a" stroke="#22300c" stroke-width="2" stroke-linejoin="round"/>
<path d="M36,62 L64,62 L60,74 L40,74 Z" fill="#7a4a2a" stroke="#2e1a0a" stroke-width="1.6"/>
<g>${pose ? '' : '<animateTransform attributeName="transform" type="rotate" values="0 26 36;-10 26 36;0 26 36" dur="1.4s" repeatCount="indefinite"/>'}
<path d="M33,38 C24,${f1(30 - earW)} 14,${f1(30 - earW)} 8,${f1(26 - earW)} C14,40 22,44 32,44 Z" fill="#8ec24a" stroke="#22300c" stroke-width="2" stroke-linejoin="round"/></g>
<g>${pose ? '' : '<animateTransform attributeName="transform" type="rotate" values="0 74 36;10 74 36;0 74 36" dur="1.4s" repeatCount="indefinite"/>'}
<path d="M67,38 C76,${f1(30 - earW)} 86,${f1(30 - earW)} 92,${f1(26 - earW)} C86,40 78,44 68,44 Z" fill="#8ec24a" stroke="#22300c" stroke-width="2" stroke-linejoin="round"/></g>
<ellipse cx="50" cy="42" rx="18" ry="17" fill="#8ec24a" stroke="#22300c" stroke-width="2.2"/>
<path d="M33,32 C38,22 62,22 67,32 L64,30 C58,24 42,24 36,30 Z" fill="#6b3a1e"/>
${eyes}
<path d="M38,35 l9,2 M62,35 l-9,2" stroke="#22300c" stroke-width="1.8" stroke-linecap="round"/>
<path d="M48,44 q2,3 4,0" stroke="#22300c" stroke-width="1.3" fill="none"/>
<path d="M39,49 C44,55 56,55 61,49 C56,51 44,51 39,49 Z" fill="#3a1408" stroke="#22300c" stroke-width="1.4" stroke-linejoin="round"/>
<path d="M43,50.4 v2 M47,51 v2.2 M53,51 v2.2 M57,50.4 v2" stroke="#fff6c8" stroke-width="1.6"/>
<path d="M30,96 C26,84 32,72 44,70 C52,68 64,74 66,86 C68,94 58,98 46,98 C38,98 32,98 30,96 Z" fill="url(#ggS)" stroke="#3e2410" stroke-width="2" stroke-linejoin="round"/>
<path d="M40,72 C42,66 52,64 56,70" fill="none" stroke="#3e2410" stroke-width="2"/>
<path d="M46,74 l-2,-4 l4,0 z" fill="#d9a441"/>
<circle cx="40" cy="70" r="3.4" fill="#ffd84a" stroke="#8a6414" stroke-width="1.1"/><circle cx="48" cy="67" r="3.4" fill="#ffd84a" stroke="#8a6414" stroke-width="1.1"/><circle cx="55" cy="69" r="3" fill="#ffd84a" stroke="#8a6414" stroke-width="1.1"/>
<path d="M44,84 h8 M48,80 v8" stroke="#ffd84a" stroke-width="2.2" stroke-linecap="round"/>
<path d="M66,80 C72,74 74,64 72,54" stroke="#8ec24a" stroke-width="5" fill="none" stroke-linecap="round"/>
<path d="M66,80 C72,74 74,64 72,54" stroke="#22300c" stroke-width="1.4" fill="none" opacity=".5"/>
<circle cx="72" cy="52" r="3.6" fill="#8ec24a" stroke="#22300c" stroke-width="1.6"/>
${coin}
<path d="M70,4 l1.2,-2.4 M78,6 l2.2,-1.4" stroke="#fff6c8" stroke-width="1" opacity=".8"/>
</svg>`;
}

/**
 * Grimório Sussurrante: an old leather tome with an eye on its cover, tentacles creeping out of its
 * pages and green runes glowing in the air; it tilts, its cover breathes open, the eye blinks.
 */
function whisperingTomeSvg(pose) {
  const ph = pose ? pose.t * TAU : 0;
  const tilt = pose ? Math.sin(ph) * 4 : 0;
  const open = pose ? (Math.sin(ph * 2) + 1) * 2 : 0;
  const rune = pose ? 0.45 + 0.4 * Math.abs(Math.sin(ph * 1.5)) : 0.8;
  let tentacles = '';
  [[34, 70, -1], [50, 74, 0], [66, 70, 1]].forEach(([x, y, dir], i) => {
    const w = pose ? Math.sin(ph + i * 1.7) * 5 : 0;
    tentacles += `<path d="M${x - 3},${y - 4} C${x - 3 + dir * 3},${y + 6} ${f1(x + dir * 6 + w)},${y + 10} ${f1(x + dir * 9 + w * 1.4)},${y + 20} C${f1(x + dir * 4 + w)},${y + 12} ${x + 3},${y + 6} ${x + 3},${y - 4} Z" fill="#2f5a4c" stroke="#10241d" stroke-width="1.5" stroke-linejoin="round">${pose ? '' : `<animateTransform attributeName="transform" type="rotate" values="-8 ${x} ${y - 4};8 ${x} ${y - 4};-8 ${x} ${y - 4}" dur="${(2 + i * 0.4).toFixed(1)}s" repeatCount="indefinite"/>`}</path>`;
  });
  let runes = '';
  [['M18,30 l4,-6 l4,6 M20,27 h4', 0], ['M76,24 v8 M72,28 h8', 1], ['M80,52 l5,5 M85,52 l-5,5', 2]].forEach(([d, i]) => {
    runes += `<path d="${d}" stroke="#7dffb0" stroke-width="1.6" fill="none" stroke-linecap="round" opacity="${pose ? f1(rune) : 0.8}">${pose ? '' : `<animate attributeName="opacity" values=".2;.95;.2" dur="${(2 + i * 0.6).toFixed(1)}s" repeatCount="indefinite"/>`}</path>`;
  });
  const eye = pose?.blink
    ? '<path d="M44,44 q6,3 12,0" stroke="#7dffb0" stroke-width="1.8" fill="none" stroke-linecap="round"/>'
    : `<ellipse cx="50" cy="44" rx="7" ry="4.6" fill="#e9f7df" stroke="#10241d" stroke-width="1.4">${pose ? '' : '<animate attributeName="ry" values="4.6;4.6;.4;4.6" keyTimes="0;.9;.95;1" dur="4.8s" repeatCount="indefinite"/>'}</ellipse>`
      + `<ellipse cx="50" cy="44" rx="1.6" ry="3.6" fill="#1aa35e">${pose ? '' : '<animate attributeName="ry" values="3.6;3.6;.3;3.6" keyTimes="0;.9;.95;1" dur="4.8s" repeatCount="indefinite"/>'}</ellipse>`;
  const cover = `<path d="M26,${f1(26 - open)} L70,${f1(22 - open)} L74,64 L30,68 Z" fill="url(#wtC)" stroke="#2a1508" stroke-width="2.2" stroke-linejoin="round"/>`;
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
<defs>
<radialGradient id="wtG" cx="50%" cy="48%"><stop offset="0" stop-color="#7dffb0" stop-opacity=".32"/><stop offset=".65" stop-color="#3a6b5a" stop-opacity=".15"/><stop offset="1" stop-color="#3a6b5a" stop-opacity="0"/></radialGradient>
<linearGradient id="wtC" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7a4a2a"/><stop offset="1" stop-color="#4a2a14"/></linearGradient>
</defs>
<circle cx="50" cy="48" r="46" fill="url(#wtG)"/>
${runes}
<g transform="rotate(${f1(tilt)} 50 48)">${pose ? '' : '<animateTransform attributeName="transform" type="rotate" values="-4 50 48;4 50 48;-4 50 48" dur="3.4s" repeatCount="indefinite"/>'}
${tentacles}
<path d="M30,30 L74,26 L78,66 L34,70 Z" fill="#efe2bf" stroke="#5a4426" stroke-width="1.6" stroke-linejoin="round"/>
<path d="M33,64 L76,60 M33,61 L76,57 M33,67 L77,63" stroke="#c9b48a" stroke-width=".9"/>
${pose ? cover : `<g>${cover}<animateTransform attributeName="transform" type="translate" values="0 0;0 -3;0 0" dur="2.8s" repeatCount="indefinite"/></g>`}
<path d="M30,30 L34,70" stroke="#2a1508" stroke-width="3" stroke-linecap="round"/>
<path d="M50,34 L58,46 L50,56 L42,46 Z" fill="none" stroke="#c9a24a" stroke-width="1.4" opacity=".9"/>
<circle cx="50" cy="45" r="11" fill="none" stroke="#c9a24a" stroke-width="1.2" stroke-dasharray="2 2"/>
${eye}
<path d="M28,40 h4 M28,52 h4 M70,36 h4 M71,50 h4" stroke="#c9a24a" stroke-width="1.6" stroke-linecap="round"/>
</g>
</svg>`;
}

/**
 * O Dormente de R'lyeh: a little octopus-headed god asleep on a sunken stone, wings folded, face
 * tentacles drooping; it breathes, "Z" bubbles rise, and now and then it opens one red eye
 * (the blink frames are its eye opening, not closing).
 */
function sleeperSvg(pose) {
  const ph = pose ? pose.t * TAU : 0;
  const breath = pose ? 1 + Math.sin(ph) * 0.04 : 1;
  let zs = '';
  [[64, 0, 7], [72, 0.33, 5.5], [58, 0.66, 4.5]].forEach(([x, off, size], i) => {
    const z = `M0,0 h${size} l-${size},${size} h${size}`;
    if (pose) {
      const k = (pose.t + off) % 1;
      zs += `<path d="${z}" transform="translate(${f1(x + k * 8)} ${f1(30 - k * 26)})" stroke="#bfe3ff" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="${f1(Math.sin(k * Math.PI))}"/>`;
    } else {
      zs += `<path d="${z}" stroke="#bfe3ff" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="0"><animateTransform attributeName="transform" type="translate" values="${x} 30;${x + 8} 4" dur="3s" begin="${(i * 1).toFixed(1)}s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;1;0" dur="3s" begin="${(i * 1).toFixed(1)}s" repeatCount="indefinite"/></path>`;
    }
  });
  const sleepEyes = '<path d="M40,42 q4,3 8,0" stroke="#10301f" stroke-width="1.8" fill="none" stroke-linecap="round"/>';
  const awake = pose?.blink
    ? '<ellipse cx="56" cy="42" rx="3.4" ry="3" fill="#ff3b3b"/><ellipse cx="56" cy="42" rx="1" ry="2.6" fill="#2a0505"/>'
    : (pose ? '<path d="M52,42 q4,3 8,0" stroke="#10301f" stroke-width="1.8" fill="none" stroke-linecap="round"/>'
      : '<path d="M52,42 q4,3 8,0" stroke="#10301f" stroke-width="1.8" fill="none" stroke-linecap="round"/><ellipse cx="56" cy="42" rx="3.4" ry="0" fill="#ff3b3b"><animate attributeName="ry" values="0;0;3;3;0" keyTimes="0;.82;.86;.94;1" dur="6s" repeatCount="indefinite"/></ellipse>');
  const body = `<path d="M30,66 C24,58 28,46 34,44 L66,44 C72,46 76,58 70,66 Z" fill="#3f6b4f" stroke="#10301f" stroke-width="2" stroke-linejoin="round"/>
<path d="M30,52 C18,44 14,34 18,26 C22,34 28,38 34,42 Z M70,52 C82,44 86,34 82,26 C78,34 72,38 66,42 Z" fill="#2d4f3a" stroke="#10301f" stroke-width="1.8" stroke-linejoin="round"/>
<path d="M20,30 l4,6 M80,30 l-4,6" stroke="#10301f" stroke-width="1.2"/>
<ellipse cx="50" cy="36" rx="17" ry="16" fill="url(#slH)" stroke="#10301f" stroke-width="2.2"/>
<path d="M40,26 q3,-3 6,0 M54,24 q3,-3 6,0" stroke="#7fb38f" stroke-width="1.2" fill="none" opacity=".7"/>
${sleepEyes}${awake}
<path d="M40,48 C39,56 41,62 38,66 M45,49 C45,58 46,62 44,68 M50,49 C50,58 51,63 50,69 M55,49 C55,58 54,62 56,68 M60,48 C61,56 59,62 62,66" stroke="#4f8a63" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  const breathe = pose
    ? `<g transform="translate(50 66) scale(1 ${breath.toFixed(3)}) translate(-50 -66)">${body}</g>`
    : `<g transform="translate(50 66)"><g><animateTransform attributeName="transform" type="scale" values="1 1;1.02 1.05;1 1" dur="3.6s" repeatCount="indefinite"/><g transform="translate(-50 -66)">${body}</g></g></g>`;
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
<defs>
<radialGradient id="slG" cx="50%" cy="55%"><stop offset="0" stop-color="#5fffc0" stop-opacity=".3"/><stop offset=".6" stop-color="#2a5a7a" stop-opacity=".22"/><stop offset="1" stop-color="#2a5a7a" stop-opacity="0"/></radialGradient>
<radialGradient id="slH" cx="40%" cy="30%"><stop offset="0" stop-color="#7fc79a"/><stop offset="1" stop-color="#3f6b4f"/></radialGradient>
<linearGradient id="slS" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6d7f78"/><stop offset="1" stop-color="#2e3a36"/></linearGradient>
</defs>
<circle cx="50" cy="54" r="46" fill="url(#slG)"/>
<path d="M14,78 C16,68 30,64 50,64 C70,64 84,68 86,78 C84,88 70,92 50,92 C30,92 16,88 14,78 Z" fill="url(#slS)" stroke="#161d1b" stroke-width="2"/>
<path d="M24,74 l4,-2 l3,3 M64,80 l5,-3 l4,2 M40,84 l3,-3" stroke="#a6b8a8" stroke-width="1.2" fill="none" opacity=".7"/>
<circle cx="30" cy="84" r="1.6" fill="#d9e6d0"/><circle cx="72" cy="72" r="1.4" fill="#d9e6d0"/>
${breathe}
${zs}
</svg>`;
}

/** Rainha das Mariposas Lunares: a pale moon moth with eyes on her wings and a crescent crown. */
function moonMothQueenSvg(pose) {
  const ph = pose ? pose.t * TAU : 0;
  const flap = pose ? 0.82 + 0.18 * Math.cos(ph) : 1;
  const eyeR = pose?.blink ? 0.4 : 3.6;
  let dust = '';
  [[34, 0], [62, 0.35], [48, 0.7]].forEach(([x, off], i) => {
    if (pose) {
      const k = (pose.t + off) % 1;
      dust += `<circle cx="${x}" cy="${f1(60 + k * 34)}" r="1.4" fill="#fff8d6" opacity="${f1(1 - k)}"/>`;
    } else {
      dust += `<circle cx="${x}" cy="60" r="1.4" fill="#fff8d6"><animate attributeName="cy" values="60;94" dur="2.4s" begin="${(i * 0.8).toFixed(1)}s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;0" dur="2.4s" begin="${(i * 0.8).toFixed(1)}s" repeatCount="indefinite"/></circle>`;
    }
  });
  const spot = (cx, cy) => `<circle cx="${cx}" cy="${cy}" r="6" fill="#4a3a7a" stroke="#e8e0ff" stroke-width="1.2"/><ellipse cx="${cx}" cy="${cy}" rx="3" ry="${eyeR}" fill="#ffd36b">${pose ? '' : '<animate attributeName="ry" values="3.6;3.6;.4;3.6" keyTimes="0;.88;.93;1" dur="5s" repeatCount="indefinite"/>'}</ellipse><circle cx="${cx}" cy="${cy}" r="1.2" fill="#2a1a4a"/>`;
  const wing = (side) => {
    const s = side;
    return `<path d="M50,44 C${50 + s * 10},22 ${50 + s * 36},12 ${50 + s * 44},24 C${50 + s * 48},38 ${50 + s * 30},48 50,50 Z" fill="url(#mqW)" stroke="#6a5aa0" stroke-width="1.8" stroke-linejoin="round"/>
<path d="M50,52 C${50 + s * 20},54 ${50 + s * 36},62 ${50 + s * 30},76 C${50 + s * 26},84 ${50 + s * 16},74 50,58 Z" fill="url(#mqW)" stroke="#6a5aa0" stroke-width="1.6" stroke-linejoin="round"/>
<path d="M${50 + s * 26},76 C${50 + s * 30},84 ${50 + s * 26},92 ${50 + s * 22},94" stroke="#cfc4ff" stroke-width="2" fill="none" stroke-linecap="round"/>
${spot(50 + s * 28, 30)}<circle cx="${50 + s * 22}" cy="64" r="3" fill="#ffd36b" opacity=".85"/>`;
  };
  const wings = pose
    ? `<g transform="translate(50 48) scale(${flap.toFixed(3)} 1) translate(-50 -48)">${wing(-1)}${wing(1)}</g>`
    : `<g transform="translate(50 48)"><g><animateTransform attributeName="transform" type="scale" values="1 1;.8 1;1 1" dur="1.6s" repeatCount="indefinite"/><g transform="translate(-50 -48)">${wing(-1)}${wing(1)}</g></g></g>`;
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
<defs>
<radialGradient id="mqG" cx="50%" cy="46%"><stop offset="0" stop-color="#e8f0ff" stop-opacity=".5"/><stop offset="1" stop-color="#b9c8ff" stop-opacity="0"/></radialGradient>
<linearGradient id="mqW" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4f0ff"/><stop offset="1" stop-color="#b8a8e8"/></linearGradient>
</defs>
<circle cx="50" cy="48" r="47" fill="url(#mqG)"/>
${wings}
<ellipse cx="50" cy="56" rx="5.5" ry="16" fill="#efe6d0" stroke="#6a5a4a" stroke-width="1.6"/>
<path d="M45.5,52 h9 M45,57 h10 M45.5,62 h9" stroke="#c9b892" stroke-width="1"/>
<circle cx="50" cy="40" r="7" fill="#f7f0de" stroke="#6a5a4a" stroke-width="1.6"/>
<circle cx="47.2" cy="40" r="1.6" fill="#2a1a4a"/><circle cx="52.8" cy="40" r="1.6" fill="#2a1a4a"/>
<path d="M47,33 C42,26 38,24 34,25 M53,33 C58,26 62,24 66,25" stroke="#6a5a4a" stroke-width="1.3" fill="none"/>
<path d="M45,30 C45,22 55,22 55,30 C53,26 47,26 45,30 Z" fill="#ffe9a0" stroke="#b08a2a" stroke-width="1.2"/>
<path d="M50,20 C47,22 47,27 50,29 C48,26 48,23 50,20 Z" fill="#fffbe0" stroke="#b08a2a" stroke-width=".9"/>
${dust}
</svg>`;
}

/**
 * O Rei do Castelo Tentacular: a little crowned king robed in tentacles, a green eye on his brow,
 * the floating castle of the title screen behind him.
 */
function tentacleKingSvg(pose) {
  const ph = pose ? pose.t * TAU : 0;
  const crownY = pose ? Math.sin(ph) * 1.6 : 0;
  const glow = pose ? 0.55 + 0.45 * Math.abs(Math.sin(ph)) : 0.9;
  let robe = '';
  [[38, -1], [45, -0.4], [55, 0.4], [62, 1]].forEach(([x, dir], i) => {
    const w = pose ? Math.sin(ph + i * 1.2) * 4 : 0;
    robe += `<path d="M${x - 4},66 C${x - 4 + dir * 2},76 ${f1(x + w)},82 ${f1(x + dir * 5 + w * 1.3)},94 C${f1(x + dir * 2 + w)},84 ${x + 4},76 ${x + 4},66 Z" fill="#3a2458" stroke="#140a22" stroke-width="1.5" stroke-linejoin="round">${pose ? '' : `<animateTransform attributeName="transform" type="rotate" values="-7 ${x} 66;7 ${x} 66;-7 ${x} 66" dur="${(2 + i * 0.3).toFixed(1)}s" repeatCount="indefinite"/>`}</path>`;
  });
  const eyes = pose?.blink
    ? '<path d="M44,47 h4 M52,47 h4" stroke="#7dffb0" stroke-width="1.6" stroke-linecap="round"/>'
    : `<ellipse cx="46" cy="47" rx="1.8" ry="2.2" fill="#7dffb0">${pose ? '' : '<animate attributeName="ry" values="2.2;2.2;.3;2.2" keyTimes="0;.9;.95;1" dur="4.4s" repeatCount="indefinite"/>'}</ellipse><ellipse cx="54" cy="47" rx="1.8" ry="2.2" fill="#7dffb0">${pose ? '' : '<animate attributeName="ry" values="2.2;2.2;.3;2.2" keyTimes="0;.9;.95;1" dur="4.4s" repeatCount="indefinite"/>'}</ellipse>`;
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
<defs>
<radialGradient id="tkG" cx="50%" cy="46%"><stop offset="0" stop-color="#5fffa8" stop-opacity=".32"/><stop offset=".55" stop-color="#6a3aa8" stop-opacity=".22"/><stop offset="1" stop-color="#6a3aa8" stop-opacity="0"/></radialGradient>
<linearGradient id="tkR" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a3a8a"/><stop offset="1" stop-color="#2a1640"/></linearGradient>
</defs>
<circle cx="50" cy="48" r="47" fill="url(#tkG)"/>
<g opacity=".55">
<path d="M66,30 L70,14 L72,30 M74,30 L79,8 L82,30 M84,30 L87,18 L89,30" fill="#2a1a3a" stroke="#120a1a" stroke-width="1.2"/>
<path d="M62,30 L94,30 L88,38 L70,40 Z" fill="#3a2a2a" stroke="#120a1a" stroke-width="1.2"/>
<path d="M78,38 v16" stroke="#5fffc8" stroke-width="1.4" opacity=".8"/>
<circle cx="80" cy="22" r="1.4" fill="#5fffa8"/>
</g>
${robe}
<path d="M34,70 C30,58 36,44 50,42 C64,44 70,58 66,70 Z" fill="url(#tkR)" stroke="#140a22" stroke-width="2" stroke-linejoin="round"/>
<path d="M38,58 C44,62 56,62 62,58" stroke="#c9a24a" stroke-width="1.6" fill="none"/>
<circle cx="50" cy="61" r="2.4" fill="#5fffa8" stroke="#1a5a3a" stroke-width=".8"/>
<path d="M36,46 C36,30 64,30 64,46 C64,52 58,56 50,56 C42,56 36,52 36,46 Z" fill="#2a1640" stroke="#140a22" stroke-width="2"/>
<ellipse cx="50" cy="48" rx="10" ry="7" fill="#0c0614"/>
${eyes}
<ellipse cx="50" cy="38" rx="3.2" ry="3.6" fill="#e9f7df" stroke="#140a22" stroke-width="1.1"/>
<ellipse cx="50" cy="38" rx="1" ry="2.8" fill="#1aa35e" opacity="${glow.toFixed(2)}">${pose ? '' : '<animate attributeName="opacity" values=".5;1;.5" dur="1.8s" repeatCount="indefinite"/>'}</ellipse>
<g transform="translate(0 ${f1(crownY)})">${pose ? '' : '<animateTransform attributeName="transform" type="translate" values="0 0;0 -1.8;0 0" dur="2.6s" repeatCount="indefinite"/>'}
<path d="M38,30 L40,18 L45,25 L50,15 L55,25 L60,18 L62,30 Z" fill="#f2c94c" stroke="#8a6414" stroke-width="1.6" stroke-linejoin="round"/>
<circle cx="50" cy="26" r="2" fill="#5fffa8" stroke="#1a5a3a" stroke-width=".8"/>
<circle cx="40" cy="18" r="1.3" fill="#fff6c8"/><circle cx="50" cy="15" r="1.3" fill="#fff6c8"/><circle cx="60" cy="18" r="1.3" fill="#fff6c8"/>
</g>
</svg>`;
}

/**
 * Fagulha Errante: a little fire ghost, a flame for a head and a wispy ghost tail, big eyes and
 * rosy cheeks; its crown of fire flickers, the tail waves and embers float up.
 */
function emberWispSvg(pose) {
  const ph = pose ? pose.t * TAU : 0;
  const lick = pose ? Math.sin(ph * 2) * 4 : 0;
  const mid = pose ? Math.sin(ph) * 4 : 0;
  const tip = pose ? Math.sin(ph - 0.9) * 9 : 0;
  let embers = '';
  [[30, 0, 1.8], [70, 0.33, 2.2], [40, 0.66, 1.5]].forEach(([x, off, r], i) => {
    if (pose) {
      const k = (pose.t + off) % 1;
      embers += `<circle cx="${f1(x + Math.sin(k * TAU) * 3)}" cy="${f1(70 - k * 62)}" r="${r}" fill="#ffd36b" opacity="${f1(Math.sin(k * Math.PI))}"/>`;
    } else {
      embers += `<circle cx="${x}" cy="70" r="${r}" fill="#ffd36b" opacity="0"><animate attributeName="cy" values="70;8" dur="2.6s" begin="${(i * 0.85).toFixed(2)}s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;1;0" dur="2.6s" begin="${(i * 0.85).toFixed(2)}s" repeatCount="indefinite"/></circle>`;
    }
  });
  const flames = (d) => `M30,46 C28,34 ${f1(32 + d)},22 ${f1(38 + d)},14 C38,22 42,24 44,22 C44,14 ${f1(50 + d)},6 ${f1(54 + d)},2 C54,12 58,18 62,20 C62,14 ${f1(66 + d)},12 ${f1(70 + d)},10 C70,20 72,30 70,46 Z`;
  const crown = pose
    ? `<path d="${flames(lick)}" fill="url(#ewF)" stroke="#a8320c" stroke-width="2" stroke-linejoin="round"/>`
    : `<path d="${flames(0)}" fill="url(#ewF)" stroke="#a8320c" stroke-width="2" stroke-linejoin="round"><animate attributeName="d" values="${flames(-3)};${flames(3)};${flames(-3)}" dur="0.9s" repeatCount="indefinite"/></path>`;
  const tailD = (m, t) => `M28,48 C26,64 ${f1(34 + m)},76 ${f1(40 + t)},92 C${f1(44 + t)},84 ${f1(48 + m)},86 ${f1(52 + t)},94 C${f1(56 + m)},84 ${f1(60 + t)},88 ${f1(64 + t)},90 C${f1(68 + m)},76 74,64 72,48 Z`;
  const tail = pose
    ? `<path d="${tailD(mid, tip)}" fill="url(#ewT)" stroke="#a8320c" stroke-width="1.8" stroke-linejoin="round"/>`
    : `<path d="${tailD(0, 0)}" fill="url(#ewT)" stroke="#a8320c" stroke-width="1.8" stroke-linejoin="round"><animate attributeName="d" values="${tailD(-4, -9)};${tailD(4, 9)};${tailD(-4, -9)}" dur="2.4s" repeatCount="indefinite"/></path>`;
  const eyes = pose?.blink
    ? '<path d="M39,52 q4,2.6 8,0 M53,52 q4,2.6 8,0" stroke="#5a1806" stroke-width="2" fill="none" stroke-linecap="round"/>'
    : `<ellipse cx="43" cy="51" rx="4" ry="5" fill="#5a1806">${pose ? '' : '<animate attributeName="ry" values="5;5;.4;5" keyTimes="0;.9;.95;1" dur="4.2s" repeatCount="indefinite"/>'}</ellipse>`
      + `<ellipse cx="57" cy="51" rx="4" ry="5" fill="#5a1806">${pose ? '' : '<animate attributeName="ry" values="5;5;.4;5" keyTimes="0;.9;.95;1" dur="4.2s" repeatCount="indefinite"/>'}</ellipse>`
      + '<circle cx="44.4" cy="49" r="1.6" fill="#fff"/><circle cx="58.4" cy="49" r="1.6" fill="#fff"/>';
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
<defs>
<radialGradient id="ewG" cx="50%" cy="50%"><stop offset="0" stop-color="#ffb347" stop-opacity=".5"/><stop offset="1" stop-color="#ff7a1f" stop-opacity="0"/></radialGradient>
<linearGradient id="ewF" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ff8a1f"/><stop offset=".6" stop-color="#ffb52e"/><stop offset="1" stop-color="#ffe680"/></linearGradient>
<linearGradient id="ewT" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff7a2a" stop-opacity=".95"/><stop offset="1" stop-color="#ff4a1a" stop-opacity=".1"/></linearGradient>
<radialGradient id="ewB" cx="45%" cy="40%"><stop offset="0" stop-color="#fff0c0"/><stop offset=".6" stop-color="#ffc25a"/><stop offset="1" stop-color="#ff8a2a"/></radialGradient>
</defs>
<circle cx="50" cy="50" r="46" fill="url(#ewG)"/>
${tail}
${crown}
<ellipse cx="50" cy="52" rx="22" ry="17" fill="url(#ewB)" stroke="#a8320c" stroke-width="2"/>
<path d="M36,44 q4,-5 10,-6" stroke="#fff6d8" stroke-width="2" fill="none" stroke-linecap="round" opacity=".8"/>
${eyes}
<ellipse cx="37" cy="58" rx="3.6" ry="2.2" fill="#ff6a5a" opacity=".6"/><ellipse cx="63" cy="58" rx="3.6" ry="2.2" fill="#ff6a5a" opacity=".6"/>
<path d="M47,58 q3,3 6,0" stroke="#5a1806" stroke-width="1.6" fill="none" stroke-linecap="round"/>
${embers}
</svg>`;
}

/** Echo id -> hand-drawn art (pose) => svg string. */
export const ECHO_ART = {
  dawn_saint: lanternWispSvg,
  night_shade: pumpkinGhostSvg,
  gale_dancer: drownedSirenSvg,
  ember_wisp: emberWispSvg,
  moss_sprite: cozySlimeSvg,
  wailing_soul: whisperingTomeSvg,
  stone_colossus: greedGoblinSvg,
  tide_guardian: sevenLivesCatSvg,
  abyss_eye: abyssEyeSvg,
  ruin_spirit: sleeperSvg,
  moth_queen: moonMothQueenSvg,
  tentacle_king: tentacleKingSvg,
};

/** Map glow colour of the hand-drawn echoes ([hue, saturation, lightness], 0..1 for the last two). */
export const ECHO_ART_GLOW = {
  dawn_saint: [48, 1, 0.72],
  night_shade: [28, 0.95, 0.6],
  gale_dancer: [185, 0.9, 0.7],
  ember_wisp: [32, 1, 0.62],
  moss_sprite: [140, 0.7, 0.75],
  wailing_soul: [145, 1, 0.72],
  stone_colossus: [48, 1, 0.62],
  tide_guardian: [50, 1, 0.7],
  abyss_eye: [150, 0.9, 0.62],
  ruin_spirit: [155, 0.9, 0.6],
  moth_queen: [230, 1, 0.88],
  tentacle_king: [145, 1, 0.62],
};
