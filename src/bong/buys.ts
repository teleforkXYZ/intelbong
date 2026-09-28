const RPC = "https://rpc.mainnet.chain.robinhood.com";
const TRANSFER = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

export const TOKEN = "0x1788cc406d7be4365468b46edbf50876246c1e18";
export const SYMBOL = "BONG";
export const EXPLORER = "https://robinhoodchain.blockscout.com";

export type Side = "buy" | "sell";

export type Move = {
  hash: string;
  side: Side;
  wallet: string;
  amount: string;
  raw: number;
  at: number;
};

type RawLog = {
  transactionHash?: string;
  topics?: string[];
  data?: string;
  address?: string;
};

const TOKEN_GETTER = "0xfc0c546a";
const DESCRIPTION = "0x7284e416";
const WEBSITE = "0xbeb0a416";
const X_HANDLE = "0xd286bb4f";

export type Socials = {
  description: string;
  website: string;
  xHandle: string;
};

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

export async function recentSwaps(token: string, limit = 6): Promise<Move[]> {
  const logs = await tokenLogs(token, 2500);
  const hashes: string[] = [];
  const seen = new Set<string>();
  for (const log of logs) {
    const hash = log.transactionHash;
    if (!hash || seen.has(hash)) continue;
    seen.add(hash);
    hashes.push(hash);
  }
  const pool = busiest(logs);
  const moves: Move[] = [];
  for (const hash of hashes.slice(-18)) {
    const move = await swapFromReceipt(token, hash, pool);
    if (move) moves.push(move);
  }
  return moves.slice(-limit).reverse();
}

export function watchSwaps(token: string, onMove: (move: Move) => void, signal: AbortSignal) {
  const seen = new Set<string>();
  let primed = false;
  let pool = "";

  async function tick() {
    if (signal.aborted) return;
    const logs = await tokenLogs(token, 30);
    if (!pool) pool = busiest(logs);
    for (const log of logs) {
      const hash = log.transactionHash;
      if (!hash || seen.has(hash)) continue;
      seen.add(hash);
      if (!primed) continue;
      const move = await swapFromReceipt(token, hash, pool);
      if (signal.aborted || !move) continue;
      onMove(move);
    }
    primed = true;
  }

  const beat = window.setInterval(() => {
    void tick().catch(() => undefined);
  }, 7000);
  void tick().catch(() => undefined);
  signal.addEventListener("abort", () => window.clearInterval(beat));
}

async function tokenLogs(token: string, span: number) {
  const head = (await rpc("eth_blockNumber", [])) as string;
  const latest = Number.parseInt(head, 16);
  const fromBlock = `0x${Math.max(0, latest - span).toString(16)}`;
  return (await rpc("eth_getLogs", [
    { address: token, fromBlock, toBlock: "latest", topics: [TRANSFER] },
  ])) as RawLog[];
}

function busiest(logs: RawLog[]) {
  const counts = new Map<string, number>();
  for (const log of logs) {
    const topics = log.topics ?? [];
    if (topics.length < 3) continue;
    for (const topic of [topics[1], topics[2]]) {
      const address = `0x${topic.slice(-40)}`.toLowerCase();
      counts.set(address, (counts.get(address) ?? 0) + 1);
    }
  }
  let best = "";
  let score = 0;
  for (const [address, count] of counts) {
    if (count > score) {
      best = address;
      score = count;
    }
  }
  return best;
}

async function swapFromReceipt(token: string, hash: string, pool: string): Promise<Move | null> {
  const receipt = (await rpc("eth_getTransactionReceipt", [hash])) as { logs?: RawLog[] } | null;
  if (!receipt?.logs) return null;
  const nets = new Map<string, bigint>();
  for (const log of receipt.logs) {
    if ((log.address ?? "").toLowerCase() !== token.toLowerCase()) continue;
    const topics = log.topics ?? [];
    if (topics[0] !== TRANSFER || topics.length < 3) continue;
    const amount = BigInt(log.data ?? "0x0");
    const from = `0x${topics[1].slice(-40)}`.toLowerCase();
    const to = `0x${topics[2].slice(-40)}`.toLowerCase();
    nets.set(from, (nets.get(from) ?? 0n) - amount);
    nets.set(to, (nets.get(to) ?? 0n) + amount);
  }
  const poolNet = nets.get(pool) ?? 0n;
  if (poolNet === 0n) return null;
  const side: Side = poolNet < 0n ? "buy" : "sell";
  let wallet = "";
  let best = 0n;
  for (const [address, net] of nets) {
    if (address === pool) continue;
    if (side === "buy" && net > best) {
      best = net;
      wallet = address;
    }
    if (side === "sell" && (wallet === "" || net < best)) {
      best = net;
      wallet = address;
    }
  }
  const rawBig = best < 0n ? -best : best;
  if (rawBig === 0n) return null;
  const raw = Number(rawBig) / 1e18;
  return { hash, side, wallet, amount: formatAmount(rawBig), raw, at: Date.now() };
}

function formatAmount(raw: bigint) {
  const whole = raw / 10n ** 18n;
  if (whole >= 1_000_000n) return `${trim(whole, 1_000_000n)}M`;
  if (whole >= 1_000n) return `${trim(whole, 1_000n)}K`;
  if (whole >= 1n) {
    const frac = (raw % 10n ** 18n) / 10n ** 16n;
    return `${whole}.${frac.toString().padStart(2, "0")}`;
  }
  const small = Number(raw) / 1e18;
  return small < 0.01 ? small.toFixed(4) : small.toFixed(2);
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
