import { NextResponse } from "next/server";

/**
 * POST /api/admin/swap
 *
 * This operation requires Foundry CLI (forge script) to deploy a
 * PoolSwapTest helper contract on-chain. Only available locally.
 *
 * In Vercel/serverless, returns a descriptive error.
 */

type SwapRequest = {
  chain: string;
  zeroForOne?: boolean;
  swapAmount?: string;
};

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as SwapRequest;
  const { chain } = body;

  if (!chain || !["base-sepolia", "unichain-sepolia"].includes(chain)) {
    return NextResponse.json(
      { ok: false, error: `Invalid chain: ${chain}` },
      { status: 400 },
    );
  }

  // Detect serverless environment (no shell available)
  const isServerless = !process.env.SHELL && !process.env.HOME?.startsWith("/Users");

  if (isServerless) {
    return NextResponse.json(
      {
        ok: false,
        error: "Swap requires Foundry CLI (forge). Run locally: cd frontend && pnpm dev",
      },
      { status: 501 },
    );
  }

  // Local execution path
  try {
    const { execSync } = await import("child_process");
    const path = await import("path");
    const { readFileSync } = await import("fs");

    const ROOT = path.resolve(process.cwd(), "..");
    const CONTRACT_DIR = path.resolve(ROOT, "contract");

    const RPC_ENV_MAP: Record<string, string> = {
      "base-sepolia": "BASE_SEPOLIA_RPC_URL",
      "unichain-sepolia": "UNICHAIN_SEPOLIA_RPC_URL",
    };
    const CHAIN_ID: Record<string, number> = {
      "base-sepolia": 84532,
      "unichain-sepolia": 1301,
    };

    const zeroForOne = body.zeroForOne ?? true;
    const swapAmount = body.swapAmount ?? "100000";

    const envVars = [
      `CHAIN_NAME=${chain}`,
      `SWAP_ZERO_FOR_ONE=${zeroForOne}`,
      `SWAP_AMOUNT=${swapAmount}`,
    ].join(" ");

    const rpcVar = RPC_ENV_MAP[chain];
    const cmd = [
      `set -a && source .env && set +a`,
      `&& ${envVars} forge script script/SwapPool.s.sol`,
      `--rpc-url $${rpcVar} --broadcast -vvv 2>&1`,
    ].join(" ");

    const out = execSync(cmd, {
      cwd: CONTRACT_DIR,
      timeout: 60_000,
      encoding: "utf-8",
      shell: "/bin/zsh",
    });

    const success = out.includes("SwapPool: success");
    const beforeTickMatch = out.match(/Before tick:\s*(-?\d+)/);
    const afterTickMatch = out.match(/After tick:\s*(-?\d+)/);

    let txHash: string | null = null;
    try {
      const p = path.resolve(CONTRACT_DIR, `broadcast/SwapPool.s.sol/${CHAIN_ID[chain]}/run-latest.json`);
      const data = JSON.parse(readFileSync(p, "utf-8"));
      const txs = data.transactions ?? [];
      txHash = txs[txs.length - 1]?.hash ?? null;
    } catch { /* ignore */ }

    return NextResponse.json({
      ok: true,
      success,
      chain,
      zeroForOne,
      swapAmount,
      beforeTick: beforeTickMatch ? parseInt(beforeTickMatch[1]) : null,
      afterTick: afterTickMatch ? parseInt(afterTickMatch[1]) : null,
      txHash,
      raw: out.slice(-1500),
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 },
    );
  }
}
