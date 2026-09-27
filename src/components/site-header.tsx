import { Link } from "@tanstack/react-router";

const X = "https://x.com/midoge_mu";
const LONG = "https://long.xyz";

export function SiteHeader() {
  return (
    <header className="flex items-center justify-between gap-4 py-3">
      <Link to="/" className="font-display text-lg font-extrabold tracking-tight text-ink">
        MICRO DOGE
      </Link>
      <nav className="flex items-center gap-2 text-sm">
        <Link
          to="/memes"
          className="rounded-full border border-line px-4 py-2 text-ink hover:border-amber"
        >
          Memes
        </Link>
        <a
          href={X}
          target="_blank"
          rel="noreferrer"
          className="rounded-full border border-line px-4 py-2 text-ink hover:border-amber"
        >
          @midoge_mu
        </a>
        <a
          href={LONG}
          target="_blank"
          rel="noreferrer"
          className="hidden rounded-full bg-amber px-4 py-2 font-medium text-bg sm:inline"
        >
          LONG
        </a>
      </nav>
    </header>
  );
}
