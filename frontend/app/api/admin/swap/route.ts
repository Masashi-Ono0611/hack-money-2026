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

type SwapRequest = {
  chain: string;
  zeroForOne?: boolean;
  swapAmount?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as SwapRequest;
    const { chain } = body;

    if (!RPC_ENV_MAP[chain]) {
      return NextResponse.json(
        { ok: false, error: `Invalid chain: ${chain}` },
        { status: 400 },
      );
    }

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
    const beforePriceMatch = out.match(/Before sqrtPriceX96:\s*(\d+)/);
    const afterPriceMatch = out.match(/After sqrtPriceX96:\s*(\d+)/);
    const txHash = readBroadcastTxHash("SwapPool.s.sol", CHAIN_ID[chain]);

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
