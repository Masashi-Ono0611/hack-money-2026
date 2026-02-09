import { NextResponse } from "next/server";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { unichainSepolia, DEPLOYED, type ChainKey } from "@/lib/chains";
import { MockOracleAbi } from "@/lib/abis";

const CHAIN_MAP = {
  "base-sepolia": baseSepolia,
  "unichain-sepolia": unichainSepolia,
} as const;

const RPC_ENV_MAP: Record<string, string> = {
  "base-sepolia": "BASE_SEPOLIA_RPC_URL",
  "unichain-sepolia": "UNICHAIN_SEPOLIA_RPC_URL",
};

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

    const chainKey = chain as ChainKey;
    const oracleAddress = DEPLOYED[chainKey]?.oracle;
    if (!oracleAddress) {
      return NextResponse.json(
        { ok: false, error: `No oracle address for ${chain}` },
        { status: 400 },
      );
    }

    const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
    if (!privateKey) {
      return NextResponse.json(
        { ok: false, error: "DEPLOYER_PRIVATE_KEY not configured" },
        { status: 500 },
      );
    }

    const rpcUrl = process.env[RPC_ENV_MAP[chain]] ?? CHAIN_MAP[chainKey].rpcUrls.default.http[0];
    const account = privateKeyToAccount(privateKey as `0x${string}`);
    const walletClient = createWalletClient({
      account,
      chain: CHAIN_MAP[chainKey],
      transport: http(rpcUrl),
    });

    const txHash = await walletClient.writeContract({
      address: oracleAddress as `0x${string}`,
      abi: MockOracleAbi,
      functionName: "setUtilization",
      args: [BigInt(utilization)],
    });

    return NextResponse.json({
      ok: true,
      chain,
      utilization,
      txHash,
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 },
    );
  }
}
