const RPC = "https://rpc.mainnet.chain.robinhood.com";
const TRANSFER = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const ZERO = "0x0000000000000000000000000000000000000000";

const TOKEN_GETTER = "0xfc0c546a";
const DESCRIPTION = "0x7284e416";
const WEBSITE = "0xbeb0a416";
const X_HANDLE = "0xd286bb4f";

export const EXPLORER = "https://robinhoodchain.blockscout.com";

export type Side = "buy" | "sell" | "mint" | "burn";

export type Move = {
  hash: string;
  side: Side;
  from: string;
  to: string;
  amount: string;
  at: number;
};

export type Socials = {
  description: string;
  website: string;
  xHandle: string;
};

type RawLog = {
  transactionHash?: string;
  topics?: string[];
  data?: string;
};

const codeCache = new Map<string, boolean>();

export async function readTunedToken(ear: string) {
  const result = (await rpc("eth_call", [{ to: ear, data: TOKEN_GETTER }, "latest"])) as string;
  if (typeof result !== "string" || result.length < 66) return "";
  const token = `0x${result.slice(-40)}`;
  return /^0x0{40}$/i.test(token) ? "" : token;
}

export async function readSocials(ear: string): Promise<Socials | null> {
  if (!/^0x[a-fA-F0-9]{40}$/.test(ear)) return null;
  const [description, website, xHandle] = await Promise.all([
    readString(ear, DESCRIPTION),
    readString(ear, WEBSITE),
    readString(ear, X_HANDLE),
  ]);
  if (!description && !website && !xHandle) return null;
  return { description, website, xHandle };
}

export function watchMoves(token: string, onMove: (move: Move) => void, signal: AbortSignal) {
  const seen = new Set<string>();
  let primed = false;

  async function tick() {
    if (signal.aborted) return;
    const head = (await rpc("eth_blockNumber", [])) as string;
    const latest = Number.parseInt(head, 16);
    const fromBlock = `0x${Math.max(0, latest - 40).toString(16)}`;
    const logs = (await rpc("eth_getLogs", [
      { address: token, fromBlock, toBlock: "latest", topics: [TRANSFER] },
    ])) as RawLog[];
    for (const log of logs) {
      const hash = log.transactionHash;
      const topics = log.topics ?? [];
      if (!hash || topics.length < 3 || seen.has(hash)) continue;
      seen.add(hash);
      if (!primed) continue;
      const from = topicAddress(topics[1]);
      const to = topicAddress(topics[2]);
      const side = await classify(from, to);
      if (signal.aborted) return;
      onMove({
        hash,
        side,
        from,
        to,
        amount: formatAmount(log.data ?? "0x0"),
        at: Date.now(),
      });
    }
    primed = true;
  }

  const beat = window.setInterval(() => {
    void tick().catch(() => undefined);
  }, 6000);
  void tick().catch(() => undefined);
  signal.addEventListener("abort", () => window.clearInterval(beat));
}

async function classify(from: string, to: string): Promise<Side> {
  if (from.toLowerCase() === ZERO) return "mint";
  if (to.toLowerCase() === ZERO) return "burn";
  const [fromCode, toCode] = await Promise.all([hasCode(from), hasCode(to)]);
  if (fromCode && !toCode) return "buy";
  if (!fromCode && toCode) return "sell";
  return fromCode ? "buy" : "sell";
}

async function hasCode(address: string) {
  const key = address.toLowerCase();
  const cached = codeCache.get(key);
  if (cached !== undefined) return cached;
  const code = (await rpc("eth_getCode", [address, "latest"])) as string;
  const present = typeof code === "string" && code !== "0x" && code.length > 2;
  codeCache.set(key, present);
  return present;
}

function topicAddress(topic: string) {
  return `0x${topic.slice(-40)}`;
}

function formatAmount(data: string) {
  try {
    const raw = BigInt(data);
    const whole = raw / 10n ** 18n;
    if (whole >= 1_000_000_000n) return `${trim(whole, 1_000_000_000n)}B`;
    if (whole >= 1_000_000n) return `${trim(whole, 1_000_000n)}M`;
    if (whole >= 1_000n) return `${trim(whole, 1_000n)}K`;
    if (whole > 0n) return whole.toString();
    const frac = Number(raw) / 1e18;
    return frac < 0.01 ? "<0.01" : frac.toFixed(2);
  } catch {
    return "—";
  }
}

function trim(whole: bigint, unit: bigint) {
  const scaled = Number((whole * 10n) / unit) / 10;
  return scaled.toFixed(1).replace(/\.0$/, "");
}

async function readString(to: string, data: string) {
  const result = (await rpc("eth_call", [{ to, data }, "latest"])) as string;
  return decodeString(result);
}

function decodeString(hex: string) {
  if (typeof hex !== "string" || hex.length < 130) return "";
  const raw = hex.slice(2);
  const length = Number.parseInt(raw.slice(64, 128), 16);
  if (!Number.isFinite(length) || length <= 0 || length > 600) return "";
  const body = raw.slice(128, 128 + length * 2);
  const bytes = new Uint8Array(body.length / 2);
  for (let index = 0; index < bytes.length; index++) {
    bytes[index] = Number.parseInt(body.slice(index * 2, index * 2 + 2), 16);
  }
  return new TextDecoder().decode(bytes);
}

async function rpc(method: string, params: unknown[]) {
  const response = await fetch(RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const payload = (await response.json()) as { result?: unknown; error?: { message?: string } };
  if (payload.error) throw new Error(payload.error.message ?? "rpc");
  return payload.result;
}
