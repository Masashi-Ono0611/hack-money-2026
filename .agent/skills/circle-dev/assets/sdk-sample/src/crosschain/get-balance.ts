import { client } from "../sdk-config";

const {
  CROSSCHAIN_WALLET_ID1,
  CROSSCHAIN_WALLET_ID2,
  CROSSCHAIN_WALLET_ID3,
  CROSSCHAIN_WALLET_ID4,
} = process.env;

/**
 * メイン関数
 */
const main = async () => {
  // 残高を取得する
  const response = await client.getWalletTokenBalance({
    id: CROSSCHAIN_WALLET_ID1!,
  });

  const response2 = await client.getWalletTokenBalance({
    id: CROSSCHAIN_WALLET_ID2!,
  });

  const response3 = await client.getWalletTokenBalance({
    id: CROSSCHAIN_WALLET_ID3!,
  });

  const response4 = await client.getWalletTokenBalance({
    id: CROSSCHAIN_WALLET_ID4!,
  });

  console.log("=== CROSSCHAIN_WALLET_ID1の残高 ===");
  console.log(JSON.stringify(response.data, null, 2));

  console.log("=== CROSSCHAIN_WALLET_ID2の残高 ===");
  console.log(JSON.stringify(response2.data, null, 2));

  console.log("=== CROSSCHAIN_WALLET_ID3の残高 ===");
  console.log(JSON.stringify(response3.data, null, 2));

  console.log("=== CROSSCHAIN_WALLET_ID4の残高 ===");
  console.log(JSON.stringify(response4.data, null, 2));
};

main();