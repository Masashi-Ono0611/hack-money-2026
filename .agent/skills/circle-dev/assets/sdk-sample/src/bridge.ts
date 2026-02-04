import { BridgeKit } from "@circle-fin/bridge-kit";
import { inspect } from "util";
import { adapter, client } from "./sdk-config";

const {
  WALLET_ID1,
} = process.env;

// Initialize the SDK
const kit = new BridgeKit();

/**
 * メイン関数
 */
const main = async () => {
  console.log("---------------Starting Bridging---------------");

  // senderとreceiverのウォレット情報を取得する
  const wallet = await client.getWallet({
    id: WALLET_ID1!,
  });

  try {
    // ArcからArbitrumへのブリッジを実行する
    const result = await kit.bridge({
      from: {
        adapter,
        chain: "Arc_Testnet",
        address: wallet.data!.wallet.address, // EVM address (developer-controlled)
      },
      to: {
        adapter,
        chain: "Arbitrum_Sepolia",
        address: wallet.data!.wallet.address, // EVM address (developer-controlled)
      },
      amount: "0.1",
    });

    console.log("RESULT", inspect(result, false, null, true));
    } catch (err) {
    console.log("ERROR", inspect(err, false, null, true));
  }
};

main();