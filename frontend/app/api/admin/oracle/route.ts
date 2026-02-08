import { NextResponse } from "next/server";
import { execSync } from "child_process";
import path from "path";

const ROOT = path.resolve(process.cwd(), "..");

type OracleUpdateRequest = {
  chain: string;
  utilization: number;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as OracleUpdateRequest;
    const { chain, utilization } = body;

    if (typeof utilization !== "number" || utilization < 0 || utilization > 100) {
      return NextResponse.json(
        { ok: false, error: "utilization must be 0-100" },
        { status: 400 },
      );
    }

    if (!["base-sepolia", "unichain-sepolia"].includes(chain)) {
      return NextResponse.json(
        { ok: false, error: "Invalid chain" },
        { status: 400 },
      );
    }

    const rpcEnvMap: Record<string, string> = {
      "base-sepolia": "BASE_SEPOLIA_RPC_URL",
      "unichain-sepolia": "UNICHAIN_SEPOLIA_RPC_URL",
    };

    const deployedPath = path.resolve(ROOT, "contract/deployed-addresses.json");
    const deployed = JSON.parse(
      require("fs").readFileSync(deployedPath, "utf-8"),
    );
    const oracleAddress = deployed[chain]?.oracle;

    if (!oracleAddress) {
      return NextResponse.json(
        { ok: false, error: `No oracle address for ${chain}` },
        { status: 400 },
      );
    }

    const rpcVar = rpcEnvMap[chain];
    const cmd = [
      `set -a && source .env && source contract/.env && set +a`,
      `&& cast send ${oracleAddress}`,
      `"setUtilization(uint256)" ${utilization}`,
      `--rpc-url $${rpcVar}`,
      `--private-key $DEPLOYER_PRIVATE_KEY`,
      `2>&1`,
    ].join(" ");

    const out = execSync(cmd, {
      cwd: ROOT,
      timeout: 30_000,
      encoding: "utf-8",
      shell: "/bin/zsh",
    });

    const txMatch = out.match(/transactionHash\s+(0x[\da-fA-F]+)/);

    return NextResponse.json({
      ok: true,
      chain,
      utilization,
      txHash: txMatch?.[1] ?? null,
      raw: out.slice(-500),
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    const raw =
      typeof err === "object" && err !== null && "stdout" in err
        ? String(
            (err as { stdout?: string; stderr?: string }).stdout ??
              (err as { stderr?: string }).stderr ??
              "",
          ).slice(-500)
        : "";
    return NextResponse.json(
      { ok: false, error: error.message, raw },
      { status: 500 },
    );
  }
}
