import { NextResponse } from "next/server";
import { execSync } from "child_process";
import path from "path";

const ROOT = path.resolve(process.cwd(), "..");
const CONTRACT_DIR = path.resolve(ROOT, "contract");

const RPC_ENV_MAP: Record<string, string> = {
  "base-sepolia": "BASE_SEPOLIA_RPC_URL",
  "unichain-sepolia": "UNICHAIN_SEPOLIA_RPC_URL",
};

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
    const txMatch = out.match(/Transaction:\s*(0x[\da-fA-F]+)/);

    return NextResponse.json({
      ok: true,
      success,
      chain,
      zeroForOne,
      swapAmount,
      beforeTick: beforeTickMatch ? parseInt(beforeTickMatch[1]) : null,
      afterTick: afterTickMatch ? parseInt(afterTickMatch[1]) : null,
      txHash: txMatch?.[1] ?? null,
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
