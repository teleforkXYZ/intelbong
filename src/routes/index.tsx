import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { NOTE_NAMES, playTheme } from "@/bong/audio";
import { EXPLORER, readSocials, readTunedToken, watchMoves, type Move, type Side } from "@/bong/buys";
import { EAR, FALLBACK } from "@/bong/ear";
import { Spiral } from "@/bong/spiral";

export const Route = createFileRoute("/")({ component: Home });

const TOKEN = "";

type Card = {
  id: string;
  side: Side | "strike";
  title: string;
  detail: string;
  href?: string;
};

const SIDE_LABEL: Record<Side, string> = {
  buy: "BUY",
  sell: "SELL",
  mint: "MINT",
  burn: "BURN",
};

export function Home() {
  const [pulse, setPulse] = useState(0);
  const [step, setStep] = useState(-1);
  const [heard, setHeard] = useState(0);
  const [listening, setListening] = useState(false);
  const [cards, setCards] = useState<Card[]>([]);
  const [copy, setCopy] = useState(FALLBACK);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const override = (params.get("ca") ?? TOKEN).trim();
    const controller = new AbortController();
    let current = "";
    let stopWatch = () => {};

    function pushMove(move: Move) {
      const card: Card = {
        id: move.hash,
        side: move.side,
        title: `${SIDE_LABEL[move.side]}  ${move.amount}`,
        detail: `${short(move.from)} → ${short(move.to)}`,
        href: `${EXPLORER}/tx/${move.hash}`,
      };
      setCards((list) => [card, ...list.filter((item) => item.id !== card.id)].slice(0, 8));
      setHeard((count) => count + 1);
      setPulse((value) => value + 1);
      playTheme(setStep);
    }

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
      watchMoves(token, pushMove, inner.signal);
    }

    if (/^0x[a-fA-F0-9]{40}$/.test(override)) {
      arm(override);
    } else if (/^0x[a-fA-F0-9]{40}$/.test(EAR)) {
      const beat = window.setInterval(() => {
        void readTunedToken(EAR)
          .then(arm)
          .catch(() => undefined);
      }, 8000);
      void readTunedToken(EAR)
        .then(arm)
        .catch(() => undefined);
      void readSocials(EAR)
        .then((next) => {
          if (next) setCopy({ ...FALLBACK, ...stripEmpty(next) });
        })
        .catch(() => undefined);
      return () => {
        controller.abort();
        window.clearInterval(beat);
        stopWatch();
      };
    }

    return () => {
      controller.abort();
      stopWatch();
    };
  }, []);

  function strike() {
    setHeard((count) => count + 1);
    setPulse((value) => value + 1);
    playTheme(setStep);
    setCards((list) =>
      [
        {
          id: `strike-${Date.now()}`,
          side: "strike" as const,
          title: "STRIKE",
          detail: "theme.mp3 · five notes",
        },
        ...list,
      ].slice(0, 8),
    );
  }

  const xHref = copy.xHandle.startsWith("http") ? copy.xHandle : `https://x.com/${copy.xHandle.replace(/^@/, "")}`;

  return (
    <main className="relative min-h-dvh overflow-hidden bg-field text-ink">
      <div className="pointer-events-none absolute inset-0">
        <Spiral pulse={pulse} step={step} />
      </div>
      <div className="relative mx-auto flex min-h-dvh max-w-6xl flex-col px-5 py-5 sm:px-8 sm:py-7">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs tracking-[0.22em] text-dim">THEME · 0:03</p>
            <h1 className="mt-2 font-display text-4xl font-semibold leading-none sm:text-6xl">The Intel Bong</h1>
          </div>
          <nav className="text-right font-mono text-xs leading-5">
            <a href={copy.website} className="text-ink">
              intelbong.xyz
            </a>
            <br />
            <a href={xHref} className="text-ink">
              @{copy.xHandle.replace(/^@/, "")}
            </a>
          </nav>
        </header>

        <div className="mt-auto grid items-end gap-6 pb-2 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex flex-col items-center gap-5 pb-4">
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
              className="inline-flex min-h-12 items-center rounded-full border border-ink/40 bg-ink px-7 text-sm font-medium text-field"
            >
              Strike the ring
            </button>
            <p className="max-w-md text-center text-sm leading-6 text-ink/90">{copy.description}</p>
            <p className="max-w-sm text-center text-xs leading-5 text-dim">
              {listening
                ? "Live on Robinhood Chain. A buy or a sell strikes the theme."
                : "Tap once so the browser allows sound. The tape fills after the ear is tuned."}
              {heard > 0 ? ` Struck ${heard}.` : ""}
            </p>
          </div>

          <aside className="mb-2 rounded-2xl border border-ink/20 bg-[#072a5c]/75 p-3 backdrop-blur-sm">
            <div className="mb-2 flex items-center justify-between font-mono text-[11px] tracking-widest text-dim">
              <span>TAPE</span>
              <span>{listening ? "LIVE" : "WAITING"}</span>
            </div>
            <ul className="flex max-h-72 flex-col gap-2 overflow-auto">
              {cards.length === 0 ? (
                <li className="rounded-xl border border-dashed border-ink/20 px-3 py-4 text-sm text-dim">
                  Buys and sells land here. Each one plays the same spiral.
                </li>
              ) : (
                cards.map((card) => <TapeCard key={card.id} card={card} />)
              )}
            </ul>
          </aside>
        </div>
      </div>
    </main>
  );
}

function TapeCard({ card }: { card: Card }) {
  const tone =
    card.side === "buy" || card.side === "mint"
      ? "border-buy/50 text-buy"
      : card.side === "sell" || card.side === "burn"
        ? "border-sell/50 text-sell"
        : "border-chip/60 text-chip";
  const body = (
    <>
      <p className={`font-mono text-xs tracking-widest ${tone}`}>{card.title}</p>
      <p className="mt-1 text-sm text-ink">{card.detail}</p>
    </>
  );
  const className = `block rounded-xl border border-ink/15 bg-ink/5 px-3 py-2 ${card.href ? "hover:border-ink/40" : ""}`;
  if (!card.href) return <li className={className}>{body}</li>;
  return (
    <li>
      <a href={card.href} target="_blank" rel="noreferrer" className={className}>
        {body}
      </a>
    </li>
  );
}

function short(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function stripEmpty(next: { description: string; website: string; xHandle: string }) {
  return {
    description: next.description || FALLBACK.description,
    website: next.website || FALLBACK.website,
    xHandle: next.xHandle || FALLBACK.xHandle,
  };
}
