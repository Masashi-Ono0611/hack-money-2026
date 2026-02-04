import { client } from "./sdk-config";

const {
  WALLET_ID1,
  WALLET_ID2
} = process.env;

/**
 * メイン関数
 */
const main = async () => {
  // senderとreceiverのウォレット情報を取得する
  const senderWallet = await client.getWallet({
    id: WALLET_ID1!,
  });

  const receiverWallet = await client.getWallet({
    id: WALLET_ID2!,
  });

  // USDCを送金する
  const transferResponse = await client.createTransaction({
    amount: ["0.1"], // Transfer 0.1 USDC
    destinationAddress: receiverWallet!.data!.wallet.address!,
    tokenAddress: "0x3600000000000000000000000000000000000000", // USDC contract address on Arc Testnet
    blockchain: "ARC-TESTNET",
    walletAddress: senderWallet!.data!.wallet.address!,
    fee: {
      type: "level",
      config: {
        feeLevel: "MEDIUM",
      },
    },
  });

  console.log(transferResponse.data);

  const response = await client.getTransaction({
    id: transferResponse!.data!.id!,
  });
  console.log(response.data);

};

main();