import { client } from "./sdk-config";

const {
  WALLET_ID1,
  WALLET_ID2,
} = process.env;

/**
 * メイン関数
 */
const main = async () => {
  // 残高を取得する
  const response = await client.getWalletTokenBalance({
    id: WALLET_ID1!,
  });

  const response2 = await client.getWalletTokenBalance({
    id: WALLET_ID2!,
  });

  console.log("=== WALLET_ID1の残高 ===");
  console.log(JSON.stringify(response.data, null, 2));

  console.log("=== WALLET_ID2の残高 ===");
  console.log(JSON.stringify(response2.data, null, 2));
};

main();