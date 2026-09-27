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
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let alive = true;
    let lastPulse = pulseRef.current;
    let born = 0;
    let playing = false;
    const dots = Array.from({ length: 168 }, (_, index) => ({
      angle: (index / 168) * Math.PI * 2 + Math.random() * 0.04,
      drift: Math.random() * Math.PI * 2,
      size: 1.1 + Math.random() * 2.4,
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
      if (playing && elapsed > 2.2) playing = false;
      const width = sheet.width;
      const height = sheet.height;
      const field = css("--color-field", "#2189d6");
      const glow = css("--color-glow", "#3aa0e4");
      const ink = css("--color-ink", "#f4f9ff");
      paint.clearRect(0, 0, width, height);
      const wash = paint.createRadialGradient(
        width / 2,
        height * 0.46,
        width * 0.05,
        width / 2,
        height / 2,
        width * 0.72,
      );
      wash.addColorStop(0, glow);
      wash.addColorStop(1, field);
      paint.fillStyle = wash;
      paint.fillRect(0, 0, width, height);

      const minSide = Math.min(width, height);
      const open = playing ? Math.min(elapsed / 0.7, 1) : 0;
      const fade = playing && elapsed > 2.05 ? Math.max(0, 1 - (elapsed - 2.05) / 0.75) : playing ? 1 : 0.95;
      const radius = minSide * (playing ? 0.07 + open * 0.3 : 0.085);
      const scatter = playing ? 8 + open * 78 : 5;
      const kick = playing ? Math.max(0, 1 - Math.abs(elapsed - Math.max(stepRef.current, 0) * 0.16) * 1.6) : 0;
      paint.fillStyle = ink;
      for (const dot of dots) {
        const wobble = Math.sin(now / 900 + dot.drift) * scatter;
        const x = width / 2 + Math.cos(dot.angle) * (radius + wobble + kick * 14);
        const y = height * 0.46 + Math.sin(dot.angle) * (radius + wobble * 0.75 + kick * 14);
        paint.globalAlpha = fade * (0.4 + dot.size / 5);
        paint.beginPath();
        paint.arc(x, y, dot.size * 1.4, 0, Math.PI * 2);
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
