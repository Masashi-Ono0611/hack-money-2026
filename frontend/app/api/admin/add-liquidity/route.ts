import { NextResponse } from "next/server";
import { execSync } from "child_process";
import { readFileSync } from "fs";
import path from "path";

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

function readBroadcastTxHash(script: string, chainId: number): string | null {
  try {
    const p = path.resolve(CONTRACT_DIR, `broadcast/${script}/${chainId}/run-latest.json`);
    const data = JSON.parse(readFileSync(p, "utf-8"));
    const txs = data.transactions ?? [];
    return txs[txs.length - 1]?.hash ?? null;
  } catch {
    return null;
  }
}

type AddLiquidityRequest = {
  chain: string;
  liquidityDelta?: string;
  tickLower?: number;
  tickUpper?: number;
  mintCpt?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as AddLiquidityRequest;
    const { chain } = body;

    if (!RPC_ENV_MAP[chain]) {
      return NextResponse.json(
        { ok: false, error: `Invalid chain: ${chain}` },
        { status: 400 },
      );
    }

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
    const txHash = readBroadcastTxHash("AddLiquidity.s.sol", CHAIN_ID[chain]);

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
    const raw =
      typeof err === "object" && err !== null && "stdout" in err
        ? String(
            (err as { stdout?: string; stderr?: string }).stdout ??
              (err as { stderr?: string }).stderr ??
              "",
          ).slice(-1500)
        : "";
    return NextResponse.json(
      { ok: false, error: error.message, raw },
      { status: 500 },
    );
  }
}
