import { client } from "../sdk-config";
import { CHAIN_CONFIG, GATEWAY_WALLET_ADDRESS, parseBalance, parseSelectedChains, waitForTxCompletion } from "./utils";

const DEPOSIT_AMOUNT_USDC = "2";

/**
 * メイン関数
 */
const main = async () => {
  // Allows for chain selection via CLI arguments
  const selectedChains = parseSelectedChains();

  console.log(
    `Depositing to: ${selectedChains.map((chain) => CHAIN_CONFIG[chain].chainName).join(", ")}`,
  );

  // Process each selected chain
  for (const chain of selectedChains) {
    const config = CHAIN_CONFIG[chain];
    const USDC_ADDRESS = config.usdc;
    const WALLET_ID = config.walletId;

    console.log(`\n--- ${config.chainName} ---`);

    // Approve USDC for the Gateway Wallet to transfer USDC from your address
    console.log(
      `Approving ${DEPOSIT_AMOUNT_USDC} USDC for spender ${GATEWAY_WALLET_ADDRESS}`,
    );

    // USDCをGATEWAY_WALLET_ADDRESSに送金するための承認トランザクションを作成する
    const approveTx = await client.createContractExecutionTransaction({
      walletId: WALLET_ID!,
      contractAddress: USDC_ADDRESS,
      abiFunctionSignature: "approve(address,uint256)",
      abiParameters: [
        GATEWAY_WALLET_ADDRESS,
        parseBalance(DEPOSIT_AMOUNT_USDC).toString(),
      ],
      fee: { type: "level", config: { feeLevel: "MEDIUM" } },
    });

    const approveTxId = approveTx.data?.id;
    if (!approveTxId) throw new Error("Failed to create approve transaction");

    await waitForTxCompletion(client, approveTxId, "USDC approve");

    // Call deposit method on the Gateway Wallet contract
    console.log(`Depositing ${DEPOSIT_AMOUNT_USDC} USDC to Gateway Wallet`);

    // Gateway Walletコントラクトのdepositメソッドを呼び出すトランザクションを作成する
    const depositTx = await client.createContractExecutionTransaction({
      walletId: WALLET_ID!,
      contractAddress: GATEWAY_WALLET_ADDRESS,
      abiFunctionSignature: "deposit(address,uint256)",
      abiParameters: [
        USDC_ADDRESS,
        parseBalance(DEPOSIT_AMOUNT_USDC).toString(),
      ],
      fee: { type: "level", config: { feeLevel: "MEDIUM" } },
    });

    const depositTxId = depositTx.data?.id;
    if (!depositTxId) throw new Error("Failed to create deposit transaction");

    await waitForTxCompletion(client, depositTxId, "Gateway deposit");
  }

  console.log(
    "Transaction complete. Once finality is reached, Gateway credits your unified USDC balance.",
  );
};

main().catch((error) => {
  console.error("\nError:", error?.response?.data ?? error);
  process.exit(1);
});