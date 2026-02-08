import { NextResponse } from "next/server";
import { clients, DEPLOYED, CHAIN_LABELS, type ChainKey } from "@/lib/chains";
import { MockOracleAbi, StateViewAbi } from "@/lib/abis";

/**
 * Convert sqrtPriceX96 to human-readable "USDC per 1 CPT" price.
 *
 * In all our pools: token0 = USDC (6 dec), token1 = CPT (18 dec).
 * sqrtPriceX96 encodes price = token1_raw / token0_raw.
 * rawPrice = (sqrtPriceX96 / 2^96)^2
 *
 * To get USDC per CPT:
 *   usdc_per_cpt = (1 / rawPrice) * 10^(token1_dec - token0_dec)
 *                = (1 / rawPrice) * 10^12
 */
function sqrtPriceX96ToUsdcPerCpt(sqrtPriceX96: bigint): number {
  const Q96 = 2n ** 96n;
  // rawPrice = num / denom  where num = sqrtPrice^2, denom = Q96^2
  const num = sqrtPriceX96 * sqrtPriceX96;
  const denom = Q96 * Q96;
  // usdc_per_cpt = denom / num * 10^12
  // Use scaled integer math: result = denom * 10^(12+18) / num, then / 10^18
  const SCALE = 10n ** 30n; // 10^(12+18)
  const scaled = denom * SCALE / num;
  return Number(scaled) / 1e18;
}

function feeLabel(utilization: number): string {
  if (utilization < 30) return "LOW (0.05%)";
  if (utilization >= 70) return "HIGH (1.0%)";
  return "DEFAULT (0.3%)";
}

function feeBps(utilization: number): number {
  if (utilization < 30) return 500;
  if (utilization >= 70) return 10000;
  return 3000;
}

export async function GET() {
  const chainKeys: ChainKey[] = ["base-sepolia", "unichain-sepolia"];

  const results = await Promise.allSettled(
    chainKeys.map(async (key) => {
      const client = clients[key];
      const addrs = DEPLOYED[key];

      const [slot0Result, utilizationResult] = await Promise.allSettled([
        client.readContract({
          address: addrs.stateView as `0x${string}`,
          abi: StateViewAbi,
          functionName: "getSlot0",
          args: [addrs.poolId as `0x${string}`],
        }),
        client.readContract({
          address: addrs.oracle as `0x${string}`,
          abi: MockOracleAbi,
          functionName: "getUtilization",
        }),
      ]);

      const sqrtPriceX96 =
        slot0Result.status === "fulfilled"
          ? (slot0Result.value as [bigint, number, number, number])[0]
          : null;
      const tick =
        slot0Result.status === "fulfilled"
          ? Number((slot0Result.value as [bigint, number, number, number])[1])
          : null;
      const utilization =
        utilizationResult.status === "fulfilled"
          ? Number(utilizationResult.value as bigint)
          : null;

      const price = sqrtPriceX96 ? sqrtPriceX96ToUsdcPerCpt(sqrtPriceX96) : null;

      return {
        chain: key,
        label: CHAIN_LABELS[key],
        price,
        tick,
        utilization,
        fee: utilization !== null ? feeLabel(utilization) : null,
        feeBps: utilization !== null ? feeBps(utilization) : null,
        error:
          slot0Result.status === "rejected"
            ? String(slot0Result.reason).slice(0, 200)
            : null,
      };
    }),
  );

  const chains = results.map((r, i) =>
    r.status === "fulfilled"
      ? r.value
      : { chain: chainKeys[i], label: CHAIN_LABELS[chainKeys[i]], price: null, tick: null, utilization: null, fee: null, feeBps: null, error: String(r.reason).slice(0, 200) },
  );

  return NextResponse.json({ ok: true, chains, timestamp: Date.now() });
}
