import { NextResponse } from "next/server";
import { clients, DEPLOYED, CHAIN_LABELS, type ChainKey } from "@/lib/chains";
import { MockOracleAbi, StateViewAbi, ERC20Abi } from "@/lib/abis";

function sqrtPriceX96ToUsdcPerCpt(sqrtPriceX96: bigint): number {
  const Q96 = 2n ** 96n;
  const num = sqrtPriceX96 * sqrtPriceX96;
  const denom = Q96 * Q96;
  const SCALE = 10n ** 30n;
  const scaled = (denom * SCALE) / num;
  return Number(scaled) / 1e18;
}

export async function GET() {
  const chainKeys: ChainKey[] = ["base-sepolia", "unichain-sepolia"];

  const results = await Promise.allSettled(
    chainKeys.map(async (key) => {
      const client = clients[key];
      const addrs = DEPLOYED[key];

      const [slot0Result, liquidityResult, oracleResult] =
        await Promise.allSettled([
          client.readContract({
            address: addrs.stateView as `0x${string}`,
            abi: StateViewAbi,
            functionName: "getSlot0",
            args: [addrs.poolId as `0x${string}`],
          }),
          client.readContract({
            address: addrs.stateView as `0x${string}`,
            abi: StateViewAbi,
            functionName: "getLiquidity",
            args: [addrs.poolId as `0x${string}`],
          }),
          client.readContract({
            address: addrs.oracle as `0x${string}`,
            abi: MockOracleAbi,
            functionName: "getUtilizationWithMeta",
          }),
        ]);

      const slot0 =
        slot0Result.status === "fulfilled"
          ? (slot0Result.value as [bigint, number, number, number])
          : null;
      const liquidity =
        liquidityResult.status === "fulfilled"
          ? String(liquidityResult.value)
          : "0";

      const oracleData =
        oracleResult.status === "fulfilled"
          ? (oracleResult.value as [bigint, bigint, boolean, number])
          : null;

      const sqrtPriceX96 = slot0 ? slot0[0] : null;
      const price = sqrtPriceX96
        ? sqrtPriceX96ToUsdcPerCpt(sqrtPriceX96)
        : null;

      return {
        chain: key,
        label: CHAIN_LABELS[key],
        cpt: addrs.cpt,
        usdc: addrs.usdc,
        oracle: addrs.oracle,
        hook: addrs.hook,
        poolId: addrs.poolId,
        poolManager: addrs.poolManager,
        price,
        tick: slot0 ? Number(slot0[1]) : null,
        liquidity,
        sqrtPriceX96: sqrtPriceX96 ? String(sqrtPriceX96) : null,
        utilization: oracleData ? Number(oracleData[0]) : null,
        oracleUpdatedAt: oracleData ? Number(oracleData[1]) : null,
        oracleStale: oracleData ? oracleData[2] : null,
        oracleSource: oracleData ? oracleData[3] : null,
        error: slot0Result.status === "rejected"
          ? String(slot0Result.reason).slice(0, 200)
          : null,
      };
    }),
  );

  const chains = results.map((r, i) =>
    r.status === "fulfilled"
      ? r.value
      : {
          chain: chainKeys[i],
          label: CHAIN_LABELS[chainKeys[i]],
          error: String(r.reason).slice(0, 200),
        },
  );

  return NextResponse.json({ ok: true, chains, timestamp: Date.now() });
}
