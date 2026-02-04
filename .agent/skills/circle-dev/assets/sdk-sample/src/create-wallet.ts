import { client } from "./sdk-config";

/**
 * メイン関数
 */
const main = async () => {
  // Create a wallet set
  const walletSetResponse = await client.createWalletSet({
    name: "Wallet Set 1",
  });

  /* */
  // Create a wallet on Arc Testnet
  const walletsResponse = await client.createWallets({
    blockchains: ["ARC-TESTNET", "ARB-SEPOLIA"],
    count: 2,
    walletSetId: walletSetResponse.data?.walletSet?.id ?? "",
  });

  const walletData = await walletsResponse.data?.wallets

  console.log({walletData});
  
  /*
  // Create a wallet on Arc Testnet
  const walletsResponse = await client.createWallets({
    blockchains: ["SOL-DEVNET"],
    count: 1,
    walletSetId: walletSetResponse.data?.walletSet?.id ?? "",
  });

  const walletData = await walletsResponse.data?.wallets

  console.log({walletData});
  */
}

main();