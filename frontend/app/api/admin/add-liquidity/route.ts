import { NextResponse } from "next/server";

/**
 * POST /api/admin/add-liquidity
 *
 * This operation requires Foundry CLI (forge script) to deploy helper
 * contracts on-chain. It is only available when running locally.
 *
 * Usage (local):
 *   cd frontend && pnpm dev
 *   # Then call this endpoint from the admin UI
 *
 * In Vercel/serverless, returns a descriptive error.
 */

type AddLiquidityRequest = {
  chain: string;
  liquidityDelta?: string;
  tickLower?: number;
  tickUpper?: number;
  mintCpt?: string;
};

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as AddLiquidityRequest;
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
        error: "Add Liquidity requires Foundry CLI (forge). Run locally: cd frontend && pnpm dev",
      },
      { status: 501 },
    );
  }

  // Local execution path — dynamic import to avoid bundling issues
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

    const liquidityDelta = body.liquidityDelta ?? "100000000000000";
    const tickLower = body.tickLower ?? 276240;
    const tickUpper = body.tickUpper ?? 276420;
    const mintCpt = body.mintCpt ?? "1000000000000000000000";

    const envVars = [
      `CHAIN_NAME=${chain}`,
      `LIQUIDITY_DELTA=${liquidityDelta}`,
      `LIQ_TICK_LOWER=${tickLower}`,
      `LIQ_TICK_UPPER=${tickUpper}`,
      `MINT_CPT_FOR_LP=${mintCpt}`,
    ].join(" ");

    const rpcVar = RPC_ENV_MAP[chain];
    const cmd = [
      `set -a && source .env && set +a`,
      `&& ${envVars} forge script script/AddLiquidity.s.sol`,
      `--rpc-url $${rpcVar} --broadcast -vvv 2>&1`,
    ].join(" ");

    const out = execSync(cmd, {
      cwd: CONTRACT_DIR,
      timeout: 60_000,
      encoding: "utf-8",
      shell: "/bin/zsh",
    });

    const success = out.includes("AddLiquidity: success");

    let txHash: string | null = null;
    try {
      const p = path.resolve(CONTRACT_DIR, `broadcast/AddLiquidity.s.sol/${CHAIN_ID[chain]}/run-latest.json`);
      const data = JSON.parse(readFileSync(p, "utf-8"));
      const txs = data.transactions ?? [];
      txHash = txs[txs.length - 1]?.hash ?? null;
    } catch { /* ignore */ }

    return NextResponse.json({
      ok: true,
      success,
      chain,
      liquidityDelta,
      tickLower,
      tickUpper,
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
