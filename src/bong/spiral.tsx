import { useEffect, useRef } from "react";

type SpiralProps = {
  pulse: number;
  step: number;
};

export function Spiral({ pulse, step }: SpiralProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pulseRef = useRef(pulse);
  const stepRef = useRef(step);
  pulseRef.current = pulse;
  stepRef.current = step;

  useEffect(() => {
    const found = canvasRef.current;
    if (found === null) return;
    const sheet: HTMLCanvasElement = found;
    const context = sheet.getContext("2d");
    if (context === null) return;
    const paint: CanvasRenderingContext2D = context;
    let frame = 0;
    let alive = true;
    let lastPulse = pulseRef.current;
    let born = 0;
    let playing = false;
    const dots = Array.from({ length: 180 }, (_, index) => ({
      angle: (index / 180) * Math.PI * 2,
      drift: Math.random() * Math.PI * 2,
      size: 1.2 + (index % 5) * 0.45,
    }));

    function css(name: string, fallback: string) {
      return getComputedStyle(sheet).getPropertyValue(name).trim() || fallback;
    }

    function resize() {
      const rect = sheet.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      sheet.width = Math.max(1, Math.floor(rect.width * ratio));
      sheet.height = Math.max(1, Math.floor(rect.height * ratio));
    }

    function draw(now: number) {
      if (!alive) return;
      frame = window.requestAnimationFrame(draw);
      if (pulseRef.current !== lastPulse) {
        lastPulse = pulseRef.current;
        born = now;
        playing = true;
      }
      const elapsed = (now - born) / 1000;
      if (playing && elapsed > 3.7) playing = false;
      const width = sheet.width;
      const height = sheet.height;
      const field = css("--color-field", "#0b3f86");
      const glow = css("--color-glow", "#1d6fd4");
      const ink = css("--color-ink", "#f4f9ff");
      const chip = css("--color-chip", "#c46a2f");
      paint.clearRect(0, 0, width, height);
      const wash = paint.createRadialGradient(width / 2, height * 0.42, width * 0.04, width / 2, height * 0.45, width * 0.7);
      wash.addColorStop(0, glow);
      wash.addColorStop(1, field);
      paint.fillStyle = wash;
      paint.fillRect(0, 0, width, height);

      const minSide = Math.min(width, height);
      const open = playing ? Math.min(elapsed / 0.55, 1) : 0;
      const radius = minSide * (playing ? 0.08 + open * 0.28 : 0.1);
      const scatter = playing ? 6 + open * 70 : 4;
      const note = Math.max(stepRef.current, 0);
      const kick = playing ? Math.max(0, 1 - Math.abs(elapsed - [0.05, 0.45, 0.95, 1.5, 2.2][note]) * 2.2) : 0;

      paint.strokeStyle = chip;
      paint.globalAlpha = 0.35;
      paint.lineWidth = Math.max(1, minSide * 0.002);
      const die = minSide * 0.22;
      paint.strokeRect(width / 2 - die / 2, height * 0.42 - die / 2, die, die);
      paint.globalAlpha = 1;

      for (const dot of dots) {
        const wobble = Math.sin(now / 800 + dot.drift) * scatter;
        const x = width / 2 + Math.cos(dot.angle) * (radius + wobble + kick * 18);
        const y = height * 0.42 + Math.sin(dot.angle) * (radius * 0.86 + wobble * 0.7 + kick * 12);
        paint.fillStyle = (Math.round(dot.angle * 3) + note) % 5 === 0 ? chip : ink;
        paint.globalAlpha = 0.45 + dot.size / 8;
        paint.beginPath();
        paint.arc(x, y, dot.size * (1.1 + kick), 0, Math.PI * 2);
        paint.fill();
      }
      paint.globalAlpha = 1;
    }

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(sheet);
    frame = window.requestAnimationFrame(draw);
    return () => {
      alive = false;
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} className="h-full w-full" aria-hidden="true" />;
}
