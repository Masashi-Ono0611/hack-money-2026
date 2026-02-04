import { generateEntitySecret } from "@circle-fin/developer-controlled-wallets";

/**
 * メイン関数
 */
const main = async () => { 
  // エンティティシークレットの生成
  generateEntitySecret();
};

main();