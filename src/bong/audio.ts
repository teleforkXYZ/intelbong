let ctx: AudioContext | null = null;
let bus: GainNode | null = null;

// Written D-G-D-A in five flats: Db, Gb, Db, Ab. Score says performance 0:03.
const DB = 554.37;
const GB = 739.99;
const AB = 830.61;

const STEPS: { at: number; freq: number | null }[] = [
  { at: 0.0, freq: null },
  { at: 0.14, freq: DB },
  { at: 0.3, freq: GB },
  { at: 0.46, freq: DB },
  { at: 0.64, freq: AB },
];

export const NOTE_NAMES = ["spark", "D♭", "G♭", "D♭", "A♭"] as const;

export function playSpiral(onStep: (index: number) => void) {
  const audio = ctx ?? new AudioContext();
  ctx = audio;
  if (!bus) {
    bus = audio.createGain();
    bus.gain.value = 0.9;
    bus.connect(audio.destination);
  }
  void audio.resume();
  const start = audio.currentTime + 0.02;
  sparkle(audio, start);
  for (let i = 0; i < STEPS.length; i++) {
    const step = STEPS[i];
    if (step.freq) chord(audio, start + step.at, step.freq, i === STEPS.length - 1);
    window.setTimeout(() => onStep(i), step.at * 1000);
  }
}

function chord(audio: AudioContext, when: number, freq: number, last: boolean) {
  // Score stacks the same attack: glock and celeste on top, marimba and bass under.
  hit(audio, when, freq, "glock", last ? 0.07 : 0.09, last ? 1.15 : 0.34);
  hit(audio, when, freq * 1.003, "celeste", last ? 0.05 : 0.06, last ? 0.9 : 0.3);
  hit(audio, when, freq / 2, "marimba", 0.11, last ? 0.42 : 0.16);
  hit(audio, when, freq / 4, "synth", 0.07, last ? 0.7 : 0.28);
  hit(audio, when, freq / 8, "bass", last ? 0.1 : 0.08, last ? 0.55 : 0.22);
}

function hit(
  audio: AudioContext,
  when: number,
  freq: number,
  voice: "glock" | "celeste" | "marimba" | "synth" | "bass",
  gain: number,
  hold: number,
) {
  const osc = audio.createOscillator();
  const amp = audio.createGain();
  osc.type = voice === "synth" ? "triangle" : "sine";
  osc.frequency.setValueAtTime(freq, when);
  amp.gain.setValueAtTime(0.0001, when);
  amp.gain.exponentialRampToValueAtTime(gain, when + (voice === "marimba" ? 0.004 : 0.008));
  amp.gain.exponentialRampToValueAtTime(0.0001, when + hold);
  osc.connect(amp).connect(bus ?? audio.destination);
  osc.start(when);
  osc.stop(when + hold + 0.02);

  if (voice === "glock" || voice === "celeste") {
    const partial = audio.createOscillator();
    const partialGain = audio.createGain();
    partial.type = "sine";
    partial.frequency.setValueAtTime(freq * (voice === "glock" ? 2.01 : 3.0), when);
    partialGain.gain.setValueAtTime(0.0001, when);
    partialGain.gain.exponentialRampToValueAtTime(gain * 0.28, when + 0.006);
    partialGain.gain.exponentialRampToValueAtTime(0.0001, when + hold * 0.45);
    partial.connect(partialGain).connect(bus ?? audio.destination);
    partial.start(when);
    partial.stop(when + hold * 0.5);
  }
}

function sparkle(audio: AudioContext, when: number) {
  const length = Math.floor(audio.sampleRate * 0.09);
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
  filter.frequency.value = 2800;
  const gain = audio.createGain();
  gain.gain.setValueAtTime(0.2, when);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.08);
  noise.connect(filter).connect(gain).connect(bus ?? audio.destination);
  noise.start(when);

  for (const freq of [1661, 2217, 2637]) {
    const bell = audio.createOscillator();
    const bellGain = audio.createGain();
    bell.type = "sine";
    bell.frequency.value = freq;
    bellGain.gain.setValueAtTime(0.0001, when);
    bellGain.gain.exponentialRampToValueAtTime(0.04, when + 0.004);
    bellGain.gain.exponentialRampToValueAtTime(0.0001, when + 0.07);
    bell.connect(bellGain).connect(bus ?? audio.destination);
    bell.start(when);
    bell.stop(when + 0.08);
  }
}
