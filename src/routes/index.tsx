import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { NOTE_NAMES, playTheme } from "@/bong/audio";
import {
  EXPLORER,
  SYMBOL,
  TOKEN,
  readSocials,
  readTunedToken,
  recentSwaps,
  watchSwaps,
  type Move,
} from "@/bong/buys";
import { EAR, FALLBACK } from "@/bong/ear";
import { Spiral } from "@/bong/spiral";

export const Route = createFileRoute("/")({ component: Home });

type Card = Move & { fresh?: boolean };

export function Home() {
  const [pulse, setPulse] = useState(0);
  const [step, setStep] = useState(-1);
  const [listening, setListening] = useState(false);
  const [cards, setCards] = useState<Card[]>([]);
  const [copy, setCopy] = useState(FALLBACK);
  const [token, setToken] = useState(TOKEN);

  useEffect(() => {
    let current = "";
    let stopWatch = () => {};
    let sound = false;

    function arm(next: string) {
      if (!/^0x[a-fA-F0-9]{40}$/.test(next)) return;
      if (next.toLowerCase() === current.toLowerCase()) return;
      stopWatch();
      current = next;
      setToken(next);
      setListening(true);
      void recentSwaps(next, 6)
        .then((list) => setCards(list))
        .catch(() => undefined);
      const inner = new AbortController();
      stopWatch = () => inner.abort();
      watchSwaps(
        next,
        (move) => {
          setCards((list) => [{ ...move, fresh: true }, ...list.filter((item) => item.hash !== move.hash)].slice(0, 8));
          setPulse((value) => value + 1);
          if (sound && move.side === "buy") playTheme(setStep);
        },
        inner.signal,
      );
    }

    function unlock() {
      sound = true;
    }
    window.addEventListener("pointerdown", unlock, { once: true });

    const beat = window.setInterval(() => {
      void readTunedToken(EAR)
        .then((tuned) => arm(/^0x[a-fA-F0-9]{40}$/.test(tuned) ? tuned : TOKEN))
        .catch(() => arm(TOKEN));
    }, 8000);
    void readTunedToken(EAR)
      .then((tuned) => arm(/^0x[a-fA-F0-9]{40}$/.test(tuned) ? tuned : TOKEN))
      .catch(() => arm(TOKEN));
    void readSocials(EAR)
      .then((next) => {
        if (next?.description) setCopy({ ...FALLBACK, ...next });
      })
      .catch(() => undefined);

    return () => {
      window.clearInterval(beat);
      stopWatch();
      window.removeEventListener("pointerdown", unlock);
    };
  }, []);

  function strike() {
    setPulse((value) => value + 1);
    playTheme(setStep);
  }

  const xHref = copy.xHandle.startsWith("http") ? copy.xHandle : `https://x.com/${copy.xHandle.replace(/^@/, "")}`;
  const buys = cards.filter((card) => card.side === "buy").length;
  const sells = cards.filter((card) => card.side === "sell").length;

  return (
    <main className="relative min-h-dvh overflow-hidden bg-field text-ink">
      <div className="pointer-events-none absolute inset-0">
        <Spiral pulse={pulse} step={step} />
      </div>
      <div className="relative mx-auto flex min-h-dvh max-w-6xl flex-col px-4 py-5 sm:px-8">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] tracking-[0.22em] text-dim">ROBINHOOD CHAIN · LIVE TAPE</p>
            <h1 className="mt-2 font-display text-4xl font-semibold leading-none sm:text-6xl">The Intel Bong</h1>
            <p className="mt-2 font-mono text-xs text-chip">
              ${SYMBOL} · {short(token)}
            </p>
          </div>
          <nav className="text-right font-mono text-xs leading-5">
            <a href={copy.website} className="text-ink">
              intelbong.xyz
            </a>
            <br />
            <a href={xHref} className="text-ink">
              @{copy.xHandle.replace(/^@/, "")}
            </a>
            <br />
            <a href={`${EXPLORER}/address/${token}`} className="text-dim">
              explorer
            </a>
          </nav>
        </header>

        <section className="mt-6 grid gap-3 sm:grid-cols-3">
          <Stat label="ON THE TAPE" value={String(cards.length)} />
          <Stat label="BUYS" value={String(buys)} tone="buy" />
          <Stat label="SELLS" value={String(sells)} tone="sell" />
        </section>

        <section className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cards.length === 0 ? (
            <article className="rounded-3xl border border-dashed border-ink/25 bg-[#072a5c]/70 px-5 py-8 text-sm text-dim sm:col-span-2">
              {listening ? "Listening. The next swap paints a card." : "Waiting for the first swap."}
            </article>
          ) : (
            cards.map((card) => <TradeCard key={card.hash} card={card} />)
          )}
        </section>

        <div className="mt-auto flex flex-col items-center gap-4 pb-4 pt-8">
          <p className="font-mono text-sm tracking-widest" aria-live="polite">
            {NOTE_NAMES.map((name, index) => (
              <span key={`${name}-${index}`} className={index === step ? "text-chip" : "text-dim"}>
                {index > 0 ? "  " : ""}
                {name}
              </span>
            ))}
          </p>
          <button
            type="button"
            onClick={strike}
            className="inline-flex min-h-12 items-center rounded-full bg-ink px-7 text-sm font-medium text-field"
          >
            Strike the ring
          </button>
          <p className="max-w-md text-center text-sm leading-6 text-ink/90">{copy.description}</p>
          <p className="max-w-sm text-center text-xs leading-5 text-dim">
            Tap once so the next buy can honk the theme. Sells stay quiet. Not Intel Corporation.
          </p>
        </div>
      </div>
    </main>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "buy" | "sell" }) {
  const color = tone === "buy" ? "text-buy" : tone === "sell" ? "text-sell" : "text-ink";
  return (
    <div className="rounded-2xl border border-ink/15 bg-[#072a5c]/70 px-4 py-3 backdrop-blur-sm">
      <p className="font-mono text-[10px] tracking-[0.18em] text-dim">{label}</p>
      <p className={`mt-1 font-display text-3xl font-semibold ${color}`}>{value}</p>
    </div>
  );
}

function TradeCard({ card }: { card: Card }) {
  const buy = card.side === "buy";
  return (
    <a
      href={`${EXPLORER}/tx/${card.hash}`}
      target="_blank"
      rel="noreferrer"
      className={`block rounded-3xl border bg-[#041833]/80 p-4 backdrop-blur-sm ${
        buy ? "border-buy/40" : "border-sell/40"
      } ${card.fresh ? "pop-in" : ""}`}
    >
      <div className="flex items-center justify-between">
        <span className={`rounded-full px-2 py-1 font-mono text-[11px] tracking-widest ${buy ? "bg-buy/15 text-buy" : "bg-sell/15 text-sell"}`}>
          {buy ? "BUY" : "SELL"}
        </span>
        <span className="font-mono text-[11px] text-dim">{short(card.wallet)}</span>
      </div>
      <p className="mt-4 font-display text-4xl font-semibold leading-none">
        {card.amount}
        <span className="ml-2 text-lg text-dim">{SYMBOL}</span>
      </p>
      <p className="mt-3 font-mono text-[11px] text-chip">{buy ? "tokens hit the pool" : "tokens left the pool"}</p>
    </a>
  );
}

function short(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
