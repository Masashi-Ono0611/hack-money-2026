import { client } from "../sdk-config";
import { GATEWAY_API } from "./utils";

const {
  CROSSCHAIN_WALLET_ID1,
} = process.env;

// 対象のブロックチェーン
const CHAINS = {
  ethereum: { domain: 0, name: "Ethereum Sepolia" },
  avalanche: { domain: 1, name: "Avalanche Fuji" },
  base: { domain: 6, name: "Base Sepolia" },
  arc: { domain: 26, name: "Arc Testnet" },
};

const chainList = Object.values(CHAINS);

const domainNames = Object.fromEntries(
  chainList.map((chain) => [chain.domain, chain.name]),
);

/**
 * BigIntに変換するユーティリティ関数
 * @param value 
 * @returns 
 */
const toBigInt = (value: string | number | null | undefined): bigint => {
  const balanceString = String(value ?? "0");
  if (balanceString.includes(".")) {
    const [whole, decimal = ""] = balanceString.split(".");
    const decimal6 = (decimal + "000000").slice(0, 6);
    return BigInt((whole || "0") + decimal6);
  }
  return BigInt(balanceString || "0");
};

/**
 * メイン関数
 */
const main = async () => {
  // ウォレット情報を取得する
  const { data } = await client.getWallet({ id: CROSSCHAIN_WALLET_ID1! });

  const depositor = data?.wallet?.address;
  if (!depositor) throw new Error("Could not resolve wallet address");
  console.log(`Depositor address: ${depositor}`);

  // Query Gateway for the available balance recorded by the system
  const response = await fetch(`${GATEWAY_API}/balances`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token: "USDC",
      sources: chainList.map(({ domain }) => ({ domain, depositor })),
    }),
  });
  const { balances = [] } = await response.json();

  let totalBalances = 0n;
  for (const balance of balances) {
    const amount = toBigInt(balance?.balance);
    const chain =
      domainNames[balance!.domain as number] ??
      `Domain ${balance!.domain as number}`;
    console.log(
      `  - ${chain}: ${amount / 1_000_000n}.${(amount % 1_000_000n)
        .toString()
        .padStart(6, "0")} USDC`,
    );
    totalBalances += amount;
  }
  const whole = totalBalances / 1_000_000n;
  const decimal = totalBalances % 1_000_000n;
  const totalUsdc = `${whole}.${decimal.toString().padStart(6, "0")}`;
  console.log(`Unified USDC available: ${totalUsdc} USDC`);
};

main();