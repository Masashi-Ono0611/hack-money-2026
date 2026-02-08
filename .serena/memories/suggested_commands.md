# 推奨コマンド（最新）

## Root（pnpm）
- `pnpm arbitrage`: オフチェーン裁定の実行（`scripts/arbitrage/index.ts`）
- `pnpm oracle:updater`: 価格/稼働率の更新（`scripts/arbitrage/oracle-updater.ts`）
- `pnpm settle:vault`: Vault へ決済（`scripts/settlement/settle-to-vault.ts`）
- `pnpm settle:auto`: 自動決済（`scripts/settlement/auto-settle.ts`）
- `pnpm vault:balance`: Vault 残高確認（`scripts/settlement/check-vault-balance.ts`）
- `pnpm test:yellow`: Yellow 接続テスト（`scripts/settlement/test-yellow-connection.ts`）
- `pnpm yellow:open-channel`: セッション/チャネル開始（`scripts/settlement/open-channel.ts`）
- `pnpm test:arbitrage`: テスト実行（Vitest）
- `pnpm test:arbitrage:watch`: テスト監視（Vitest）
- `pnpm demo`: デモ実行（`scripts/demo/run-demo.ts`）

## Frontend（`cd frontend` / bun）
- `bun dev`: 開発サーバ起動
- `bun build`: 本番ビルド
- `bun start`: 本番起動
- `bun run lint`: ESLint
- `bun run format`: Biome フォーマット

## Contract（`cd contract`）
- `forge build`: コンパイル
- `forge test`: テスト
- `forge fmt`: フォーマット
