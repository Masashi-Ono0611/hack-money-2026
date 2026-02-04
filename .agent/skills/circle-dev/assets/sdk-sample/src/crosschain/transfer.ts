import { client } from "../sdk-config";
import { burnIntentTypedData, CHAIN_CONFIG, formatUnits, GATEWAY_MINTER_ADDRESS, makeBurnIntent, parseSelectedChains, stringifyTypedData, waitForTxCompletion } from "./utils";

const {
  CROSSCHAIN_WALLET_ID1,
  TO_ADDRESS
} = process.env;

/**
 * メイン関数
 */
const main = async () => {
  // 転送するUSDCの量
  const TRANSFER_AMOUNT_USDC = 0.05;
  // ドメイン
  const domain = { name: "GatewayWallet", version: "1" };

  // 送信元アドレスの設定
  const walletData = await client.getWallet({
    id: CROSSCHAIN_WALLET_ID1!,
  });
  const depositorAddress = walletData.data?.wallet.address!;
  // 送信先チェーンの指定
  const destinationChain = "BASE-SEPOLIA";
  // 送信先アドレスの設定
  const to = TO_ADDRESS!;
  
  // リクエストデータを格納する変数
  const requests: any[] = [];
  const burnIntentsForTotal: any[] = [];

  for (const chain of parseSelectedChains()) {
    // チェーンの設定を取得する
    const config = CHAIN_CONFIG[chain as keyof typeof CHAIN_CONFIG];

    const burnIntent = makeBurnIntent(chain, destinationChain, depositorAddress, to, TRANSFER_AMOUNT_USDC);
    const typedData = burnIntentTypedData(burnIntent, domain);

    const sigResp = await client.signTypedData({
      walletId: config.walletId,
      data: stringifyTypedData(typedData),
    });
    // リクエストデータの作成
    requests.push({
      burnIntent: typedData.message,
      signature: sigResp.data?.signature,
    });

    burnIntentsForTotal.push(burnIntent);
  }
  
  // Burnインテントをまとめて実行
  const response = await fetch(
    "https://gateway-api-testnet.circle.com/v1/transfer",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requests, (_key, value) =>
        typeof value === "bigint" ? value.toString() : value,
      ),
    },
  );

  const json = await response.json();
  const attestation = json?.attestation;
  const operatorSig = json?.signature;

  if (!attestation || !operatorSig) {
    console.error("Gateway /transfer error:", json);
    process.exit(1);
  }

  // Mint on the destination chain
  const tx = await client.createContractExecutionTransaction({
    walletAddress: depositorAddress,
    blockchain: destinationChain,
    contractAddress: GATEWAY_MINTER_ADDRESS,
    abiFunctionSignature: "gatewayMint(bytes,bytes)",
    abiParameters: [attestation, operatorSig],
    fee: { type: "level", config: { feeLevel: "MEDIUM" } },
  });

  console.log("Mint tx submitted:", tx.data?.id);

  const txId = tx.data?.id;
  if (!txId) throw new Error("Failed to submit mint transaction");
  await waitForTxCompletion(client, txId, "USDC mint");

  const totalMintBaseUnits = burnIntentsForTotal.reduce(
    (sum, i) => sum + (i.spec.value ?? 0n),
    0n,
  );
  console.log(`Minted ${formatUnits(totalMintBaseUnits, 6)} USDC`);
};

main();