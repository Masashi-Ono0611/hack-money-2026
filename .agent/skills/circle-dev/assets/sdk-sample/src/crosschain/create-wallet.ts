import { client } from "./../sdk-config";

/**
 * メイン関数
 */
const main = async () => {
  // Create a wallet set
  const walletSetResponse = await client.createWalletSet({
    name: "Gateway Source Wallets",
  });

  // Create a wallet on Arc Testnet
  const walletsResponse = await client.createWallets({
    blockchains: ["ARC-TESTNET", "AVAX-FUJI", "BASE-SEPOLIA", "ETH-SEPOLIA"],
    count: 1,
    walletSetId: walletSetResponse.data?.walletSet?.id ?? "",
    metadata: [{ refId: "source-depositor" }],
  });

  const walletData = await walletsResponse.data?.wallets

  console.log({walletData});
}

main();