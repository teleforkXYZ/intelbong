const MARKS = [0.02, 0.42, 0.92, 1.48, 2.12];

export const NOTE_NAMES = ["spark", "D♭", "G♭", "D♭", "A♭"] as const;

let clip: HTMLAudioElement | null = null;
let frame = 0;

export function playTheme(onStep: (index: number) => void) {
  if (!clip) {
    clip = new Audio("/theme.mp3");
    clip.preload = "auto";
  }
  clip.pause();
  clip.currentTime = 0;
  void clip.play().catch(() => undefined);
  window.cancelAnimationFrame(frame);

  const tick = () => {
    if (!clip) return;
    const time = clip.currentTime;
    let step = 0;
    for (let index = 0; index < MARKS.length; index++) {
      if (time >= MARKS[index]) step = index;
    }
    onStep(clip.ended ? -1 : step);
    if (!clip.paused && !clip.ended) frame = window.requestAnimationFrame(tick);
  };
  frame = window.requestAnimationFrame(tick);
}
