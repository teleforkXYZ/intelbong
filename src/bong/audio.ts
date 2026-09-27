let ctx: AudioContext | null = null;
let bus: GainNode | null = null;

const DB = 277.18;
const GB = 369.99;
const AB = 415.3;

const STEPS: { at: number; freq: number | null }[] = [
  { at: 0.02, freq: null },
  { at: 0.62, freq: DB },
  { at: 0.96, freq: GB },
  { at: 1.3, freq: DB },
  { at: 1.66, freq: AB },
];

const STACK = [
  { ratio: 0.25, delay: 0, gain: 0.15, voice: "bass" },
  { ratio: 0.5, delay: 0.04, gain: 0.11, voice: "synth" },
  { ratio: 1, delay: 0.08, gain: 0.13, voice: "marimba" },
  { ratio: 2, delay: 0.12, gain: 0.08, voice: "celeste" },
  { ratio: 4, delay: 0.16, gain: 0.05, voice: "glock" },
] as const;

export const NOTE_NAMES = ["spark", "D♭", "G♭", "D♭", "A♭"] as const;

export function playSpiral(onStep: (index: number) => void) {
  const audio = ctx ?? new AudioContext();
  ctx = audio;
  if (!bus) {
    bus = audio.createGain();
    bus.gain.value = 0.85;
    bus.connect(audio.destination);
  }
  void audio.resume();
  const start = audio.currentTime + 0.03;
  sparkle(audio, start);
  spiral(audio, start + 0.04, AB, false, 0.55);
  for (let i = 0; i < STEPS.length; i++) {
    const step = STEPS[i];
    if (step.freq) spiral(audio, start + step.at, step.freq, i === STEPS.length - 1, 1);
    window.setTimeout(() => onStep(i), step.at * 1000);
  }
}

function spiral(audio: AudioContext, when: number, freq: number, last: boolean, level: number) {
  for (const layer of STACK) {
    tone(audio, when + layer.delay, freq * layer.ratio, layer.voice, layer.gain * level, last);
  }
}

function tone(
  audio: AudioContext,
  when: number,
  freq: number,
  voice: (typeof STACK)[number]["voice"],
  gain: number,
  last: boolean,
) {
  const osc = audio.createOscillator();
  const amp = audio.createGain();
  const hold = last ? 1.15 : voice === "marimba" ? 0.28 : voice === "glock" || voice === "celeste" ? 0.62 : 0.42;
  osc.type = voice === "synth" ? "triangle" : "sine";
  osc.frequency.setValueAtTime(freq, when);
  if (voice === "glock" || voice === "celeste") {
    osc.frequency.exponentialRampToValueAtTime(freq * 1.008, when + 0.08);
  }
  amp.gain.setValueAtTime(0.0001, when);
  amp.gain.exponentialRampToValueAtTime(gain, when + (voice === "marimba" ? 0.008 : 0.02));
  amp.gain.exponentialRampToValueAtTime(0.0001, when + hold);
  osc.connect(amp).connect(bus ?? audio.destination);
  osc.start(when);
  osc.stop(when + hold + 0.05);

  if (voice === "celeste" || voice === "glock") {
    const partial = audio.createOscillator();
    const partialGain = audio.createGain();
    partial.type = "sine";
    partial.frequency.setValueAtTime(freq * (voice === "glock" ? 2.76 : 2.01), when);
    partialGain.gain.setValueAtTime(0.0001, when);
    partialGain.gain.exponentialRampToValueAtTime(gain * 0.35, when + 0.012);
    partialGain.gain.exponentialRampToValueAtTime(0.0001, when + hold * 0.55);
    partial.connect(partialGain).connect(bus ?? audio.destination);
    partial.start(when);
    partial.stop(when + hold * 0.6);
  }
}

function sparkle(audio: AudioContext, when: number) {
  const length = Math.floor(audio.sampleRate * 0.18);
  const buffer = audio.createBuffer(1, length, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    const fade = 1 - i / length;
    data[i] = (Math.random() * 2 - 1) * fade * fade;
  }
  const noise = audio.createBufferSource();
  noise.buffer = buffer;
  const filter = audio.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = 2200;
  const gain = audio.createGain();
  gain.gain.setValueAtTime(0.14, when);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.16);
  noise.connect(filter).connect(gain).connect(bus ?? audio.destination);
  noise.start(when);
}
