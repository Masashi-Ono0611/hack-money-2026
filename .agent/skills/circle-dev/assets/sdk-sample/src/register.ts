import { registerEntitySecretCiphertext } from "@circle-fin/developer-controlled-wallets";

const { API_KEY, CIRCLE_ENTITY_SECRET } = process.env;

if (!API_KEY || !CIRCLE_ENTITY_SECRET) {
  throw new Error("API_KEYまたはCIRCLE_ENTITY_SECRETが設定されていません。");
}

/**
 * メイン関数
 */
const main = async () => { 
  // エンティティシークレットを登録するメソッド
  const response = await registerEntitySecretCiphertext({
    apiKey: API_KEY,
    entitySecret: CIRCLE_ENTITY_SECRET,
    recoveryFileDownloadPath: "",
  });
  console.log(response.data?.recoveryFile);
};

main();