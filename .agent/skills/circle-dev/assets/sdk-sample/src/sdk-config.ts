import { createCircleWalletsAdapter } from "@circle-fin/adapter-circle-wallets";
import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";
const { API_KEY, CIRCLE_ENTITY_SECRET } = process.env;

if (!API_KEY || !CIRCLE_ENTITY_SECRET) {
  throw new Error("API_KEYまたはCIRCLE_ENTITY_SECRETが設定されていません。");
}

// Cirlce Developer Controlled Walletsクライアントの初期化
export const client = initiateDeveloperControlledWalletsClient({
  apiKey: API_KEY,
  entitySecret: CIRCLE_ENTITY_SECRET,
});

// Set up the Circle Wallets adapter instance, works for both ecosystems
export const adapter = createCircleWalletsAdapter({
  apiKey: API_KEY!,
  entitySecret: CIRCLE_ENTITY_SECRET!,
});