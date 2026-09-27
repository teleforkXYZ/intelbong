import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { NOTE_NAMES, playSpiral } from "@/bong/audio";
import { readTunedToken, watchMoves } from "@/bong/buys";
import { EAR } from "@/bong/ear";
import { Spiral } from "@/bong/spiral";

export const Route = createFileRoute("/")({ component: Home });

const TOKEN = "";

export function Home() {
  const [pulse, setPulse] = useState(0);
  const [step, setStep] = useState(-1);
  const [heard, setHeard] = useState(0);
  const [listening, setListening] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const override = (params.get("ca") ?? TOKEN).trim();
    const controller = new AbortController();
    let current = "";
    let stopWatch = () => {};

    function arm(token: string) {
      if (token.toLowerCase() === current.toLowerCase()) return;
      stopWatch();
      current = token;
      if (!/^0x[a-fA-F0-9]{40}$/.test(token)) {
        setListening(false);
        return;
      }
      setListening(true);
      const inner = new AbortController();
      stopWatch = () => inner.abort();
      watchMoves(
        token,
        () => {
          setHeard((count) => count + 1);
          setPulse((value) => value + 1);
          playSpiral(setStep);
        },
        inner.signal,
      );
    }

    if (/^0x[a-fA-F0-9]{40}$/.test(override)) {
      arm(override);
      return () => {
        controller.abort();
        stopWatch();
      };
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(EAR)) return;

    async function poll() {
      if (controller.signal.aborted) return;
      arm(await readTunedToken(EAR));
    }

    const beat = window.setInterval(() => {
      void poll().catch(() => undefined);
    }, 8000);
    void poll().catch(() => undefined);
    return () => {
      controller.abort();
      window.clearInterval(beat);
      stopWatch();
    };
  }, []);

  function strike() {
    setHeard((count) => count + 1);
    setPulse((value) => value + 1);
    playSpiral(setStep);
  }

  return (
    <main className="relative min-h-dvh overflow-hidden bg-field text-ink">
      <div className="pointer-events-none absolute inset-0">
        <Spiral pulse={pulse} step={step} />
      </div>
      <div className="relative flex min-h-dvh flex-col">
        <header className="flex items-start justify-between gap-4 px-5 pt-5 sm:px-8 sm:pt-7">
          <div>
            <p className="font-mono text-xs tracking-widest text-dim">FIVE NOTES · 0:03</p>
            <h1 className="mt-2 font-display text-4xl font-semibold leading-none sm:text-6xl">The Intel Bong</h1>
          </div>
          <p className="text-right font-mono text-xs leading-5">
            <span className="text-dim">$BONG</span>
            <br />
            <span className="text-dim">INTC</span>
            <br />
            <a href="https://x.com/intelbongXYZ" className="text-ink">
              @intelbongXYZ
            </a>
          </p>
        </header>

        <div className="flex flex-1 items-end justify-center px-5 pb-8 sm:px-8">
          <div className="flex w-full max-w-xl flex-col items-center gap-6">
            <p className="font-mono text-sm tracking-widest" aria-live="polite">
              {NOTE_NAMES.map((name, index) => (
                <span key={`${name}-${index}`} className={index === step ? "text-ink" : "text-dim"}>
                  {index > 0 ? "  " : ""}
                  {name}
                </span>
              ))}
            </p>
            <button
              type="button"
              onClick={strike}
              className="inline-flex min-h-11 items-center rounded-full border border-ink/30 px-6 text-sm"
            >
              Strike the ring
            </button>
            <p className="max-w-sm text-center text-sm leading-6 text-dim">
              {listening
                ? "A move of the token on Robinhood Chain strikes the five notes."
                : "Tap once so the browser allows sound. Buys strike this after the mint."}
              {heard > 0 ? ` Struck ${heard}.` : ""}
            </p>
            <p className="text-center text-xs text-dim">
              Not Intel. A browser performance of the published spiral, not their recording.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
