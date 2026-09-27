const RPC = "https://rpc.mainnet.chain.robinhood.com";
const TRANSFER = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

type Log = { transactionHash?: string };

const TOKEN_GETTER = "0xfc0c546a";

export async function readTunedToken(ear: string) {
  const result = (await rpc("eth_call", [{ to: ear, data: TOKEN_GETTER }, "latest"])) as string;
  if (typeof result !== "string" || result.length < 66) return "";
  const token = `0x${result.slice(-40)}`;
  return /^0x0{40}$/i.test(token) ? "" : token;
}

export function watchMoves(token: string, onMove: (hash: string) => void, signal: AbortSignal) {
  const seen = new Set<string>();
  let primed = false;

  async function tick() {
    if (signal.aborted) return;
    const head = (await rpc("eth_blockNumber", [])) as string;
    const latest = Number.parseInt(head, 16);
    const from = `0x${Math.max(0, latest - 20).toString(16)}`;
    const logs = (await rpc("eth_getLogs", [
      { address: token, fromBlock: from, toBlock: "latest", topics: [TRANSFER] },
    ])) as Log[];
    for (const log of logs) {
      const hash = log.transactionHash;
      if (!hash || seen.has(hash)) continue;
      seen.add(hash);
      if (primed) onMove(hash);
    }
    primed = true;
  }

  const beat = window.setInterval(() => {
    void tick().catch(() => undefined);
  }, 6000);
  void tick().catch(() => undefined);
  signal.addEventListener("abort", () => window.clearInterval(beat));
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
